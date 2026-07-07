/* SECTION: Noticia Detalle */
function getNoticiaIdFromUrl() {
  var params = new URLSearchParams(window.location.search);
  return params.get('id');
}

function formatFecha(fecha) {
  if (!fecha) return '';
  return new Date(fecha).toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function stripHtml(html) {
  var tmp = document.createElement('div');
  tmp.innerHTML = html || '';
  return tmp.textContent || tmp.innerText || '';
}

async function cargarNoticiaDetalle() {
  var id = getNoticiaIdFromUrl();
  var loadingEl = document.getElementById('noticia-loading');
  var errorEl = document.getElementById('noticia-error');
  var articleEl = document.getElementById('noticia-detalle');

  if (!id) {
    loadingEl.classList.add('hidden');
    errorEl.classList.remove('hidden');
    return;
  }

  try {
    var response = await fetch('/api/noticias/' + encodeURIComponent(id));

    if (!response.ok) {
      throw new Error('Noticia no encontrada');
    }

    var noticia = await response.json();

    document.getElementById('page-title').textContent = 'SEDIR - ' + (noticia.titulo || 'Noticia');
    var metaDescription = document.getElementById('meta-description');
    if (metaDescription) {
      metaDescription.setAttribute('content', stripHtml(noticia.subtitulo || '').slice(0, 160));
    }

    document.getElementById('noticia-categoria').textContent = noticia.nombre_categoria || 'General';
    document.getElementById('noticia-titulo').textContent = noticia.titulo || '';

    var subtituloEl = document.getElementById('noticia-subtitulo');
    if (noticia.subtitulo) {
      subtituloEl.innerHTML = noticia.subtitulo;
    } else {
      subtituloEl.classList.add('hidden');
    }

    document.getElementById('noticia-fecha').textContent = formatFecha(noticia.fecha);

    var imagenEl = document.getElementById('noticia-imagen');
    if (noticia.imagen_portada) {
      imagenEl.src = noticia.imagen_portada;
      imagenEl.alt = noticia.titulo || 'Noticia';
    } else {
      imagenEl.closest('div').classList.add('hidden');
    }

    // El contenido viene como HTML ya almacenado (formato del editor de noticias).
    document.getElementById('noticia-contenido').innerHTML = noticia.contenido || '';

    loadingEl.classList.add('hidden');
    articleEl.classList.remove('hidden');
  } catch (error) {
    console.error(error);
    loadingEl.classList.add('hidden');
    errorEl.classList.remove('hidden');
  }
}

document.addEventListener('DOMContentLoaded', cargarNoticiaDetalle);
