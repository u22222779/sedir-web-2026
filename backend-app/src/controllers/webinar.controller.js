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

function esUrlYoutubeValida(url) {
  const normalizada = String(url || '').trim();

  if (!normalizada) {
    return false;
  }

  try {
    const parsed = new URL(normalizada);
    const host = parsed.hostname.replace(/^www\./, '');
    return ['youtube.com', 'youtu.be', 'm.youtube.com'].includes(host);
  } catch {
    return false;
  }
}

async function actualizarUrlYoutubeWebinar(req, res) {
  try {
    const id = parsePositiveInteger(req.params.id);

    if (!id) {
      return res.status(400).json({
        error: 'El id del webinar debe ser un número entero válido',
      });
    }

    const urlYoutube = String(req.body.url_youtube || '').trim();

    if (!esUrlYoutubeValida(urlYoutube)) {
      return res.status(400).json({
        error: 'url_youtube debe ser un enlace válido de YouTube (youtube.com o youtu.be)',
      });
    }

    const result = await pool.query(
      `
        UPDATE webinar
        SET url_youtube = $1
        WHERE id_webinar = $2
        RETURNING
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
      `,
      [urlYoutube, id]
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

function sanitizeText(value) {
  return String(value || '').trim();
}

async function crearWebinar(req, res) {
  try {
    const tema = sanitizeText(req.body.tema);
    const categoria = sanitizeText(req.body.categoria);
    const fecha = req.body.fecha ? sanitizeText(req.body.fecha).slice(0, 10) : null;
    const codigo = sanitizeText(req.body.codigo) || null;
    const subtemas = sanitizeText(req.body.subtemas) || null;
    const expositor = sanitizeText(req.body.expositor) || null;
    const especialidad = sanitizeText(req.body.especialidad) || null;
    const afiche = sanitizeText(req.body.afiche) || null;
    const urlYoutube = sanitizeText(req.body.url_youtube) || null;
    const urlPdf = sanitizeText(req.body.url_pdf) || null;

    if (!tema || !categoria) {
      return res.status(400).json({
        error: 'El tema y la categoría son campos obligatorios',
      });
    }

    if (urlYoutube && !esUrlYoutubeValida(urlYoutube)) {
      return res.status(400).json({
        error: 'url_youtube debe ser un enlace válido de YouTube (youtube.com o youtu.be)',
      });
    }

    const result = await pool.query(
      `
        INSERT INTO webinar (
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
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING
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
      `,
      [
        codigo,
        fecha,
        categoria,
        tema,
        subtemas,
        expositor,
        especialidad,
        afiche,
        urlYoutube,
        urlPdf,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
}

async function actualizarWebinar(req, res) {
  try {
    const id = parsePositiveInteger(req.params.id);

    if (!id) {
      return res.status(400).json({
        error: 'El id del webinar debe ser un número entero válido',
      });
    }

    const tema = sanitizeText(req.body.tema);
    const categoria = sanitizeText(req.body.categoria);
    const fecha = req.body.fecha ? sanitizeText(req.body.fecha).slice(0, 10) : null;
    const codigo = sanitizeText(req.body.codigo) || null;
    const subtemas = sanitizeText(req.body.subtemas) || null;
    const expositor = sanitizeText(req.body.expositor) || null;
    const especialidad = sanitizeText(req.body.especialidad) || null;
    const afiche = sanitizeText(req.body.afiche) || null;
    const urlYoutube = sanitizeText(req.body.url_youtube) || null;
    const urlPdf = sanitizeText(req.body.url_pdf) || null;

    if (!tema || !categoria) {
      return res.status(400).json({
        error: 'El tema y la categoría son campos obligatorios',
      });
    }

    if (urlYoutube && !esUrlYoutubeValida(urlYoutube)) {
      return res.status(400).json({
        error: 'url_youtube debe ser un enlace válido de YouTube (youtube.com o youtu.be)',
      });
    }

    const result = await pool.query(
      `
        UPDATE webinar
        SET
          codigo = $1,
          fecha = $2,
          categoria = $3,
          tema = $4,
          subtemas = $5,
          expositor = $6,
          especialidad = $7,
          afiche = $8,
          url_youtube = $9,
          url_pdf = $10,
          updated_at = CURRENT_TIMESTAMP
        WHERE id_webinar = $11
        RETURNING
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
      `,
      [
        codigo,
        fecha,
        categoria,
        tema,
        subtemas,
        expositor,
        especialidad,
        afiche,
        urlYoutube,
        urlPdf,
        id,
      ]
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

async function eliminarWebinar(req, res) {
  try {
    const id = parsePositiveInteger(req.params.id);

    if (!id) {
      return res.status(400).json({
        error: 'El id del webinar debe ser un número entero válido',
      });
    }

    const result = await pool.query(
      `
        DELETE FROM webinar
        WHERE id_webinar = $1
        RETURNING
          id_webinar AS id,
          tema
      `,
      [id]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        error: 'Webinar no encontrado',
      });
    }

    res.json({
      message: 'Webinar eliminado con éxito',
      webinar: result.rows[0],
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
  actualizarUrlYoutubeWebinar,
  crearWebinar,
  actualizarWebinar,
  eliminarWebinar,
};