const pool = require('../config/database');

function getMissingFields(payload, requiredFields) {
  return requiredFields.filter((field) => {
    const value = payload[field];
    return value === undefined || value === null || String(value).trim() === '';
  });
}

function parsePositiveInteger(value) {
  const normalized = String(value || '').trim();

  if (!/^[1-9]\d*$/.test(normalized)) {
    return null;
  }

  const parsed = Number(normalized);

  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function sanitizeText(value) {
  return String(value || '')
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*(['"]).*?\1/gi, '')
    .replace(/javascript:/gi, '');
}

async function obtenerNoticias(req, res) {
  try {
    const result = await pool.query(`
      SELECT
        id_noticia AS id,
        titulo,
        fecha,
        contenido,
        facebook_reel_url,
        imagen_portada,
        id_categoria_noticia,
        created_at,
        updated_at
      FROM noticia
      ORDER BY fecha DESC, id_noticia DESC
    `);

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
}

async function crearNoticia(req, res) {
  try {
    const categoriaId = Number(req.body.id_categoria_noticia);
    const missingFields = getMissingFields(req.body, [
      'titulo',
      'fecha',
      'contenido',
      'imagen_portada',
      'id_categoria_noticia',
    ]);

    if (missingFields.length) {
      return res.status(400).json({
        error: 'Faltan campos obligatorios',
        missingFields,
      });
    }

    if (!Number.isInteger(categoriaId)) {
      return res.status(400).json({
        error: 'La categoría debe ser un número entero válido',
      });
    }

    const noticia = {
      titulo: sanitizeText(req.body.titulo),
      fecha: sanitizeText(req.body.fecha),
      contenido: sanitizeText(req.body.contenido),
      imagen_portada: sanitizeText(req.body.imagen_portada),
      facebook_reel_url: sanitizeText(req.body.facebook_reel_url || ''),
    };

    const result = await pool.query(
      `
        INSERT INTO noticia (
          titulo,
          fecha,
          contenido,
          imagen_portada,
          facebook_reel_url,
          id_categoria_noticia
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING
          id_noticia AS id,
          titulo,
          fecha,
          contenido,
          facebook_reel_url,
          imagen_portada,
          id_categoria_noticia,
          created_at,
          updated_at
      `,
      [
        noticia.titulo,
        noticia.fecha,
        noticia.contenido,
        noticia.imagen_portada,
        noticia.facebook_reel_url,
        categoriaId,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
}

async function actualizarNoticia(req, res) {
  try {
    const id = parsePositiveInteger(req.params.id);
    const categoriaId = Number(req.body.id_categoria_noticia);
    const missingFields = getMissingFields(req.body, [
      'titulo',
      'fecha',
      'contenido',
      'imagen_portada',
      'id_categoria_noticia',
    ]);

    if (missingFields.length) {
      return res.status(400).json({
        error: 'Faltan campos obligatorios',
        missingFields,
      });
    }

    if (!id) {
      return res.status(400).json({
        error: 'El id de la noticia debe ser un número entero válido',
      });
    }

    if (!Number.isInteger(categoriaId)) {
      return res.status(400).json({
        error: 'La categoría debe ser un número entero válido',
      });
    }

    const noticia = {
      titulo: sanitizeText(req.body.titulo),
      fecha: sanitizeText(req.body.fecha),
      contenido: sanitizeText(req.body.contenido),
      imagen_portada: sanitizeText(req.body.imagen_portada),
      facebook_reel_url: sanitizeText(req.body.facebook_reel_url || ''),
    };

    const result = await pool.query(
      `
        UPDATE noticia
        SET
          titulo = $1,
          fecha = $2,
          contenido = $3,
          imagen_portada = $4,
          facebook_reel_url = $5,
          id_categoria_noticia = $6
        WHERE id_noticia = $7
        RETURNING
          id_noticia AS id,
          titulo,
          fecha,
          contenido,
          facebook_reel_url,
          imagen_portada,
          id_categoria_noticia,
          created_at,
          updated_at
      `,
      [
        noticia.titulo,
        noticia.fecha,
        noticia.contenido,
        noticia.imagen_portada,
        noticia.facebook_reel_url,
        categoriaId,
        id,
      ]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        error: 'Noticia no encontrada',
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
}

async function eliminarNoticia(req, res) {
  try {
    const id = parsePositiveInteger(req.params.id);

    if (!id) {
      return res.status(400).json({
        error: 'El id de la noticia debe ser un número entero válido',
      });
    }

    const result = await pool.query(
      `
        DELETE FROM noticia
        WHERE id_noticia = $1
        RETURNING
          id_noticia AS id,
          titulo,
          fecha,
          contenido,
          facebook_reel_url,
          imagen_portada,
          id_categoria_noticia,
          created_at,
          updated_at
      `,
      [id]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        error: 'Noticia no encontrada',
      });
    }

    res.json({
      message: 'Noticia eliminada correctamente',
      noticia: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
}

module.exports = {
  obtenerNoticias,
  crearNoticia,
  actualizarNoticia,
  eliminarNoticia,
};
