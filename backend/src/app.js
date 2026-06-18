const express = require('express');
const path = require('path');

const healthRoutes = require('./routes/health.routes');
const authRoutes = require('./routes/auth.routes');
const contactoRoutes = require('./routes/contacto.routes');
const noticiaRoutes = require('./routes/noticia.routes');
const proyectoRoutes = require('./routes/proyecto.routes');
const productoRoutes = require('./routes/producto.routes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const { apiRateLimiter, securityHeaders } = require('./middleware/security.middleware');

const app = express();

app.disable('x-powered-by');

app.use(securityHeaders);
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(express.static(path.join(__dirname, '..', '..', 'public')));

app.use(healthRoutes);
app.use('/api', apiRateLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/contacto', contactoRoutes);
app.use('/api/noticias', noticiaRoutes);
app.use('/api/proyectos', proyectoRoutes);
app.use('/api/productos', productoRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
