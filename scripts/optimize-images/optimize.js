/**
 * Optimiza en el lugar todas las imágenes de public/activos.
 *
 * - NO cambia nombres de archivo ni extensiones (así ningún <img src="...">
 *   del sitio, ni ninguna URL guardada en la base de datos, se rompe).
 * - Reduce el ancho máximo de las imágenes que son más grandes de lo que
 *   cualquier layout del sitio necesita.
 * - Recomprime JPG/PNG con buena calidad visual pero mucho menos peso.
 * - Escribe primero a un archivo temporal y recién después reemplaza el
 *   original (evita dejar un archivo corrupto si algo se interrumpe).
 * - Imprime un resumen de antes/después al final.
 *
 * Uso:
 *   cd scripts/optimize-images
 *   npm install
 *   node optimize.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const TARGET_DIR = path.join(__dirname, '..', '..', 'public', 'activos');
const DRY_RUN = process.argv.includes('--dry-run');

// Ancho máximo razonable para cualquier imagen del sitio (heroes incluidos).
// Nada en el layout actual necesita más resolución que esto.
const MAX_WIDTH = 1920;

const JPEG_QUALITY = 78;
const PNG_QUALITY = 78;

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png']);

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, files);
    } else if (IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      files.push(fullPath);
    }
  }
  return files;
}

async function optimizeOne(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const originalSize = fs.statSync(filePath).size;
  const tmpPath = `${filePath}.tmp-optimizing`;

  const image = sharp(filePath, { failOn: 'none' });
  const metadata = await image.metadata();

  let pipeline = image.rotate(); // aplica orientación EXIF y la limpia

  if (metadata.width && metadata.width > MAX_WIDTH) {
    pipeline = pipeline.resize({ width: MAX_WIDTH, withoutEnlargement: true });
  }

  if (ext === '.jpg' || ext === '.jpeg') {
    pipeline = pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true });
  } else if (ext === '.png') {
    pipeline = pipeline.png({ quality: PNG_QUALITY, compressionLevel: 9, palette: true });
  }

  if (DRY_RUN) {
    const buffer = await pipeline.toBuffer();
    return { filePath, originalSize, newSize: buffer.length, skipped: false };
  }

  await pipeline.toFile(tmpPath);
  const newSize = fs.statSync(tmpPath).size;

  // Si por algún motivo la versión "optimizada" quedó más pesada que la
  // original (puede pasar con imágenes ya muy comprimidas), se conserva
  // el original y se descarta el resultado.
  if (newSize >= originalSize) {
    fs.unlinkSync(tmpPath);
    return { filePath, originalSize, newSize: originalSize, skipped: true };
  }

  fs.renameSync(tmpPath, filePath);
  return { filePath, originalSize, newSize, skipped: false };
}

async function main() {
  if (!fs.existsSync(TARGET_DIR)) {
    console.error(`No existe la carpeta: ${TARGET_DIR}`);
    process.exit(1);
  }

  const files = walk(TARGET_DIR);
  console.log(`Encontradas ${files.length} imágenes (jpg/jpeg/png) en ${TARGET_DIR}`);
  if (DRY_RUN) console.log('Modo --dry-run: no se va a escribir ningún archivo.\n');

  let totalOriginal = 0;
  let totalNew = 0;
  let processed = 0;
  let skipped = 0;
  let failed = 0;

  const startedAt = Date.now();

  for (const filePath of files) {
    try {
      const result = await optimizeOne(filePath);
      totalOriginal += result.originalSize;
      totalNew += result.newSize;
      processed += 1;
      if (result.skipped) skipped += 1;

      if (processed % 100 === 0) {
        console.log(`  ...${processed}/${files.length} procesadas`);
      }
    } catch (error) {
      failed += 1;
      console.error(`  ✗ Error en ${path.relative(TARGET_DIR, filePath)}: ${error.message}`);
    }
  }

  const elapsedSec = ((Date.now() - startedAt) / 1000).toFixed(1);
  const savedBytes = totalOriginal - totalNew;
  const savedPct = totalOriginal ? ((savedBytes / totalOriginal) * 100).toFixed(1) : '0.0';

  console.log('\n========== RESUMEN ==========');
  console.log(`Imágenes procesadas: ${processed} (de ${files.length})`);
  console.log(`Sin cambios (ya optimizadas): ${skipped}`);
  console.log(`Con error: ${failed}`);
  console.log(`Peso antes:   ${formatBytes(totalOriginal)}`);
  console.log(`Peso después: ${formatBytes(totalNew)}`);
  console.log(`Ahorro: ${formatBytes(savedBytes)} (${savedPct}%)`);
  console.log(`Tiempo: ${elapsedSec}s`);
  console.log('==============================\n');
}

main();
