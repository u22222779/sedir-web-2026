'use strict';

const path = require('path');

/**
 * Mapa de rutas amigables -> archivo real dentro de /public/paginas
 */
const PAGE_ROUTES = {
  '/quienes-somos':        'quienessomos.html',
  '/que-hacemos':          'quehacemos.html',
  '/proyectos':            'proyectos.html',
  '/noticias':             'noticia.html',
  '/noticia':              'noticia-detalle.html',
  '/productos':            'productos.html',
  '/servicios':            'servicios.html',
  '/publicaciones':        'publicaciones.html',
  '/contacto':             'contacto.html',
  '/unidades-productivas': 'unidades-productivas.html',
  '/investigaciones':      'investigaciones.html',
  '/clima':                'clima.html',
  '/revistas':             'revistas.html',
  '/manuales':             'manuales.html',
  '/boletines':            'boletines.html',
  '/webinars':             'webinars.html',
  '/tripticos':            'tripticos.html',
  '/politica-privacidad':  'politica-privacidad.html',
  '/pdc':                  'pdc.html',
  '/pdc-moro':             'pdc-moro.html',
  '/pdc-subcuenca':        'pdc-subcuenca.html',
  '/login':                'login.html',
  '/admin':                'admin.html',
};

/**
 * Mapa de rutas PHP antiguas -> ruta limpia nueva (redirección 301).
 */
const PHP_TO_CLEAN = {
  '/index.php':               '/',
  '/inicio.php':              '/',
  '/home.php':                '/',

  '/nosotros.php':            '/quienes-somos',
  '/quienes-somos.php':       '/quienes-somos',
  '/quehacemos.php':          '/que-hacemos',
  '/que-hacemos.php':         '/que-hacemos',

  '/productos.php':           '/productos',
  '/producto.php':            '/productos',
  '/servicios.php':           '/servicios',
  '/servicio.php':            '/servicios',
  '/noticias.php':            '/noticias',
  '/noticia.php':             '/noticias',
  '/proyectos.php':           '/proyectos',
  '/proyecto.php':            '/proyectos',

  '/publicaciones.php':       '/publicaciones',
  '/revistas.php':            '/revistas',
  '/revista.php':             '/revistas',
  '/manuales.php':            '/manuales',
  '/manual.php':              '/manuales',
  '/boletines.php':           '/boletines',
  '/boletin.php':             '/boletines',
  '/tripticos.php':           '/tripticos',
  '/triptico.php':            '/tripticos',

  '/webinars.php':            '/webinars',
  '/webinar.php':             '/webinars',
  '/clima.php':               '/clima',

  '/vivero.php':                          '/unidades-productivas',
  '/vivero-fruticola.php':               '/unidades-productivas',
  '/unidades.php':                        '/unidades-productivas',
  '/laboratorio.php':                     '/unidades-productivas',
  '/UnidadesProductivas-viveroFruticola.php': '/unidades-productivas',
  '/unidadesproductivas-viverofruticola.php': '/unidades-productivas',
  '/unidades-productivas-vivero.php':     '/unidades-productivas',

  '/investigaciones.php':     '/investigaciones',
  '/investigacion.php':       '/investigaciones',

  '/contacto.php':            '/contacto',
  '/contactenos.php':         '/contacto',

  '/politica-privacidad.php': '/politica-privacidad',
  '/privacidad.php':          '/politica-privacidad',

  '/pdc.php':                 '/pdc',
  '/pdc-moro.php':            '/pdc-moro',
  '/pdc-subcuenca.php':       '/pdc-subcuenca',
};

// Índice inverso: archivo.html -> ruta amigable
const FILE_TO_ROUTE = Object.fromEntries(
  Object.entries(PAGE_ROUTES).map(([route, file]) => [file, route])
);

/**
 * Middleware que:
 * 1) Redirige /index.html -> /
 * 2) Redirige URLs .php antiguas -> ruta limpia (301)
 * 3) Redirige /paginas/*.html o /*.html -> ruta limpia (301)
 * 4) Sirve el archivo real detrás de la ruta limpia
 */
function cleanUrls(publicDir) {
  return function (req, res, next) {
    const reqPath = req.path;

    // 1) /index.html -> inicio
    if (reqPath === '/index.html') {
      return res.redirect(301, '/');
    }

    // 2) Rutas PHP antiguas -> ruta limpia
    if (reqPath.endsWith('.php')) {
      const clean = PHP_TO_CLEAN[reqPath];
      if (clean) {
        return res.redirect(301, clean);
      }
      return next();
    }

    // 3a) /paginas/contacto.html -> /contacto
    if (reqPath.startsWith('/paginas/')) {
      const file = path.basename(reqPath);
      const clean = FILE_TO_ROUTE[file];
      if (clean) {
        return res.redirect(301, clean);
      }
    }

    // 3b) /contacto.html -> /contacto
    if (reqPath.endsWith('.html')) {
      const file = path.basename(reqPath);
      const clean = FILE_TO_ROUTE[file];
      if (clean) {
        return res.redirect(301, clean);
      }
    }

    // 4) Servir el archivo real detrás de la ruta limpia
    const mapped = PAGE_ROUTES[reqPath];
    if (mapped) {
      return res.sendFile(path.join(publicDir, 'paginas', mapped));
    }

    next();
  };
}

module.exports = { cleanUrls, PAGE_ROUTES, PHP_TO_CLEAN };