require('dotenv').config();

const fs = require('fs');
const path = require('path');

const pool = require('../src/config/database');

const DATA_PATH = path.join(__dirname, 'data', 'legacy-webinars.json');

async function migrar() {
  const webinars = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));

  console.log(`Cargando ${webinars.length} webinars del sitio actual...`);

  let insertadas = 0;
  let actualizadas = 0;

  for (const w of webinars) {
    const result = await pool.query(
      `
        INSERT INTO webinar (
          legacy_id, codigo, fecha, categoria, tema, subtemas,
          expositor, especialidad, afiche, url_youtube, url_pdf
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (legacy_id) DO UPDATE SET
          codigo = EXCLUDED.codigo,
          fecha = EXCLUDED.fecha,
          categoria = EXCLUDED.categoria,
          tema = EXCLUDED.tema,
          subtemas = EXCLUDED.subtemas,
          expositor = EXCLUDED.expositor,
          especialidad = EXCLUDED.especialidad,
          afiche = EXCLUDED.afiche,
          url_youtube = EXCLUDED.url_youtube,
          url_pdf = EXCLUDED.url_pdf,
          updated_at = CURRENT_TIMESTAMP
        RETURNING (xmax = 0) AS inserted
      `,
      [
        w.legacy_id,
        w.codigo,
        w.fecha,
        w.categoria,
        w.tema,
        w.subtemas,
        w.expositor,
        w.especialidad,
        w.afiche,
        w.url_youtube,
        w.url_pdf,
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
    console.error('No fue posible migrar los webinars:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
