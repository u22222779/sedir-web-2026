function notFoundHandler(req, res) {
  res.status(404).json({
    error: 'Ruta no encontrada',
    path: req.originalUrl,
  });
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  console.error(error);

  res.status(500).json({
    error: 'Error interno del servidor',
  });
}

module.exports = {
  notFoundHandler,
  errorHandler,
};