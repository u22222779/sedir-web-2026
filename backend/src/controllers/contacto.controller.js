const pool = require('../config/database');

function sanitizeText(value) {
  return String(value || '')
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*(['"]).*?\1/gi, '')
    .replace(/javascript:/gi, '');
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getMissingFields(payload, requiredFields) {
  return requiredFields.filter((field) => {
    const value = payload[field];
    return value === undefined || value === null || String(value).trim() === '';
  });
}

async function crearContacto(req, res) {
  try {
    const missingFields = getMissingFields(req.body, ['nombre', 'correo', 'mensaje']);

    if (missingFields.length) {
      return res.status(400).json({
        error: 'Faltan campos obligatorios',
        missingFields,
      });
    }

    const contacto = {
      nombre: sanitizeText(req.body.nombre).slice(0, 100),
      correo: sanitizeText(req.body.correo).toLowerCase().slice(0, 150),
      telefono: sanitizeText(req.body.telefono).slice(0, 20) || null,
      asunto: sanitizeText(req.body.asunto).slice(0, 150) || null,
      mensaje: sanitizeText(req.body.mensaje),
    };

    if (!isValidEmail(contacto.correo)) {
      return res.status(400).json({
        error: 'El correo electrónico no tiene un formato válido',
      });
    }

    if (contacto.mensaje.length < 10) {
      return res.status(400).json({
        error: 'El mensaje debe tener al menos 10 caracteres',
      });
    }

    const result = await pool.query(
      `
        INSERT INTO contacto (
          nombre,
          correo,
          telefono,
          asunto,
          mensaje
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING
          id_contacto AS id,
          nombre,
          correo,
          telefono,
          asunto,
          mensaje,
          fecha_envio,
          estado
      `,
      [
        contacto.nombre,
        contacto.correo,
        contacto.telefono,
        contacto.asunto,
        contacto.mensaje,
      ]
    );

    return res.status(201).json({
      message: 'Mensaje registrado correctamente',
      contacto: result.rows[0],
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message,
    });
  }
}

module.exports = {
  crearContacto,
};
