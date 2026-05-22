const { Router } = require('express');

const router = Router();

router.get('/health', async (req, res, next) => {
  try {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;