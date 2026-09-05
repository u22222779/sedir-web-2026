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

async function obtenerProyectos(req, res) {
  try {
    const result = await pool.query(`
      SELECT
        id_proyecto AS id,
        titulo AS nombre,
        descripcion,
        fecha_inicio,
        fecha_fin,
        estado,
        tipo_proyecto AS beneficiarios,
        imagen
      FROM proyecto
      ORDER BY fecha_inicio DESC, id_proyecto DESC
    `);

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function crearProyecto(req, res) {
  try {
    const missingFields = getMissingFields(req.body, [
      'nombre',
      'descripcion',
      'fecha_inicio',
      'fecha_fin',
      'estado',
      'beneficiarios',
      'imagen',
    ]);

    if (missingFields.length) {
      return res.status(400).json({
        error: 'Faltan campos obligatorios',
        missingFields,
      });
    }

    const proyecto = {
      nombre: sanitizeText(req.body.nombre),
      descripcion: sanitizeText(req.body.descripcion),
      fecha_inicio: sanitizeText(req.body.fecha_inicio),
      fecha_fin: sanitizeText(req.body.fecha_fin),
      estado: sanitizeText(req.body.estado),
      beneficiarios: sanitizeText(req.body.beneficiarios),
      imagen: sanitizeText(req.body.imagen),
    };

    const result = await pool.query(
      `
        INSERT INTO proyecto (
          titulo,
          descripcion,
          fecha_inicio,
          fecha_fin,
          estado,
          tipo_proyecto,
          imagen
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING
          id_proyecto AS id,
          titulo AS nombre,
          descripcion,
          fecha_inicio,
          fecha_fin,
          estado,
          tipo_proyecto AS beneficiarios,
          imagen
      `,
      [
        proyecto.nombre,
        proyecto.descripcion,
        proyecto.fecha_inicio,
        proyecto.fecha_fin,
        proyecto.estado,
        proyecto.beneficiarios,
        proyecto.imagen,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function actualizarProyecto(req, res) {
  try {
    const id = parsePositiveInteger(req.params.id);
    const missingFields = getMissingFields(req.body, [
      'nombre',
      'descripcion',
      'fecha_inicio',
      'fecha_fin',
      'estado',
      'beneficiarios',
      'imagen',
    ]);

    if (missingFields.length) {
      return res.status(400).json({
        error: 'Faltan campos obligatorios',
        missingFields,
      });
    }

    if (!id) {
      return res.status(400).json({
        error: 'El id del proyecto debe ser un número entero válido',
      });
    }

    const proyecto = {
      nombre: sanitizeText(req.body.nombre),
      descripcion: sanitizeText(req.body.descripcion),
      fecha_inicio: sanitizeText(req.body.fecha_inicio),
      fecha_fin: sanitizeText(req.body.fecha_fin),
      estado: sanitizeText(req.body.estado),
      beneficiarios: sanitizeText(req.body.beneficiarios),
      imagen: sanitizeText(req.body.imagen),
    };

    const result = await pool.query(
      `
        UPDATE proyecto
        SET
          titulo = $1,
          descripcion = $2,
          fecha_inicio = $3,
          fecha_fin = $4,
          estado = $5,
          tipo_proyecto = $6,
          imagen = $7
        WHERE id_proyecto = $8
        RETURNING
          id_proyecto AS id,
          titulo AS nombre,
          descripcion,
          fecha_inicio,
          fecha_fin,
          estado,
          tipo_proyecto AS beneficiarios,
          imagen
      `,
      [
        proyecto.nombre,
        proyecto.descripcion,
        proyecto.fecha_inicio,
        proyecto.fecha_fin,
        proyecto.estado,
        proyecto.beneficiarios,
        proyecto.imagen,
        id,
      ]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function eliminarProyecto(req, res) {
  try {
    const id = parsePositiveInteger(req.params.id);

    if (!id) {
      return res.status(400).json({
        error: 'El id del proyecto debe ser un número entero válido',
      });
    }

    const result = await pool.query(
      `
        DELETE FROM proyecto
        WHERE id_proyecto = $1
        RETURNING
          id_proyecto AS id,
          titulo AS nombre,
          descripcion,
          fecha_inicio,
          fecha_fin,
          estado,
          tipo_proyecto AS beneficiarios,
          imagen
      `,
      [id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }

    res.json({
      message: 'Proyecto eliminado correctamente',
      proyecto: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  obtenerProyectos,
  crearProyecto,
  actualizarProyecto,
  eliminarProyecto,
};
