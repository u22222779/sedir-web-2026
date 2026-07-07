require('dotenv').config();

const bcrypt = require('bcryptjs');
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
    const email = 'admin@sedir.local';
    const passwordHash = await bcrypt.hash('sedir2025', 10);
    const existing = await pool.query('SELECT id_usuario FROM usuario WHERE email = $1', [email]);

    if (existing.rowCount) {
      await pool.query(
        `
          UPDATE usuario
          SET nombre = $1, password_hash = $2, rol = $3, updated_at = CURRENT_TIMESTAMP
          WHERE email = $4
        `,
        ['admin', passwordHash, 'admin', email]
      );
    } else {
      await pool.query(
        `
          INSERT INTO usuario (nombre, email, password_hash, rol)
          VALUES ($1, $2, $3, $4)
        `,
        ['admin', email, passwordHash, 'admin']
      );
    }

    const user = await pool.query(
      'SELECT id_usuario, nombre, email, rol FROM usuario WHERE email = $1',
      [email]
    );

    console.log('Usuario admin listo:', user.rows[0]);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error('No fue posible crear el usuario admin:', error.message);
  process.exit(1);
});