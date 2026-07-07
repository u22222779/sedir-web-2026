/* SECTION: Webinars */

function formatFechaWebinar(fecha) {
  if (!fecha) return '';
  return new Date(fecha).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function crearTarjetaWebinar(w) {
  const article = document.createElement('article');
  article.className = 'bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow';

  article.innerHTML = `
    <div class="h-40 w-full overflow-hidden bg-mint">
      <img src="${w.afiche || ''}" alt="${w.tema}" class="w-full h-full object-cover" loading="lazy" />
    </div>
    <div class="p-5 flex flex-col flex-grow">
      <span class="inline-block bg-primary/10 text-primary text-xs font-bold px-3 py-1 rounded-full w-fit mb-3">${w.categoria}</span>
      <h3 class="font-display font-bold text-base text-gray-900 mb-2 leading-snug">${w.tema}</h3>
      <p class="text-xs text-gray-500 mb-4">${formatFechaWebinar(w.fecha)}${w.expositor ? ' · ' + w.expositor : ''}</p>
      <div class="mt-auto flex flex-col gap-2">
        ${w.url_youtube ? `<a href="${w.url_youtube}" target="_blank" rel="noopener" class="text-center bg-primary text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-primary-dark transition-colors">Ver grabación</a>` : ''}
        ${w.url_pdf ? `<a href="${w.url_pdf}" target="_blank" rel="noopener" class="text-center border border-gray-300 text-gray-700 text-sm font-semibold px-4 py-2 rounded-full hover:border-primary hover:text-primary transition-colors">Descargar PDF</a>` : ''}
      </div>
    </div>
  `;
  return article;
}

function renderWebinars(webinars) {
  const grid = document.getElementById('webinars-grid');
  grid.innerHTML = '';

  if (!webinars.length) {
    grid.innerHTML = '<p class="text-sm text-gray-500 col-span-full">No se encontraron webinars con estos filtros.</p>';
    return;
  }

  webinars.forEach((w) => grid.appendChild(crearTarjetaWebinar(w)));
}

function mostrarProximoWebinar(webinars) {
  const contenedor = document.getElementById('proximo-webinar');
  if (!webinars.length) return;

  const hoy = new Date().toISOString().slice(0, 10);
  const proximo = webinars.find((w) => w.fecha && w.fecha.slice(0, 10) >= hoy);

  if (!proximo) return;

  contenedor.classList.remove('hidden');
  contenedor.innerHTML = `
    <p class="text-sm font-semibold text-primary-dark uppercase tracking-wide mb-1">Próximo webinar</p>
    <p class="text-gray-800">${formatFechaWebinar(proximo.fecha)} — <strong>${proximo.tema}</strong></p>
  `;
}

async function cargarFiltros() {
  try {
    const response = await fetch('/api/webinars/filtros');
    if (!response.ok) throw new Error('No se pudieron cargar los filtros');
    const data = await response.json();

    const selectAnio = document.getElementById('filtro-anio');
    // Deja solo la opción "Todos" y repuebla, por si esta función se llama más de una vez.
    selectAnio.querySelectorAll('option:not([value="Todos"])').forEach((opt) => opt.remove());
    data.anios.forEach((anio) => {
      const option = document.createElement('option');
      option.value = anio;
      option.textContent = anio;
      selectAnio.appendChild(option);
    });

    const selectCategoria = document.getElementById('filtro-categoria');
    selectCategoria.querySelectorAll('option:not([value="Todos"])').forEach((opt) => opt.remove());
    data.categorias.forEach((item) => {
      const option = document.createElement('option');
      option.value = item.categoria;
      option.textContent = `${item.categoria} (${item.total})`;
      selectCategoria.appendChild(option);
    });
  } catch (error) {
    console.error(error);
  }
}

async function cargarWebinars() {
  const grid = document.getElementById('webinars-grid');
  grid.innerHTML = '<p class="text-sm text-gray-500 col-span-full">Cargando webinars...</p>';

  try {
    const anio = document.getElementById('filtro-anio').value;
    const categoria = document.getElementById('filtro-categoria').value;

    const params = new URLSearchParams();
    if (anio && anio !== 'Todos') params.set('anio', anio);
    if (categoria && categoria !== 'Todos') params.set('categoria', categoria);

    const response = await fetch('/api/webinars?' + params.toString());
    if (!response.ok) throw new Error('No se pudieron cargar los webinars');

    const webinars = await response.json();
    renderWebinars(webinars);
    mostrarProximoWebinar(webinars);
  } catch (error) {
    console.error(error);
    grid.innerHTML = '<p class="text-sm text-red-500 col-span-full">No se pudieron cargar los webinars. Intenta más tarde.</p>';
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  await cargarFiltros();
  await cargarWebinars();

  document.getElementById('filtro-anio').addEventListener('change', cargarWebinars);
  document.getElementById('filtro-categoria').addEventListener('change', cargarWebinars);
});
