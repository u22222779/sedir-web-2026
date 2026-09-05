const express = require('express');
const path = require('path');
const compression = require('compression');

const healthRoutes = require('./routes/health.routes');
const authRoutes = require('./routes/auth.routes');
const contactoRoutes = require('./routes/contacto.routes');
const noticiaRoutes = require('./routes/noticia.routes');
const proyectoRoutes = require('./routes/proyecto.routes');
const productoRoutes = require('./routes/producto.routes');
const climaRoutes = require("./routes/clima.routes");
const publicacionRoutes = require('./routes/publicacion.routes');
const webinarRoutes = require('./routes/webinar.routes');
const uploadRoutes = require('./routes/upload.routes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const { apiRateLimiter, securityHeaders } = require('./middleware/security.middleware');
const { cleanUrls } = require('./middleware/clean-urls.middleware');

const app = express();
const publicDir = path.join(__dirname, '..', '..', 'public');

app.disable('x-powered-by');

// Detrás de Apache/Passenger (cPanel) o cualquier proxy, para que
// req.secure y x-forwarded-proto funcionen correctamente.
app.set('trust proxy', 1);

// Forzar HTTPS en producción (deja localhost sin tocar en desarrollo)
app.use((req, res, next) => {
  const isProd = process.env.NODE_ENV === 'production';
  const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
  if (isProd && !isSecure) {
    return res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
  }
  next();
});

app.use(securityHeaders);
app.use(compression());
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// URLs limpias: /contacto en vez de /paginas/contacto.html
app.use(cleanUrls(publicDir));

app.use(express.static(publicDir, { extensions: ['html'] }));

app.use(healthRoutes);
app.use('/api', apiRateLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/contacto', contactoRoutes);
app.use('/api/noticias', noticiaRoutes);
app.use('/api/proyectos', proyectoRoutes);
app.use('/api/productos', productoRoutes);
app.use("/api/clima", climaRoutes);
app.use('/api/publicaciones', publicacionRoutes);
app.use('/api/webinars', webinarRoutes);
app.use('/api/upload', uploadRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;