const path = require('path');

/**
 * Mapa de rutas amigables -> archivo real dentro de /public/paginas
 * Ej: /contacto  ->  public/paginas/contacto.html
 *
 * Agrega aquí cualquier página nueva que crees.
 */
const PAGE_ROUTES = {
  '/quienes-somos': 'quienessomos.html',
  '/que-hacemos': 'quehacemos.html',
  '/proyectos': 'proyectos.html',
  '/noticias': 'noticia.html',
  '/noticia': 'noticia-detalle.html',
  '/productos': 'productos.html',
  '/servicios': 'servicios.html',
  '/publicaciones': 'publicaciones.html',
  '/contacto': 'contacto.html',
  '/unidades-productivas': 'unidades-productivas.html',
  '/investigaciones': 'investigaciones.html',
  '/clima': 'clima.html',
  '/revistas': 'revistas.html',
  '/manuales': 'manuales.html',
  '/boletines': 'boletines.html',
  '/webinars': 'webinars.html',
  '/tripticos': 'tripticos.html',
  '/politica-privacidad': 'politica-privacidad.html',
};

// Índice inverso: archivo.html -> ruta amigable (para redirigir las URLs viejas)
const FILE_TO_ROUTE = Object.fromEntries(
  Object.entries(PAGE_ROUTES).map(([route, file]) => [file, route])
);

/**
 * Middleware que:
 * 1) Si alguien entra con la URL vieja (/paginas/contacto.html o /contacto.html),
 *    lo redirige de forma permanente (301) a la URL limpia (/contacto).
 * 2) Si la URL ya es limpia (/contacto), sirve el archivo real sin exponer
 *    la carpeta /paginas/ ni la extensión .html en la barra de direcciones.
 */
function cleanUrls(publicDir) {
  return function (req, res, next) {
    const reqPath = req.path;

    // 1) Redirigir rutas viejas -> ruta limpia
    if (reqPath.startsWith('/paginas/')) {
      const file = path.basename(reqPath);
      const clean = FILE_TO_ROUTE[file];
      if (clean) {
        return res.redirect(301, clean);
      }
    }

    if (reqPath.endsWith('.html')) {
      const file = path.basename(reqPath);
      const clean = FILE_TO_ROUTE[file];
      if (clean) {
        return res.redirect(301, clean);
      }
    }

    // 2) Servir el archivo real detrás de la ruta limpia
    const mapped = PAGE_ROUTES[reqPath];
    if (mapped) {
      return res.sendFile(path.join(publicDir, 'paginas', mapped));
    }

    next();
  };
}

module.exports = { cleanUrls, PAGE_ROUTES };
