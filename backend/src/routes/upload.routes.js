const express = require('express');
const multer = require('multer');

const { subirImagen } = require('../controllers/upload.controller');
const { requireAuth, requireAdmin } = require('../middleware/auth.middleware');
const { upload } = require('../middleware/upload.middleware');

const router = express.Router();

router.post('/', requireAuth, requireAdmin, function (req, res, next) {
  upload.single('imagen')(req, res, function (error) {
    if (error instanceof multer.MulterError) {
      const message = error.code === 'LIMIT_FILE_SIZE'
        ? 'La imagen supera el tamaño máximo permitido (5MB)'
        : error.message;
      return res.status(400).json({ error: message });
    }

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return next();
  });
}, subirImagen);

module.exports = router;
