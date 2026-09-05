const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

// Carpeta pública donde quedan guardadas las imágenes subidas desde el
// panel administrativo. Al vivir dentro de /public, express.static ya las
// sirve automáticamente (ver backend-app/src/app.js).
const UPLOAD_DIR = path.join(__dirname, '..', '..', '..', 'public', 'activos', 'img_uploads');

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
]);

function sanitizeBaseName(originalName) {
  const base = path.basename(originalName, path.extname(originalName));
  return base
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quita tildes
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'imagen';
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${sanitizeBaseName(file.originalname)}-${uniqueSuffix}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    return cb(new Error('Formato de imagen no permitido. Usa JPG, PNG, WEBP, GIF o SVG.'));
  }
  return cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

module.exports = { upload, UPLOAD_DIR };
