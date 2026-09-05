const pool = require('../config/database');

function getMissingFields(payload, requiredFields) {
  return requiredFields.filter((field) => {
    const value = payload[field];
    return value === undefined || value === null || String(value).trim() === '';
  });
}

function parsePositiveInteger(value) {
  const normalized = String(value || '').trim();

  if (!/^[1-9]\d*$/.test(normalized)) {
    return null;
  }

  const parsed = Number(normalized);

  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function sanitizeText(value) {
  return String(value || '')
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*(['"]).*?\1/gi, '')
    .replace(/javascript:/gi, '');
}

async function obtenerProductos(req, res) {
  try {
    const result = await pool.query(`
      SELECT
        p.id_producto AS id,
        p.nombre,
        p.descripcion,
        p.imagen_url,
        p.id_categoria_producto,
        c.nombre_linea AS nombre_categoria,
        COALESCE(
          (
            SELECT json_agg(nombre_etiqueta ORDER BY id_etiqueta ASC)
            FROM etiqueta_producto ep
            WHERE ep.id_producto = p.id_producto
          ),
          '[]'::json
        ) AS etiquetas,
        p.created_at,
        p.updated_at
      FROM producto p
      LEFT JOIN categoria_producto c
      ON p.id_categoria_producto = c.id_categoria_producto
      ORDER BY p.id_categoria_producto ASC, p.id_producto ASC
    `);

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
}

async function crearProducto(req, res) {
  try {
    const categoriaId = Number(req.body.id_categoria_producto);
    const missingFields = getMissingFields(req.body, [
      'nombre',
      'descripcion',
      'imagen_url',
      'id_categoria_producto',
    ]);

    if (missingFields.length) {
      return res.status(400).json({
        error: 'Faltan campos obligatorios',
        missingFields,
      });
    }

    if (!Number.isInteger(categoriaId)) {
      return res.status(400).json({
        error: 'La categoría debe ser un número entero válido',
      });
    }

    const producto = {
      nombre: sanitizeText(req.body.nombre),
      descripcion: sanitizeText(req.body.descripcion),
      imagen_url: sanitizeText(req.body.imagen_url),
    };

    const result = await pool.query(
      `
        INSERT INTO producto (
          nombre,
          descripcion,
          imagen_url,
          id_categoria_producto
        )
        VALUES ($1, $2, $3, $4)
        RETURNING
          id_producto AS id,
          nombre,
          descripcion,
          imagen_url,
          id_categoria_producto,
          created_at,
          updated_at
      `,
      [
        producto.nombre,
        producto.descripcion,
        producto.imagen_url,
        categoriaId,
      ]
    );

    const nuevoProducto = result.rows[0];

    // If tags are provided as an array or comma-separated string, insert them
    let tags = req.body.etiquetas || [];
    if (typeof tags === 'string') {
      tags = tags.split(',').map(t => t.trim()).filter(Boolean);
    }

    if (Array.isArray(tags) && tags.length > 0) {
      for (const tag of tags) {
        await pool.query(
          `
            INSERT INTO etiqueta_producto (nombre_etiqueta, id_producto)
            VALUES ($1, $2)
          `,
          [sanitizeText(tag), nuevoProducto.id]
        );
      }
    }

    // Fetch again with tags to return complete product object
    const finalResult = await pool.query(
      `
        SELECT
          p.id_producto AS id,
          p.nombre,
          p.descripcion,
          p.imagen_url,
          p.id_categoria_producto,
          c.nombre_linea AS nombre_categoria,
          COALESCE(
            (
              SELECT json_agg(nombre_etiqueta ORDER BY id_etiqueta ASC)
              FROM etiqueta_producto ep
              WHERE ep.id_producto = p.id_producto
            ),
            '[]'::json
          ) AS etiquetas
        FROM producto p
        LEFT JOIN categoria_producto c ON p.id_categoria_producto = c.id_categoria_producto
        WHERE p.id_producto = $1
      `,
      [nuevoProducto.id]
    );

    res.status(201).json(finalResult.rows[0]);
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
}

async function actualizarProducto(req, res) {
  try {
    const id = parsePositiveInteger(req.params.id);
    const categoriaId = Number(req.body.id_categoria_producto);
    const missingFields = getMissingFields(req.body, [
      'nombre',
      'descripcion',
      'imagen_url',
      'id_categoria_producto',
    ]);

    if (missingFields.length) {
      return res.status(400).json({
        error: 'Faltan campos obligatorios',
        missingFields,
      });
    }

    if (!id) {
      return res.status(400).json({
        error: 'El id del producto debe ser un número entero válido',
      });
    }

    if (!Number.isInteger(categoriaId)) {
      return res.status(400).json({
        error: 'La categoría debe ser un número entero válido',
      });
    }

    const producto = {
      nombre: sanitizeText(req.body.nombre),
      descripcion: sanitizeText(req.body.descripcion),
      imagen_url: sanitizeText(req.body.imagen_url),
    };

    const result = await pool.query(
      `
        UPDATE producto
        SET
          nombre = $1,
          descripcion = $2,
          imagen_url = $3,
          id_categoria_producto = $4,
          updated_at = CURRENT_TIMESTAMP
        WHERE id_producto = $5
        RETURNING
          id_producto AS id,
          nombre,
          descripcion,
          imagen_url,
          id_categoria_producto,
          created_at,
          updated_at
      `,
      [
        producto.nombre,
        producto.descripcion,
        producto.imagen_url,
        categoriaId,
        id,
      ]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        error: 'Producto no encontrado',
      });
    }

    // Update tags: remove old tags and insert new tags
    await pool.query('DELETE FROM etiqueta_producto WHERE id_producto = $1', [id]);

    let tags = req.body.etiquetas || [];
    if (typeof tags === 'string') {
      tags = tags.split(',').map(t => t.trim()).filter(Boolean);
    }

    if (Array.isArray(tags) && tags.length > 0) {
      for (const tag of tags) {
        await pool.query(
          `
            INSERT INTO etiqueta_producto (nombre_etiqueta, id_producto)
            VALUES ($1, $2)
          `,
          [sanitizeText(tag), id]
        );
      }
    }

    // Fetch again with tags to return complete product object
    const finalResult = await pool.query(
      `
        SELECT
          p.id_producto AS id,
          p.nombre,
          p.descripcion,
          p.imagen_url,
          p.id_categoria_producto,
          c.nombre_linea AS nombre_categoria,
          COALESCE(
            (
              SELECT json_agg(nombre_etiqueta ORDER BY id_etiqueta ASC)
              FROM etiqueta_producto ep
              WHERE ep.id_producto = p.id_producto
            ),
            '[]'::json
          ) AS etiquetas
        FROM producto p
        LEFT JOIN categoria_producto c ON p.id_categoria_producto = c.id_categoria_producto
        WHERE p.id_producto = $1
      `,
      [id]
    );

    res.json(finalResult.rows[0]);
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
}

async function eliminarProducto(req, res) {
  try {
    const id = parsePositiveInteger(req.params.id);

    if (!id) {
      return res.status(400).json({
        error: 'El id del producto debe ser un número entero válido',
      });
    }

    const result = await pool.query(
      `
        DELETE FROM producto
        WHERE id_producto = $1
        RETURNING
          id_producto AS id,
          nombre,
          descripcion,
          imagen_url,
          id_categoria_producto,
          created_at,
          updated_at
      `,
      [id]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        error: 'Producto no encontrado',
      });
    }

    res.json({
      message: 'Producto eliminado correctamente',
      producto: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
}

module.exports = {
  obtenerProductos,
  crearProducto,
  actualizarProducto,
  eliminarProducto,
};
