const pool = require('../config/database');

const TIPOS_VALIDOS = ['revista', 'manual', 'boletin', 'triptico'];

function parsePositiveInteger(value) {
  const normalized = String(value || '').trim();

  if (!/^[1-9]\d*$/.test(normalized)) {
    return null;
  }

  return Number(normalized);
}

async function obtenerPublicaciones(req, res) {
  try {
    const { tipo } = req.query;

    if (tipo && !TIPOS_VALIDOS.includes(tipo)) {
      return res.status(400).json({
        error: `tipo debe ser uno de: ${TIPOS_VALIDOS.join(', ')}`,
      });
    }

    const values = [];
    let where = '';

    if (tipo) {
      values.push(tipo);
      where = 'WHERE tipo = $1';
    }

    const result = await pool.query(
      `
        SELECT
          id_publicacion AS id,
          tipo,
          titulo,
          descripcion,
          imagen_portada,
          archivo_url,
          fecha,
          orden
        FROM publicacion
        ${where}
        ORDER BY tipo ASC, orden DESC, fecha DESC NULLS LAST
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

async function obtenerPublicacionPorId(req, res) {
  try {
    const id = parsePositiveInteger(req.params.id);

    if (!id) {
      return res.status(400).json({
        error: 'El id de la publicación debe ser un número entero válido',
      });
    }

    const result = await pool.query(
      `
        SELECT
          id_publicacion AS id,
          tipo,
          titulo,
          descripcion,
          imagen_portada,
          archivo_url,
          fecha,
          orden
        FROM publicacion
        WHERE id_publicacion = $1
      `,
      [id]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        error: 'Publicación no encontrada',
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
}

module.exports = {
  obtenerPublicaciones,
  obtenerPublicacionPorId,
};
