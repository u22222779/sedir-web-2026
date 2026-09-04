const express = require('express');

const {
  obtenerWebinars,
  obtenerWebinarPorId,
  obtenerFiltrosWebinar,
  actualizarUrlYoutubeWebinar,
  crearWebinar,
  actualizarWebinar,
  eliminarWebinar,
} = require('../controllers/webinar.controller');
const { requireAuth, requireAdmin } = require('../middleware/auth.middleware');

const router = express.Router();

// Debe ir antes de '/:id' para que 'filtros' no se interprete como un id
router.get('/filtros', obtenerFiltrosWebinar);
router.get('/', obtenerWebinars);
router.get('/:id', obtenerWebinarPorId);
router.post('/', requireAuth, requireAdmin, crearWebinar);
router.put('/:id', requireAuth, requireAdmin, actualizarWebinar);
router.put('/:id/youtube', requireAuth, requireAdmin, actualizarUrlYoutubeWebinar);
router.delete('/:id', requireAuth, requireAdmin, eliminarWebinar);
module.exports = router;