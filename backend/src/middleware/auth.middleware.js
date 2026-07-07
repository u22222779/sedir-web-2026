const jwt = require('jsonwebtoken');

function getTokenFromRequest(req) {
  const authorization = req.headers.authorization || '';

  if (!authorization.startsWith('Bearer ')) {
    return null;
  }

  return authorization.slice('Bearer '.length).trim();
}

function requireAuth(req, res, next) {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    return res.status(500).json({
      error: 'JWT_SECRET no configurado en el servidor',
    });
  }

  const token = getTokenFromRequest(req);

  if (!token) {
    return res.status(401).json({
      error: 'No autenticado',
    });
  }

  try {
    const payload = jwt.verify(token, secret);
    req.auth = payload;
    return next();
  } catch (error) {
    return res.status(401).json({
      error: 'Token inválido o expirado',
    });
  }
}

function requireRole(...allowedRoles) {
  return function roleGuard(req, res, next) {
    const userRole = req.auth?.rol;

    if (!userRole || !allowedRoles.includes(userRole)) {
      return res.status(403).json({
        error: 'No autorizado para realizar esta acción',
      });
    }

    return next();
  };
}

module.exports = {
  requireAuth,
  requireAdmin: requireRole('admin'),
  requireRole,
};
