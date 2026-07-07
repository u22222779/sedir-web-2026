const express = require('express');

const {
  obtenerPublicaciones,
  obtenerPublicacionPorId,
} = require('../controllers/publicacion.controller');

const router = express.Router();

router.get('/', obtenerPublicaciones);
router.get('/:id', obtenerPublicacionPorId);

module.exports = router;
