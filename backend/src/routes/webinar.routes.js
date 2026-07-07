const express = require('express');

const {
  obtenerWebinars,
  obtenerWebinarPorId,
  obtenerFiltrosWebinar,
} = require('../controllers/webinar.controller');

const router = express.Router();

// Debe ir antes de '/:id' para que 'filtros' no se interprete como un id
router.get('/filtros', obtenerFiltrosWebinar);
router.get('/', obtenerWebinars);
router.get('/:id', obtenerWebinarPorId);

module.exports = router;
