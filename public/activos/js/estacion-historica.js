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

  try {
    const res = await fetch(ESTACION_MANIFEST_URL);
    estacionManifest = await res.json();
  } catch (err) {
    console.error("No se pudo cargar el histórico de la estación:", err);
    root.innerHTML = '<p class="text-sm text-red-600">No se pudo cargar el histórico en este momento.</p>';
    return;
  }

  renderEstacionForm();
  attachEstacionEvents();
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
  const defaultMonth = String(now.getMonth()).padStart(2, "0") === "00" ? "12" : String(now.getMonth()).padStart(2, "0");

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
          <img
            src="${ESTACION_IMG_BASE}${fname}"
            alt="Gráfico de ${varInfo.label} - ${monthLabel(month)} ${year}"
            loading="lazy"
            class="w-full h-auto object-contain bg-gray-50"
          />
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

document.addEventListener("DOMContentLoaded", initEstacionHistorica);
