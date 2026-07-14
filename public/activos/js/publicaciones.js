/* SECTION: Publicaciones (Biblioteca Virtual) */

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatFechaCorta(fecha) {
  if (!fecha) return '';
  return new Date(fecha).toLocaleDateString('es-PE', { month: 'long', year: 'numeric' });
}

function crearTarjetaPublicacion(pub) {
  const article = document.createElement('article');
  article.className = 'bg-white rounded-[24px] shadow-sm overflow-hidden flex flex-col';

  const fechaHtml = pub.fecha
    ? `<p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">${formatFechaCorta(pub.fecha)}</p>`
    : '';

  article.innerHTML = `
    <div class="h-48 w-full overflow-hidden bg-mint">
      <img src="${escapeHtml(pub.imagen_portada || '')}" alt="${escapeHtml(pub.titulo || '')}" class="w-full h-full object-cover" loading="lazy" />
    </div>
    <div class="p-6 flex flex-col flex-grow">
      ${fechaHtml}
      <h3 class="font-display font-bold text-lg text-gray-900 mb-2">${escapeHtml(pub.titulo || '')}</h3>
      <p class="text-sm text-gray-600 leading-relaxed mb-4 flex-grow">${escapeHtml(pub.descripcion || '')}</p>
      <a href="${escapeHtml(pub.archivo_url || '')}" target="_blank" rel="noopener"
        class="inline-flex items-center gap-2 font-semibold text-primary hover:text-primary-dark transition-colors w-fit">
        Ver publicación
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
        </svg>
      </a>
    </div>
  `;
  return article;
}

function renderGaleria(contenedorId, publicaciones) {
  const contenedor = document.getElementById(contenedorId);
  if (!contenedor) return;

  contenedor.innerHTML = '';

  if (!publicaciones.length) {
    contenedor.innerHTML = '<p class="text-sm text-gray-500 col-span-full">Aún no hay publicaciones disponibles en esta sección.</p>';
    return;
  }

  publicaciones.forEach((pub) => {
    contenedor.appendChild(crearTarjetaPublicacion(pub));
  });
}

async function cargarPublicaciones() {
  try {
    const response = await fetch('/api/publicaciones');
    if (!response.ok) throw new Error('No se pudieron cargar las publicaciones');

    const publicaciones = await response.json();

    const porTipo = {
      revista: [],
      manual: [],
      boletin: [],
      triptico: [],
    };

    publicaciones.forEach((pub) => {
      if (porTipo[pub.tipo]) {
        porTipo[pub.tipo].push(pub);
      }
    });

    renderGaleria('galeria-revistas', porTipo.revista);
    renderGaleria('galeria-manuales', porTipo.manual);
    renderGaleria('galeria-boletines', porTipo.boletin);
    renderGaleria('galeria-tripticos', porTipo.triptico);
  } catch (error) {
    console.error(error);
    ['galeria-revistas', 'galeria-manuales', 'galeria-boletines', 'galeria-tripticos'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = '<p class="text-sm text-red-500 col-span-full">No se pudieron cargar las publicaciones. Intenta más tarde.</p>';
    });
  }
}

async function cargarGaleriaPorTipo(tipo, contenedorId) {
  const contenedor = document.getElementById(contenedorId);
  if (!contenedor) return;

  try {
    const response = await fetch('/api/publicaciones?tipo=' + encodeURIComponent(tipo));
    if (!response.ok) throw new Error('No se pudieron cargar las publicaciones');

    const publicaciones = await response.json();
    renderGaleria(contenedorId, publicaciones);
  } catch (error) {
    console.error(error);
    contenedor.innerHTML = '<p class="text-sm text-red-500 col-span-full">No se pudieron cargar las publicaciones. Intenta más tarde.</p>';
  }
}

window.cargarGaleriaPorTipo = cargarGaleriaPorTipo;

document.addEventListener('DOMContentLoaded', function () {
  // Solo se auto-ejecuta en la página de Publicaciones (que tiene las 4 galerías a la vez).
  if (document.getElementById('galeria-revistas')) {
    cargarPublicaciones();
  }
});