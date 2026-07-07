function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatProjectDate(value) {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
}

async function renderProyectos() {
  const container = document.getElementById('proyectos-grid');
  if (!container) {
    return;
  }

  const response = await fetch('/api/proyectos');
  const proyectos = response.ok ? await response.json() : [];

  container.innerHTML = proyectos.length
    ? proyectos.map(function (item) {
        const image = item.imagen || '/activos/img_logos/logo-led.png';
        return `
          <article class="bg-white rounded-[30px] overflow-hidden border border-gray-200 shadow-sm hover:shadow-lg transition-all group flex flex-col">
            <div class="relative h-60 overflow-hidden bg-gray-50">
              <img alt="${escapeHtml(item.nombre || 'Proyecto')}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src="${escapeHtml(image)}" />
            </div>
            <div class="p-8 flex flex-col flex-grow">
              <div class="flex items-center justify-between gap-3 mb-3">
                <span class="text-xs px-3 py-1 rounded-full font-semibold bg-primary-light text-primary-dark">${escapeHtml(item.estado || 'Activo')}</span>
                <span class="text-xs text-gray-500">${escapeHtml(formatProjectDate(item.fecha_inicio))}</span>
              </div>
              <h3 class="text-xl font-bold text-gray-900 mb-4">${escapeHtml(item.nombre || '')}</h3>
              <p class="text-gray-600 text-sm mb-6 flex-grow">${escapeHtml(item.descripcion || '')}</p>
              <div class="text-sm text-gray-500 mb-4">Beneficiarios: ${escapeHtml(item.beneficiarios || '')}</div>
            </div>
          </article>
        `;
      }).join('')
    : '<div class="col-span-full text-center text-gray-500 py-10">No hay proyectos disponibles</div>';
}

window.renderProyectos = renderProyectos;