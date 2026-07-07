/* ==========================================
   TAILWIND CONFIG
========================================== */
window.tailwind = window.tailwind || {};
window.tailwind.config = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: "#006b34",
        secondary: "#426900",
        error: "#ba1a1a",
        surface: "#f8f9fa"
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
        full: "9999px"
      }
    }
  }
};

/* ==========================================
   ESTADO GLOBAL
========================================== */
window.climaKpis = [];
window.climaHistory = [];

/* ==========================================
   UBICACIÓN MORO - ANCASH
========================================== */
const LAT = -9.1817;
const LON = -78.1861;

/* ==========================================
   OBTENER CLIMA API
========================================== */
async function cargarClima() {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,uv_index&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`;

    const res = await fetch(url);
    const data = await res.json();

    const c = data.current;

    const clima = {
      temperatura: c.temperature_2m,
      humedad: c.relative_humidity_2m,
      sensacion: c.apparent_temperature,
      precipitacion: c.precipitation,
      uv: c.uv_index,
      fecha: new Date().toISOString()
    };

    actualizarKPIsDesdeAPI(clima);
    cargarHistorico(data.daily);

    // guardar en backend (opcional)
    guardarClima(clima);

  } catch (err) {
    console.error("Error clima:", err);
  }
}

/* ==========================================
   GUARDAR EN BACKEND (OPCIONAL)
========================================== */
async function guardarClima(clima) {
  try {
    await fetch("/api/clima/guardar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(clima)
    });
  } catch (err) {
    console.error("Error guardando clima:", err);
  }
}

/* ==========================================
   ACTUALIZAR KPIs
========================================== */
function actualizarKPIsDesdeAPI(clima) {
  window.climaKpis = [
    {
      icon: "device_thermostat",
      value: `${clima.temperatura}°C`,
      label: "Temperatura"
    },
    {
      icon: "humidity_percentage",
      value: `${clima.humedad}%`,
      label: "Humedad"
    },
    {
      icon: "rainy",
      value: `${clima.precipitacion} mm`,
      label: "Precipitación"
    },
    {
      icon: "wb_sunny",
      value: `${clima.uv}`,
      label: "UV"
    },
    {
      icon: "thermostat",
      value: `${clima.sensacion}°C`,
      label: "Sensación térmica"
    }
  ];

  renderKPIs();
}

/* ==========================================
   RENDER KPIs EN HTML
========================================== */
function renderKPIs() {
  const container = document.getElementById("clima-kpi-container");
  if (!container) return;

  container.innerHTML = "";

  window.climaKpis.forEach(kpi => {
    container.innerHTML += `
      <div class="glass-card rounded-xl p-6 text-center transition hover:-translate-y-1">
        <span class="material-symbols-outlined text-4xl mb-2">
          ${kpi.icon}
        </span>
        <div class="text-2xl font-bold">${kpi.value}</div>
        <div class="text-sm">${kpi.label}</div>
      </div>
    `;
  });
}

/* ==========================================
   HISTÓRICO
========================================== */
function cargarHistorico(daily) {
  const tbody = document.getElementById("clima-history-body");
  if (!tbody) return;

  tbody.innerHTML = "";

  daily.time.forEach((fecha, i) => {
    tbody.innerHTML += `
      <tr>
        <td class="p-2">${fecha}</td>
        <td class="p-2">${daily.temperature_2m_max[i]}°</td>
        <td class="p-2">${daily.temperature_2m_min[i]}°</td>
        <td class="p-2">${daily.precipitation_sum[i]} mm</td>
      </tr>
    `;
  });
}

/* ==========================================
   INICIO AUTOMÁTICO
========================================== */
document.addEventListener("DOMContentLoaded", () => {
  cargarClima();

  setInterval(cargarClima, 300000); // cada 5 minutos
});