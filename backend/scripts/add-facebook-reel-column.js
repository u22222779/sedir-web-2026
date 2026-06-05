require('dotenv').config();

const { Pool } = require('pg');

async function main() {
  const pool = new Pool({
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT) || 5432,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
    ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('Conectando a la base de datos...');
    await pool.query(`ALTER TABLE noticia ADD COLUMN IF NOT EXISTS facebook_reel_url TEXT;`);
    console.log('Columna facebook_reel_url creada (o ya existente).');
  } catch (error) {
    console.error('Error al ejecutar migración:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
