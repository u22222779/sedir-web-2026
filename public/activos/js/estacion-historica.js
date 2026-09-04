/* ==========================================
   HISTÓRICO ESTACIÓN METEOROLÓGICA SEDIR
   Filtra y muestra los gráficos históricos
   (2019-2024) generados por la estación física
   de SEDIR en Moro.
========================================== */

const ESTACION_IMG_BASE = "/activos/img_estacion_meteorologica/";
const ESTACION_MANIFEST_URL = "/activos/data/estacion-meteorologica-manifest.json";

const VARIABLES_ESTACION = [
  { key: "temperatura", label: "Temperatura", icon: "device_thermostat" },
  { key: "humedad", label: "Humedad Relativa", icon: "humidity_percentage" },
  { key: "precipitaciones", label: "Precipitaciones", icon: "rainy" },
  { key: "radiacion_uv", label: "Radiación UV", icon: "wb_sunny" },
  { key: "sensacion_termica", label: "Sensación Térmica", icon: "thermostat" },
];

const MESES_ESTACION = [
  ["01", "Enero"], ["02", "Febrero"], ["03", "Marzo"], ["04", "Abril"],
  ["05", "Mayo"], ["06", "Junio"], ["07", "Julio"], ["08", "Agosto"],
  ["09", "Setiembre"], ["10", "Octubre"], ["11", "Noviembre"], ["12", "Diciembre"],
];

let estacionManifest = null;

async function initEstacionHistorica() {
  const root = document.getElementById("estacion-historica");
  if (!root) return;

  const resultsContainer = document.getElementById("estacion-resultados");
  if (resultsContainer) {
    resultsContainer.innerHTML = `
      <div class="col-span-full flex items-center justify-center gap-2 text-sm text-gray-400 py-10">
        <span class="material-symbols-outlined animate-spin text-xl leading-none">progress_activity</span>
        Cargando registro histórico...
      </div>`;
  }

  try {
    const res = await fetch(ESTACION_MANIFEST_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    estacionManifest = await res.json();
  } catch (err) {
    console.error("No se pudo cargar el histórico de la estación:", err);
    if (resultsContainer) {
      resultsContainer.innerHTML = `
        <div class="col-span-full bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
          No se pudo cargar el histórico en este momento. Intenta recargar la página.
        </div>`;
    }
    return;
  }

  renderEstacionForm();
  attachEstacionEvents();
  initEstacionLightbox();
}

function getAvailableYears() {
  const years = new Set();
  Object.values(estacionManifest || {}).forEach((yearsObj) => {
    Object.keys(yearsObj).forEach((y) => years.add(y));
  });
  return Array.from(years).sort().reverse();
}

function renderEstacionForm() {
  const yearSelect = document.getElementById("estacion-anio");
  const monthSelect = document.getElementById("estacion-mes");
  const checkContainer = document.getElementById("estacion-variables");

  const years = getAvailableYears();
  const now = new Date();
  const defaultYear = years.includes(String(now.getFullYear())) ? String(now.getFullYear()) : years[0];
  // now.getMonth() es base 0 (enero = 0, julio = 6); sumamos 1 para obtener
  // el número de mes real (01-12) y evitar que quede desfasado un mes.
  const defaultMonth = String(now.getMonth() + 1).padStart(2, "0");

  yearSelect.innerHTML = years.map((y) => `<option value="${y}" ${y === defaultYear ? "selected" : ""}>${y}</option>`).join("");
  monthSelect.innerHTML = MESES_ESTACION.map(([val, label]) =>
    `<option value="${val}" ${val === defaultMonth ? "selected" : ""}>${label}</option>`
  ).join("");

  checkContainer.innerHTML = VARIABLES_ESTACION.map((v, i) => `
    <label class="estacion-chip">
      <input type="checkbox" value="${v.key}" ${i === 0 ? "checked" : ""} class="estacion-chip__input">
      <span class="material-symbols-outlined text-base">${v.icon}</span>
      <span>${v.label}</span>
    </label>
  `).join("");
}

function attachEstacionEvents() {
  const btn = document.getElementById("estacion-buscar");
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    buscarEstacionHistorico();
  });

  // Búsqueda inicial automática
  buscarEstacionHistorico();
}

function buscarEstacionHistorico() {
  const year = document.getElementById("estacion-anio").value;
  const month = document.getElementById("estacion-mes").value;
  const checked = Array.from(document.querySelectorAll(".estacion-chip__input:checked")).map((c) => c.value);
  const resultsContainer = document.getElementById("estacion-resultados");

  if (!checked.length) {
    resultsContainer.innerHTML = `
      <div class="col-span-full bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 text-sm">
        Elegí al menos una condición climática para buscar.
      </div>`;
    return;
  }

  const cards = [];

  checked.forEach((varKey) => {
    const varInfo = VARIABLES_ESTACION.find((v) => v.key === varKey);
    const fname = estacionManifest?.[varKey]?.[year]?.[month];

    if (fname) {
      cards.push(`
        <div class="bg-white rounded-3xl overflow-hidden shadow-md border border-gray-200 hover:shadow-xl transition">
          <div class="flex items-center gap-2 px-5 py-3 border-b border-gray-100">
            <span class="material-symbols-outlined text-primary">${varInfo.icon}</span>
            <span class="font-semibold text-sm">${varInfo.label}</span>
          </div>
          <div class="relative group estacion-img-trigger cursor-pointer" role="button" tabindex="0"
            aria-label="Ampliar gráfico de ${varInfo.label}">
            <img
              src="${ESTACION_IMG_BASE}${fname}"
              alt="Gráfico de ${varInfo.label} - ${monthLabel(month)} ${year}"
              loading="lazy"
              class="w-full h-auto object-contain bg-gray-50 estacion-img"
              data-caption="${varInfo.label} — ${monthLabel(month)} ${year}"
            />
            <div class="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center pointer-events-none">
              <span class="text-white text-sm font-semibold bg-white/20 backdrop-blur-sm border border-white/50 px-4 py-2 rounded-full">
                <span class="material-symbols-outlined align-middle text-base mr-1">zoom_in</span>Ampliar
              </span>
            </div>
          </div>
        </div>
      `);
    } else {
      cards.push(`
        <div class="bg-white rounded-3xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-400">
          <span class="material-symbols-outlined text-3xl mb-2 block">${varInfo.icon}</span>
          Sin registro de <strong>${varInfo.label}</strong> para ${monthLabel(month)} ${year}.
        </div>
      `);
    }
  });

  resultsContainer.innerHTML = cards.join("");
}

function monthLabel(monthValue) {
  const found = MESES_ESTACION.find(([val]) => val === monthValue);
  return found ? found[1] : monthValue;
}

/**
 * Lightbox para ampliar los gráficos históricos con un clic.
 */
function initEstacionLightbox() {
  const resultsContainer = document.getElementById("estacion-resultados");
  if (!resultsContainer || resultsContainer.dataset.lightboxReady) return;
  resultsContainer.dataset.lightboxReady = "true";

  const overlay = document.createElement("div");
  overlay.id = "estacion-lightbox";
  overlay.className = "estacion-lightbox hidden";
  overlay.innerHTML = `
    <button type="button" class="estacion-lightbox__cerrar" aria-label="Cerrar imagen ampliada">
      <span class="material-symbols-outlined">close</span>
    </button>
    <figure class="estacion-lightbox__figure">
      <img class="estacion-lightbox__img" alt="" />
      <figcaption class="estacion-lightbox__caption"></figcaption>
    </figure>
    <span class="estacion-lightbox__hint">Haz clic fuera de la imagen o usa el botón de cierre</span>
  `;
  document.body.appendChild(overlay);

  const imgEl = overlay.querySelector(".estacion-lightbox__img");
  const captionEl = overlay.querySelector(".estacion-lightbox__caption");
  const cerrarBtn = overlay.querySelector(".estacion-lightbox__cerrar");

  function abrir(src, caption) {
    imgEl.src = src;
    imgEl.alt = caption || "";
    captionEl.textContent = caption || "";
    overlay.classList.remove("hidden");
    document.body.classList.add("estacion-lightbox-open");
  }

  function cerrar() {
    overlay.classList.add("hidden");
    document.body.classList.remove("estacion-lightbox-open");
    imgEl.src = "";
  }

  resultsContainer.addEventListener("click", (e) => {
    const trigger = e.target.closest(".estacion-img-trigger");
    if (!trigger) return;
    const img = trigger.querySelector(".estacion-img");
    if (img) abrir(img.src, img.dataset.caption || img.alt);
  });

  resultsContainer.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const trigger = e.target.closest(".estacion-img-trigger");
    if (!trigger) return;
    e.preventDefault();
    const img = trigger.querySelector(".estacion-img");
    if (img) abrir(img.src, img.dataset.caption || img.alt);
  });

  // Cerrar: un solo toque/clic sobre el fondo oscuro (fuera de la imagen).
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) cerrar();
  });

  // Cerrar: botón "✕", siempre visible (para quien no descubra el gesto).
  cerrarBtn.addEventListener("click", cerrar);

  // Cerrar: tecla Escape, por accesibilidad en teclado.
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !overlay.classList.contains("hidden")) {
      cerrar();
    }
  });
}



document.addEventListener("DOMContentLoaded", initEstacionHistorica);