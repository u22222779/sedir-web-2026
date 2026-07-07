require('dotenv').config();

const pool = require('../src/config/database');

const ALLOWED_TABLES = new Set(['noticia', 'proyecto']);

function getSafeTableName(tableName) {
  if (!ALLOWED_TABLES.has(tableName)) {
    throw new Error(`Tabla no permitida para actualización de esquema: ${tableName}`);
  }

  return `"${tableName}"`;
}

async function ensureIdColumn(tableName) {
  const safeTableName = getSafeTableName(tableName);

  const idColumn = await pool.query(
    `
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
        AND column_name = 'id'
    `,
    [tableName]
  );

  if (idColumn.rowCount) {
    return;
  }

  await pool.query(`ALTER TABLE ${safeTableName} ADD COLUMN id BIGSERIAL`);

  await pool.query(
    `
      UPDATE ${safeTableName}
      SET id = nextval(pg_get_serial_sequence($1, 'id'))
      WHERE id IS NULL
    `,
    [tableName]
  );

  await pool.query(`ALTER TABLE ${safeTableName} ALTER COLUMN id SET NOT NULL`);

  const primaryKey = await pool.query(
    `
      SELECT 1
      FROM information_schema.table_constraints
      WHERE table_schema = 'public'
        AND table_name = $1
        AND constraint_type = 'PRIMARY KEY'
    `,
    [tableName]
  );

  if (!primaryKey.rowCount) {
    await pool.query(`ALTER TABLE ${safeTableName} ADD PRIMARY KEY (id)`);
  }
}

async function main() {
  try {
    await ensureIdColumn('noticia');
    await ensureIdColumn('proyecto');
    console.log('Esquema actualizado en Datos.');
  } catch (error) {
    console.error('No fue posible actualizar el esquema:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
