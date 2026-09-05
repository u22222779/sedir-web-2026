const express = require('express');

const {
  obtenerProyectos,
  crearProyecto,
  actualizarProyecto,
  eliminarProyecto,
} = require('../controllers/proyecto.controller');
const { requireAdmin, requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/', obtenerProyectos);
router.post('/', requireAuth, requireAdmin, crearProyecto);
router.put('/:id', requireAuth, requireAdmin, actualizarProyecto);
router.delete('/:id', requireAuth, requireAdmin, eliminarProyecto);

module.exports = router;
