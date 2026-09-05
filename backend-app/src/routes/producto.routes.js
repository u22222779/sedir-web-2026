const express = require('express');

const {
  obtenerProductos,
  crearProducto,
  actualizarProducto,
  eliminarProducto,
} = require('../controllers/producto.controller');
const { requireAdmin, requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/', obtenerProductos);
router.post('/', requireAuth, requireAdmin, crearProducto);
router.put('/:id', requireAuth, requireAdmin, actualizarProducto);
router.delete('/:id', requireAuth, requireAdmin, eliminarProducto);

module.exports = router;
