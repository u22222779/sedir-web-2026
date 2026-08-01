const { Router } = require('express');
const pool = require('../config/database');

const router = Router();

// Liveness check: confirma que el proceso Express está arriba.
// No debe depender de servicios externos (DB, etc.), para que un
// orquestador (Docker/K8s) no reinicie el contenedor por una falla
// transitoria de la base de datos.
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

// Readiness check: confirma que la app puede atender tráfico de verdad,
// incluyendo la conexión a PostgreSQL. Útil para readinessProbe de K8s,
// HEALTHCHECK de Docker, o balanceadores de carga.
router.get('/health/ready', async (req, res) => {
  const checks = { database: 'unknown' };
  let healthy = true;

  try {
    await pool.query('SELECT 1;');
    checks.database = 'ok';
  } catch (error) {
    checks.database = 'error';
    healthy = false;
  }

  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    checks,
  });
});

module.exports = router;