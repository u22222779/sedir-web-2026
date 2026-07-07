require('dotenv').config();

const fs = require('fs');
const path = require('path');

const pool = require('../src/config/database');

const DATA_PATH = path.join(__dirname, 'data', 'legacy-publicaciones.json');

async function migrar() {
  const publicaciones = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));

  console.log(`Cargando ${publicaciones.length} publicaciones del sitio actual...`);

  let insertadas = 0;
  let actualizadas = 0;

  for (let i = 0; i < publicaciones.length; i += 1) {
    const pub = publicaciones[i];
    // legacy_id sintético estable: no existía id original (eran páginas estáticas),
    // así que se usa la posición en el archivo JSON (el orden es determinístico).
    const legacyId = i + 1;

    const result = await pool.query(
      `
        INSERT INTO publicacion (
          legacy_id, tipo, titulo, descripcion, imagen_portada, archivo_url, fecha, orden
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (legacy_id) DO UPDATE SET
          tipo = EXCLUDED.tipo,
          titulo = EXCLUDED.titulo,
          descripcion = EXCLUDED.descripcion,
          imagen_portada = EXCLUDED.imagen_portada,
          archivo_url = EXCLUDED.archivo_url,
          fecha = EXCLUDED.fecha,
          orden = EXCLUDED.orden,
          updated_at = CURRENT_TIMESTAMP
        RETURNING (xmax = 0) AS inserted
      `,
      [
        legacyId,
        pub.tipo,
        pub.titulo,
        pub.descripcion,
        pub.imagen_portada,
        pub.archivo_url,
        pub.fecha,
        pub.orden,
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
    await migrar();
  } catch (error) {
    console.error('No fue posible migrar las publicaciones:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
