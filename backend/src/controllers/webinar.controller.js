const pool = require('../config/database');

function parsePositiveInteger(value) {
  const normalized = String(value || '').trim();

  if (!/^[1-9]\d*$/.test(normalized)) {
    return null;
  }

  return Number(normalized);
}

async function obtenerWebinars(req, res) {
  try {
    const { anio, categoria } = req.query;

    const values = [];
    const condiciones = [];

    if (anio && anio !== 'Todos') {
      if (!/^\d{4}$/.test(String(anio))) {
        return res.status(400).json({
          error: 'anio debe tener el formato AAAA',
        });
      }
      values.push(String(anio));
      condiciones.push(`EXTRACT(YEAR FROM fecha)::text = $${values.length}`);
    }

    if (categoria && categoria !== 'Todos') {
      values.push(categoria);
      condiciones.push(`categoria = $${values.length}`);
    }

    const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

    const result = await pool.query(
      `
        SELECT
          id_webinar AS id,
          codigo,
          fecha,
          categoria,
          tema,
          subtemas,
          expositor,
          especialidad,
          afiche,
          url_youtube,
          url_pdf
        FROM webinar
        ${where}
        ORDER BY fecha DESC
      `,
      values
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
}

async function obtenerWebinarPorId(req, res) {
  try {
    const id = parsePositiveInteger(req.params.id);

    if (!id) {
      return res.status(400).json({
        error: 'El id del webinar debe ser un número entero válido',
      });
    }

    const result = await pool.query(
      `
        SELECT
          id_webinar AS id,
          codigo,
          fecha,
          categoria,
          tema,
          subtemas,
          expositor,
          especialidad,
          afiche,
          url_youtube,
          url_pdf
        FROM webinar
        WHERE id_webinar = $1
      `,
      [id]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        error: 'Webinar no encontrado',
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
}

async function obtenerFiltrosWebinar(req, res) {
  try {
    const [aniosResult, categoriasResult] = await Promise.all([
      pool.query(`
        SELECT DISTINCT EXTRACT(YEAR FROM fecha)::int AS anio
        FROM webinar
        WHERE fecha IS NOT NULL
        ORDER BY anio DESC
      `),
      pool.query(`
        SELECT categoria, COUNT(*) AS total
        FROM webinar
        GROUP BY categoria
        ORDER BY categoria ASC
      `),
    ]);

    res.json({
      anios: aniosResult.rows.map((row) => row.anio),
      categorias: categoriasResult.rows.map((row) => ({
        categoria: row.categoria,
        total: Number(row.total),
      })),
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
}

module.exports = {
  obtenerWebinars,
  obtenerWebinarPorId,
  obtenerFiltrosWebinar,
};
