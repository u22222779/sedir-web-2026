require('dotenv').config();

const fs = require('fs');
const path = require('path');

const pool = require('../src/config/database');

const DATA_PATH = path.join(__dirname, 'data', 'legacy-noticias.json');

async function ensureSchema() {
  // Permite volver a correr el script sin duplicar noticias.
  await pool.query(`
    ALTER TABLE noticia
    ADD COLUMN IF NOT EXISTS legacy_id INT UNIQUE
  `);

  // Algunos títulos originales superan los 150 caracteres del esquema actual.
  await pool.query(`
    ALTER TABLE noticia
    ALTER COLUMN titulo TYPE VARCHAR(255)
  `);
}

async function getCategoriaIdPorNombre(nombre) {
  const result = await pool.query(
    'SELECT id_categoria_noticia FROM categoria_noticia WHERE nombre_categoria = $1',
    [nombre]
  );

  if (result.rowCount) {
    return result.rows[0].id_categoria_noticia;
  }

  // Si la categoría no existe (poco probable), se crea al vuelo.
  const inserted = await pool.query(
    'INSERT INTO categoria_noticia (nombre_categoria) VALUES ($1) RETURNING id_categoria_noticia',
    [nombre]
  );

  return inserted.rows[0].id_categoria_noticia;
}

async function migrar() {
  const noticias = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));

  console.log(`Cargando ${noticias.length} noticias del sitio actual...`);

  const categoriaCache = new Map();
  let insertadas = 0;
  let actualizadas = 0;

  for (const noticia of noticias) {
    if (!categoriaCache.has(noticia.categoria_nombre)) {
      categoriaCache.set(
        noticia.categoria_nombre,
        await getCategoriaIdPorNombre(noticia.categoria_nombre)
      );
    }

    const idCategoria = categoriaCache.get(noticia.categoria_nombre);

    const result = await pool.query(
      `
        INSERT INTO noticia (
          legacy_id,
          titulo,
          subtitulo,
          fecha,
          contenido,
          imagen_portada,
          id_categoria_noticia
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (legacy_id) DO UPDATE SET
          titulo = EXCLUDED.titulo,
          subtitulo = EXCLUDED.subtitulo,
          fecha = EXCLUDED.fecha,
          contenido = EXCLUDED.contenido,
          imagen_portada = EXCLUDED.imagen_portada,
          id_categoria_noticia = EXCLUDED.id_categoria_noticia,
          updated_at = CURRENT_TIMESTAMP
        RETURNING (xmax = 0) AS inserted
      `,
      [
        noticia.legacy_id,
        noticia.titulo,
        noticia.subtitulo,
        noticia.fecha,
        noticia.contenido,
        noticia.imagen_portada,
        idCategoria,
      ]
    );

    if (result.rows[0].inserted) {
      insertadas += 1;
    } else {
      actualizadas += 1;
    }
  }

  console.log(`Listo. Insertadas: ${insertadas} | Actualizadas: ${actualizadas}`);
}

async function main() {
  try {
    await ensureSchema();
    await migrar();
  } catch (error) {
    console.error('No fue posible migrar las noticias:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
