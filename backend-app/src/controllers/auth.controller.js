const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const pool = require('../config/database');
const { resetRateLimit } = require('../middleware/security.middleware');

const TOKEN_EXPIRES_IN = '8h';

function buildAuthUser(row) {
  return {
    id: row.id_usuario,
    nombre: row.nombre,
    email: row.email,
    rol: row.rol,
  };
}

async function login(req, res) {
  try {
    const identifier = String(req.body.identifier || '').trim();
    const password = String(req.body.password || '');

    if (!identifier || !password) {
      return res.status(400).json({
        error: 'Usuario/email y contraseña son obligatorios',
      });
    }

    const result = await pool.query(
      `
        SELECT id_usuario, nombre, email, password_hash, rol
        FROM usuario
        WHERE email = $1 OR nombre = $1
        LIMIT 1
      `,
      [identifier]
    );

    if (!result.rowCount) {
      return res.status(401).json({
        error: 'Credenciales inválidas',
      });
    }

    const user = result.rows[0];
    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      return res.status(401).json({
        error: 'Credenciales inválidas',
      });
    }

    const secret = process.env.JWT_SECRET;

    if (!secret) {
      return res.status(500).json({
        error: 'JWT_SECRET no configurado en el servidor',
      });
    }

    const authUser = buildAuthUser(user);
    const token = jwt.sign(
      {
        sub: authUser.id,
        rol: authUser.rol,
        email: authUser.email,
        nombre: authUser.nombre,
      },
      secret,
      { expiresIn: TOKEN_EXPIRES_IN }
    );

    resetRateLimit('login', req);

    return res.json({
      token,
      user: authUser,
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message,
    });
  }
}

async function me(req, res) {
  try {
    const userId = Number(req.auth?.sub);

    if (!userId) {
      return res.status(401).json({
        error: 'No autenticado',
      });
    }

    const result = await pool.query(
      `
        SELECT id_usuario, nombre, email, rol
        FROM usuario
        WHERE id_usuario = $1
      `,
      [userId]
    );

    if (!result.rowCount) {
      return res.status(401).json({
        error: 'Usuario no encontrado',
      });
    }

    return res.json({
      user: buildAuthUser(result.rows[0]),
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message,
    });
  }
}

async function changePassword(req, res) {
  try {
    const userId = Number(req.auth?.sub);
    const currentPassword = String(req.body.currentPassword || '');
    const newPassword = String(req.body.newPassword || '');
    const confirmPassword = String(req.body.confirmPassword || '');

    if (!userId || !currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        error: 'Todos los campos de contraseña son obligatorios',
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        error: 'La nueva contraseña debe tener al menos 8 caracteres',
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        error: 'La confirmación no coincide con la nueva contraseña',
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        error: 'La nueva contraseña debe ser diferente a la actual',
      });
    }

    const result = await pool.query(
      `
        SELECT id_usuario, nombre, email, password_hash, rol
        FROM usuario
        WHERE id_usuario = $1
        LIMIT 1
      `,
      [userId]
    );

    if (!result.rowCount) {
      return res.status(404).json({
        error: 'Usuario no encontrado',
      });
    }

    const user = result.rows[0];
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);

    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        error: 'La contraseña actual es incorrecta',
      });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await pool.query(
      `
        UPDATE usuario
        SET password_hash = $1
        WHERE id_usuario = $2
      `,
      [passwordHash, userId]
    );

    const secret = process.env.JWT_SECRET;
    const authUser = buildAuthUser(user);
    const token = jwt.sign(
      {
        sub: authUser.id,
        rol: authUser.rol,
        email: authUser.email,
        nombre: authUser.nombre,
      },
      secret,
      { expiresIn: TOKEN_EXPIRES_IN }
    );

    return res.json({
      message: 'Contraseña actualizada correctamente',
      token,
      user: authUser,
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message,
    });
  }
}

module.exports = {
  login,
  me,
  changePassword,
};