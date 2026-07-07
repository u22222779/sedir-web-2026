const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT) || 5432,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function testConnection() {
  const client = await pool.connect();

  try {
    await client.query('SELECT 1;');
    console.log('Conexión exitosa a PostgreSQL');
  } finally {
    client.release();
  }
}

pool.testConnection = testConnection;

module.exports = pool;