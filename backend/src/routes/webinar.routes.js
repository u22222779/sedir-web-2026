const express = require('express');

const {
  obtenerWebinars,
  obtenerWebinarPorId,
  obtenerFiltrosWebinar,
  actualizarUrlYoutubeWebinar,
} = require('../controllers/webinar.controller');
const { requireAuth, requireAdmin } = require('../middleware/auth.middleware');

const router = express.Router();

// Debe ir antes de '/:id' para que 'filtros' no se interprete como un id
router.get('/filtros', obtenerFiltrosWebinar);
router.get('/', obtenerWebinars);
router.get('/:id', obtenerWebinarPorId);
router.put('/:id/youtube', requireAuth, requireAdmin, actualizarUrlYoutubeWebinar);
module.exports = router;