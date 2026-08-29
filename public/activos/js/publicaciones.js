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
  article.className = 'bg-white rounded-[24px] shadow-sm overflow-hidden flex flex-col hover:shadow-md hover:-translate-y-1 transition-all duration-300 border border-gray-200';

  const fechaHtml = pub.fecha
    ? `<p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">${formatFechaCorta(pub.fecha)}</p>`
    : '';

  article.innerHTML = `
    <div class="h-48 w-full overflow-hidden bg-mint relative">
      <img src="${escapeHtml(pub.imagen_portada || '')}" alt="${escapeHtml(pub.titulo || '')}" class="w-full h-full object-cover hover:scale-105 transition-transform duration-500" loading="lazy" />
      <span class="absolute bottom-3 left-3 text-[10px] font-bold font-display uppercase tracking-widest px-2.5 py-1 rounded-md bg-[#00944A] text-white shadow-sm">
        ${escapeHtml(pub.tipo || 'Documento')}
      </span>
    </div>
    <div class="p-6 flex flex-col flex-grow">
      ${fechaHtml}
      <h3 class="font-display font-bold text-lg text-gray-900 mb-2 leading-snug">${escapeHtml(pub.titulo || '')}</h3>
      <p class="text-sm text-gray-600 leading-relaxed mb-4 flex-grow line-clamp-3">${escapeHtml(pub.descripcion || '')}</p>
      <a href="${escapeHtml(pub.archivo_url || '')}" target="_blank" rel="noopener"
        class="inline-flex items-center justify-center gap-2 bg-[#F09734] text-white font-montserrat font-semibold py-2 px-4 rounded-xl hover:bg-[#d6852a] transition-all w-full mt-auto">
        <span class="material-symbols-outlined text-[20px]">picture_as_pdf</span>
        Ver publicación
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

// Objeto estático del nuevo manual para inyectarlo
const manualNuevo = {
  tipo: 'manual',
  titulo: 'Manual SEDIR_Fertilizantes y su uso',
  descripcion: 'Guía práctica para la correcta aplicación, manejo y aprovechamiento de fertilizantes en campo, orientada a optimizar el rendimiento agrícola.',
  imagen_portada: '/activos/docs/Manual SEDIR_Fertilizantes y su uso.jpg', // Cambia esta ruta si tienes una imagen específica para el manual
  archivo_url: '/activos/docs/Manual SEDIR_Fertilizantes y su uso.pdf',
  fecha: new Date().toISOString()
};

async function cargarPublicaciones() {
  try {
    const response = await fetch('/api/publicaciones');
    if (!response.ok) throw new Error('No se pudieron cargar las publicaciones');

    const publicaciones = await response.json();

    // INYECCIÓN: Agregamos el manual directamente al arreglo obtenido de la base de datos
    publicaciones.unshift(manualNuevo);

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

    // INYECCIÓN: Si la galería que se está cargando es de tipo 'manual', inyectamos el nuevo
    if (tipo === 'manual') {
      publicaciones.unshift(manualNuevo); // 'unshift' lo coloca de primero en la lista
    }

    renderGaleria(contenedorId, publicaciones);
  } catch (error) {
    console.error(error);
    contenedor.innerHTML = '<p class="text-sm text-red-500 col-span-full">No se pudieron cargar las publicaciones. Intenta más tarde.</p>';
  }
}

window.cargarGaleriaPorTipo = cargarGaleriaPorTipo;

document.addEventListener('DOMContentLoaded', function () {
  if (document.getElementById('galeria-revistas')) {
    cargarPublicaciones();
  }
});