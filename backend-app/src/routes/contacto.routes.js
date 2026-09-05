const express = require('express');

const { crearContacto } = require('../controllers/contacto.controller');
const { contactRateLimiter } = require('../middleware/security.middleware');

const router = express.Router();

router.post('/', contactRateLimiter, crearContacto);

module.exports = router;
