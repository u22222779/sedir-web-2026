function subirImagen(req, res) {
  if (!req.file) {
    return res.status(400).json({
      error: 'No se recibió ningún archivo de imagen',
    });
  }

  const url = `/activos/img_uploads/${req.file.filename}`;

  return res.status(201).json({
    url,
    nombre_original: req.file.originalname,
    tamano_bytes: req.file.size,
  });
}

module.exports = { subirImagen };
