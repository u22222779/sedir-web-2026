/**
 * rehospedar-imagenes-legacy.js
 * ---------------------------------------------------------------
 * Descarga TODAS las imágenes que hoy dependen del sitio viejo
 * (sedir.org.pe) referenciadas en los JSON de migración, las guarda
 * localmente dentro de public/activos/img_legacy/, y reescribe esos
 * mismos JSON para que apunten a las rutas locales nuevas.
 *
 * Cubre:
 *   - legacy-noticias.json      -> imagen_portada + <img> dentro de "contenido"
 *   - legacy-webinars.json      -> afiche
 *   - legacy-publicaciones.json -> imagen_portada (el único caso que lo necesita)
 *
 * IMPORTANTE: este script necesita acceso real a internet a
 * sedir.org.pe. Córrelo en tu máquina (no en un sandbox restringido).
 *
 * Uso:
 *   cd backend-app
 *   node scripts/rehospedar-imagenes-legacy.js
 *
 * Después de correrlo:
 *   node scripts/migrar-noticias-legacy.js
 *   node scripts/migrar-webinars-legacy.js
 *   node scripts/migrar-publicaciones-legacy.js
 * (para que la base de datos ya migrada se actualice con las rutas
 * nuevas, gracias a que esos scripts hacen ON CONFLICT DO UPDATE).
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, 'data');
const PUBLIC_DIR = path.join(__dirname, '..', '..', 'public');
const DEST_DIR = path.join(PUBLIC_DIR, 'activos', 'img_legacy');
const DEST_URL_PREFIX = '/activos/img_legacy';

const ARCHIVOS = {
  noticias: path.join(DATA_DIR, 'legacy-noticias.json'),
  webinars: path.join(DATA_DIR, 'legacy-webinars.json'),
  publicaciones: path.join(DATA_DIR, 'legacy-publicaciones.json'),
};

const REGEX_URL_VIEJA = /https?:\/\/(www\.)?sedir\.org\.pe\/[^\s"'<>)]+/gi;

// Cache: misma URL vieja -> misma ruta local (evita descargar la
// misma imagen 5 veces si se repite en varias noticias).
const cache = new Map();
const fallidas = [];
let descargadas = 0;
let reutilizadas = 0;

function extensionDesdeUrl(url) {
  const limpio = url.split('?')[0].split('#')[0];
  const ext = path.extname(limpio);
  return ext && ext.length <= 5 ? ext : '.jpg';
}

function nombreLocalPara(url) {
  const hash = crypto.createHash('md5').update(url).digest('hex').slice(0, 10);
  const base = path
    .basename(url.split('?')[0])
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .slice(0, 60);
  const ext = extensionDesdeUrl(url);
  const baseSinExt = base.replace(new RegExp(ext + '$', 'i'), '') || 'img';
  return `${baseSinExt}-${hash}${ext}`;
}

async function descargarSiHaceFalta(urlVieja) {
  if (cache.has(urlVieja)) {
    reutilizadas++;
    return cache.get(urlVieja);
  }

  const nombreArchivo = nombreLocalPara(urlVieja);
  const destinoAbsoluto = path.join(DEST_DIR, nombreArchivo);
  const urlNueva = `${DEST_URL_PREFIX}/${nombreArchivo}`;

  // Si ya se descargó en una corrida anterior, no la vuelve a pedir.
  if (fs.existsSync(destinoAbsoluto)) {
    cache.set(urlVieja, urlNueva);
    return urlNueva;
  }

  try {
    const respuesta = await fetch(urlVieja, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SEDIR-migracion/1.0)' },
    });

    if (!respuesta.ok) {
      throw new Error(`HTTP ${respuesta.status}`);
    }

    const buffer = Buffer.from(await respuesta.arrayBuffer());
    fs.mkdirSync(DEST_DIR, { recursive: true });
    fs.writeFileSync(destinoAbsoluto, buffer);

    descargadas++;
    cache.set(urlVieja, urlNueva);
    console.log(`  ✓ ${urlVieja} -> ${urlNueva} (${(buffer.length / 1024).toFixed(0)} KB)`);
    return urlNueva;
  } catch (error) {
    console.warn(`  ✗ No se pudo descargar: ${urlVieja} (${error.message})`);
    fallidas.push({ url: urlVieja, motivo: error.message });
    return urlVieja; // deja la URL vieja tal cual si falla, para no perder el dato
  }
}

async function reemplazarUrlsEnTexto(texto) {
  if (!texto) return texto;

  const urls = texto.match(REGEX_URL_VIEJA);
  if (!urls) return texto;

  let resultado = texto;
  for (const urlVieja of [...new Set(urls)]) {
    const urlNueva = await descargarSiHaceFalta(urlVieja);
    resultado = resultado.split(urlVieja).join(urlNueva);
  }
  return resultado;
}

async function procesarNoticias() {
  console.log('\n=== Noticias ===');
  const noticias = JSON.parse(fs.readFileSync(ARCHIVOS.noticias, 'utf-8'));

  for (const noticia of noticias) {
    noticia.imagen_portada = await reemplazarUrlsEnTexto(noticia.imagen_portada);
    noticia.contenido = await reemplazarUrlsEnTexto(noticia.contenido);
  }

  fs.writeFileSync(ARCHIVOS.noticias, JSON.stringify(noticias, null, 2), 'utf-8');
  console.log(`Guardado: ${ARCHIVOS.noticias}`);
}

async function procesarWebinars() {
  console.log('\n=== Webinars ===');
  const webinars = JSON.parse(fs.readFileSync(ARCHIVOS.webinars, 'utf-8'));

  for (const webinar of webinars) {
    webinar.afiche = await reemplazarUrlsEnTexto(webinar.afiche);
  }

  fs.writeFileSync(ARCHIVOS.webinars, JSON.stringify(webinars, null, 2), 'utf-8');
  console.log(`Guardado: ${ARCHIVOS.webinars}`);
}

async function procesarPublicaciones() {
  console.log('\n=== Publicaciones ===');
  const publicaciones = JSON.parse(fs.readFileSync(ARCHIVOS.publicaciones, 'utf-8'));

  for (const pub of publicaciones) {
    pub.imagen_portada = await reemplazarUrlsEnTexto(pub.imagen_portada);
    pub.archivo_url = await reemplazarUrlsEnTexto(pub.archivo_url);
  }

  fs.writeFileSync(ARCHIVOS.publicaciones, JSON.stringify(publicaciones, null, 2), 'utf-8');
  console.log(`Guardado: ${ARCHIVOS.publicaciones}`);
}

async function main() {
  console.log('Descargando y re-hospedando imágenes del sitio viejo (sedir.org.pe)...');
  fs.mkdirSync(DEST_DIR, { recursive: true });

  await procesarNoticias();
  await procesarWebinars();
  await procesarPublicaciones();

  console.log('\n=== Resumen ===');
  console.log(`Imágenes descargadas nuevas: ${descargadas}`);
  console.log(`Reutilizadas de caché (ya bajadas antes): ${reutilizadas}`);
  console.log(`Fallidas: ${fallidas.length}`);

  if (fallidas.length) {
    console.log('\nNo se pudieron descargar (quedaron con la URL vieja, revísalas a mano):');
    fallidas.forEach((f) => console.log(`  - ${f.url} (${f.motivo})`));
  }

  console.log(
    '\nListo. Ahora corre (en este orden):\n' +
      '  node scripts/migrar-noticias-legacy.js\n' +
      '  node scripts/migrar-webinars-legacy.js\n' +
      '  node scripts/migrar-publicaciones-legacy.js\n' +
      'para que la base de datos ya migrada se actualice con las rutas nuevas.'
  );
}

main().catch((error) => {
  console.error('Error general:', error);
  process.exit(1);
});