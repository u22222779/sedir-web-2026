const { Pool } = require('pg');

async function run() {
  // First, connect to the default 'postgres' database to check if 'Datos' database exists
  const sysPool = new Pool({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'admin',
    database: 'postgres',
  });

  try {
    console.log('Checking if database "Datos" exists...');
    const dbCheck = await sysPool.query("SELECT 1 FROM pg_database WHERE datname = 'Datos'");
    if (dbCheck.rowCount === 0) {
      console.log('Database "Datos" does not exist. Creating database...');
      await sysPool.query('CREATE DATABASE "Datos"');
      console.log('Database "Datos" created successfully!');
    } else {
      console.log('Database "Datos" already exists.');
    }
  } catch (err) {
    console.error('Error checking/creating database "Datos":', err.message);
  } finally {
    await sysPool.end();
  }

  // Now, connect to the 'Datos' database to create tables and seed data
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'admin',
    database: 'Datos',
  });

  try {
    console.log('Creating tables...');

    // 1. Usuario
    await pool.query(`
      CREATE TABLE IF NOT EXISTS usuario (
        id_usuario SERIAL PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        email VARCHAR(150) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        rol VARCHAR(50) NOT NULL DEFAULT 'admin',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Categoria noticia
    await pool.query(`
      CREATE TABLE IF NOT EXISTS categoria_noticia (
        id_categoria_noticia SERIAL PRIMARY KEY,
        nombre_categoria VARCHAR(100) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 3. Noticia
    await pool.query(`
      CREATE TABLE IF NOT EXISTS noticia (
        id_noticia SERIAL PRIMARY KEY,
        titulo VARCHAR(150) NOT NULL,
        subtitulo TEXT,
        fecha DATE NOT NULL,
        contenido TEXT NOT NULL,
        imagen_portada VARCHAR(255),
        id_categoria_noticia INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_noticia_categoria
          FOREIGN KEY (id_categoria_noticia)
          REFERENCES categoria_noticia(id_categoria_noticia)
          ON DELETE CASCADE
      )
    `);

    // 4. Categoria producto
    await pool.query(`
      CREATE TABLE IF NOT EXISTS categoria_producto (
        id_categoria_producto SERIAL PRIMARY KEY,
        nombre_linea VARCHAR(100) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 5. Producto
    await pool.query(`
      CREATE TABLE IF NOT EXISTS producto (
        id_producto SERIAL PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        descripcion TEXT,
        imagen_url VARCHAR(255),
        id_categoria_producto INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_producto_categoria
          FOREIGN KEY (id_categoria_producto)
          REFERENCES categoria_producto(id_categoria_producto)
          ON DELETE CASCADE
      )
    `);

    // 6. Etiqueta producto
    await pool.query(`
      CREATE TABLE IF NOT EXISTS etiqueta_producto (
        id_etiqueta SERIAL PRIMARY KEY,
        nombre_etiqueta VARCHAR(50) NOT NULL,
        id_producto INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_etiqueta_producto
          FOREIGN KEY (id_producto)
          REFERENCES producto(id_producto)
          ON DELETE CASCADE
      )
    `);

    // 7. Proyecto
    await pool.query(`
      CREATE TABLE IF NOT EXISTS proyecto (
        id_proyecto SERIAL PRIMARY KEY,
        titulo VARCHAR(150) NOT NULL,
        descripcion TEXT NOT NULL,
        imagen VARCHAR(255),
        fecha_inicio DATE,
        fecha_fin DATE,
        estado VARCHAR(50),
        tipo_proyecto VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 8. Registro meteorológico
    await pool.query(`
      CREATE TABLE IF NOT EXISTS registro_meteorologico (
        id_registro SERIAL PRIMARY KEY,
        fecha DATE NOT NULL,
        temperatura_max NUMERIC(5,2),
        temperatura_min NUMERIC(5,2),
        humedad INT CHECK (humedad BETWEEN 0 AND 100),
        viento NUMERIC(5,2),
        precipitacion NUMERIC(5,2),
        presion_atmosferica NUMERIC(6,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 9. Contacto
    await pool.query(`
      CREATE TABLE IF NOT EXISTS contacto (
        id_contacto SERIAL PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        correo VARCHAR(150) NOT NULL,
        telefono VARCHAR(20),
        asunto VARCHAR(150),
        mensaje TEXT NOT NULL,
        fecha_envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        estado VARCHAR(50) DEFAULT 'pendiente'
      )
    `);

    console.log('Tables created or verified successfully!');

    // Let's seed initial categories and products
    console.log('Seeding initial categories...');
    await pool.query(`
      INSERT INTO categoria_producto (id_categoria_producto, nombre_linea)
      VALUES 
        (1, 'Línea Alimentos')
      ON CONFLICT (id_categoria_producto) DO NOTHING
    `);
    await pool.query(`
      INSERT INTO categoria_producto (id_categoria_producto, nombre_linea)
      VALUES 
        (2, 'Línea No Alimentos Agrícola e Insumos')
      ON CONFLICT (id_categoria_producto) DO NOTHING
    `);

    console.log('Seeding initial products...');
    
    // Alimentos
    await pool.query(`
      INSERT INTO producto (id_producto, nombre, descripcion, imagen_url, id_categoria_producto)
      VALUES (
        1, 
        'Miel de Abeja', 
        'Producto a partir de néctares de árboles frutícolas y flores silvestres. Pura, natural y rica en nutrientes, cosechada con técnicas apícolas sostenibles.', 
        '/activos/img_productos/miel_de_abeja.png', 
        1
      )
      ON CONFLICT (id_producto) DO UPDATE SET 
        nombre = EXCLUDED.nombre,
        descripcion = EXCLUDED.descripcion,
        imagen_url = EXCLUDED.imagen_url,
        id_categoria_producto = EXCLUDED.id_categoria_producto
    `);

    await pool.query(`
      INSERT INTO producto (id_producto, nombre, descripcion, imagen_url, id_categoria_producto)
      VALUES (
        2, 
        'Néctar de Frutas', 
        'Elaborados con la mejor selección de frutas locales, manteniendo su sabor original y valor nutricional. Ideal para el consumo diario.', 
        '/activos/img_productos/nectar_de_frutas.png', 
        1
      )
      ON CONFLICT (id_producto) DO UPDATE SET 
        nombre = EXCLUDED.nombre,
        descripcion = EXCLUDED.descripcion,
        imagen_url = EXCLUDED.imagen_url,
        id_categoria_producto = EXCLUDED.id_categoria_producto
    `);

    await pool.query(`
      INSERT INTO producto (id_producto, nombre, descripcion, imagen_url, id_categoria_producto)
      VALUES (
        3, 
        'Destilados y Licores', 
        'Fino destilado de uva y exquisitos licores de fruta (Coknat), elaborados artesanalmente con técnicas tradicionales para un sabor inigualable.', 
        '/activos/img_productos/destilados_y_licores.png', 
        1
      )
      ON CONFLICT (id_producto) DO UPDATE SET 
        nombre = EXCLUDED.nombre,
        descripcion = EXCLUDED.descripcion,
        imagen_url = EXCLUDED.imagen_url,
        id_categoria_producto = EXCLUDED.id_categoria_producto
    `);

    // No Alimentos
    await pool.query(`
      INSERT INTO producto (id_producto, nombre, descripcion, imagen_url, id_categoria_producto)
      VALUES (
        4, 
        'Plantones de Palto', 
        'Plantas vigorosas, injertadas y libres de patógenos, listas para campo definitivo.', 
        '/activos/img_productos/plantones_de_palto.png', 
        2
      )
      ON CONFLICT (id_producto) DO UPDATE SET 
        nombre = EXCLUDED.nombre,
        descripcion = EXCLUDED.descripcion,
        imagen_url = EXCLUDED.imagen_url,
        id_categoria_producto = EXCLUDED.id_categoria_producto
    `);

    await pool.query(`
      INSERT INTO producto (id_producto, nombre, descripcion, imagen_url, id_categoria_producto)
      VALUES (
        5, 
        'Plantones de Mango', 
        'Alta resistencia a enfermedades y buen desarrollo radicular.', 
        '/activos/img_productos/plantones_de_mango.png', 
        2
      )
      ON CONFLICT (id_producto) DO UPDATE SET 
        nombre = EXCLUDED.nombre,
        descripcion = EXCLUDED.descripcion,
        imagen_url = EXCLUDED.imagen_url,
        id_categoria_producto = EXCLUDED.id_categoria_producto
    `);

    await pool.query(`
      INSERT INTO producto (id_producto, nombre, descripcion, imagen_url, id_categoria_producto)
      VALUES (
        6, 
        'Plantones de Lúcuma', 
        'Seleccionados para su adaptabilidad y producción.', 
        '/activos/img_productos/plantones_de_lucuma.png', 
        2
      )
      ON CONFLICT (id_producto) DO UPDATE SET 
        nombre = EXCLUDED.nombre,
        descripcion = EXCLUDED.descripcion,
        imagen_url = EXCLUDED.imagen_url,
        id_categoria_producto = EXCLUDED.id_categoria_producto
    `);

    await pool.query(`
      INSERT INTO producto (id_producto, nombre, descripcion, imagen_url, id_categoria_producto)
      VALUES (
        7, 
        'Semilla de Gulupa', 
        'Semillas certificadas para cultivos de alta rentabilidad, ideales para producción comercial de maracuyá morado', 
        '/activos/img_quehacemos/2025-IMG_7702.jpg', 
        2
      )
      ON CONFLICT (id_producto) DO UPDATE SET 
        nombre = EXCLUDED.nombre,
        descripcion = EXCLUDED.descripcion,
        imagen_url = EXCLUDED.imagen_url,
        id_categoria_producto = EXCLUDED.id_categoria_producto
    `);

    await pool.query(`
      INSERT INTO producto (id_producto, nombre, descripcion, imagen_url, id_categoria_producto)
      VALUES (
        8, 
        'Compost Orgánico', 
        'Fertilizante orgánico ideal para mejorar la calidad del suelo y potenciar el crecimiento de cultivos, enriqueciendo los suelos con nutrientes esenciales.', 
        '/activos/img_quehacemos/AsistenciaTecnica-fertiliz01.jpg', 
        2
      )
      ON CONFLICT (id_producto) DO UPDATE SET 
        nombre = EXCLUDED.nombre,
        descripcion = EXCLUDED.descripcion,
        imagen_url = EXCLUDED.imagen_url,
        id_categoria_producto = EXCLUDED.id_categoria_producto
    `);

    await pool.query(`
      INSERT INTO producto (id_producto, nombre, descripcion, imagen_url, id_categoria_producto)
      VALUES (
        9, 
        'Cuyes Reproductores', 
        'Ofrecemos cuyes de razas mejoradas para producción.', 
        '/activos/img_quehacemos/2025-IMG_6799.jpg', 
        2
      )
      ON CONFLICT (id_producto) DO UPDATE SET 
        nombre = EXCLUDED.nombre,
        descripcion = EXCLUDED.descripcion,
        imagen_url = EXCLUDED.imagen_url,
        id_categoria_producto = EXCLUDED.id_categoria_producto
    `);

    console.log('Seeding initial product tags...');
    // Tags for Palto
    const tags = [
      { id: 1, label: 'Zutano', prodId: 4 },
      { id: 2, label: 'Mexicano', prodId: 4 },
      { id: 3, label: 'Duke 7', prodId: 4 },
      { id: 4, label: 'Hass', prodId: 4 },
      { id: 5, label: 'Fuerte', prodId: 4 },
      { id: 6, label: 'Nabal', prodId: 4 },

      // Tags for Mango
      { id: 7, label: 'Camboyano', prodId: 5 },
      { id: 8, label: 'Manzano', prodId: 5 },
      { id: 9, label: 'Kent', prodId: 5 },
      { id: 10, label: 'Keitt', prodId: 5 },
      { id: 11, label: 'Edward', prodId: 5 },

      // Tags for Destilados
      { id: 12, label: 'Uva', prodId: 3 },
      { id: 13, label: 'Coknat', prodId: 3 },
    ];

    for (const tag of tags) {
      await pool.query(`
        INSERT INTO etiqueta_producto (id_etiqueta, nombre_etiqueta, id_producto)
        VALUES ($1, $2, $3)
        ON CONFLICT (id_etiqueta) DO NOTHING
      `, [tag.id, tag.label, tag.prodId]);
    }

    console.log('Seeding news categories if empty...');
    await pool.query(`
      INSERT INTO categoria_noticia (id_categoria_noticia, nombre_categoria)
      VALUES 
        (1, 'Agricultura'),
        (2, 'Capacitación'),
        (3, 'Proyectos'),
        (4, 'Institucional'),
        (5, 'Eventos')
      ON CONFLICT (id_categoria_noticia) DO NOTHING
    `);

    console.log('Database setup complete!');
  } catch (error) {
    console.error('Error seeding data:', error.message);
  } finally {
    await pool.end();
  }
}

run();
