const express = require('express');

const { login, me } = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { loginRateLimiter } = require('../middleware/security.middleware');

const router = express.Router();

router.post('/login', loginRateLimiter, login);
router.get('/me', requireAuth, me);

module.exports = router;
