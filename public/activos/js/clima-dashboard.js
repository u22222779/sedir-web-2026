// Dashboard de clima en vivo (estación SEDIR - Moro)
// Consume el backend propio (/api/clima/actual), que a su vez llama a
// WeatherLink v2 con la API Key/Secret guardadas en backend/.env.
// El navegador nunca ve esas credenciales.

(function () {
  const REFRESCO_MS = 60 * 1000; // igual al cache del backend
  let timerRefresco = null;

  function fToC(f) {
    return typeof f === "number" ? ((f - 32) * 5) / 9 : null;
  }

  function mphAKmh(mph) {
    return typeof mph === "number" ? mph * 1.60934 : null;
  }

  function mphAMs(mph) {
    return typeof mph === "number" ? mph * 0.44704 : null;
  }

  function comaDecimal(texto) {
    return typeof texto === "string" ? texto.replace(".", ",") : texto;
  }

  function inAMm(inches) {
    return typeof inches === "number" ? inches * 25.4 : null;
  }

  function inHgAHpa(inHg) {
    return typeof inHg === "number" ? inHg * 33.8639 : null;
  }

  // Redondeo explícito a N decimales evitando errores de punto flotante de
  // toFixed (ej. (1.005).toFixed(2) => "1.00" en vez de "1.01").
  function redondear(valor, decimales = 1) {
    if (typeof valor !== "number" || Number.isNaN(valor)) return null;
    const factor = Math.pow(10, decimales);
    return Math.round((valor + Number.EPSILON) * factor) / factor;
  }

  function formatear(valor, decimales = 1) {
    const redondeado = redondear(valor, decimales);
    return redondeado === null ? "--" : redondeado.toFixed(decimales);
  }

  function formatearHora(epochSegundos) {
    if (typeof epochSegundos !== "number") return "--";
    return new Date(epochSegundos * 1000).toLocaleTimeString("es-PE", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // ===================================================================
  // Panel estilo WeatherLink: 3 widgets en SVG puro (sin librerías)
  // ===================================================================

  // --- 1) Gráfico de barras de temperatura (Outside Temp, Wind Chill,
  //        Heat Index, Dew Point, Wet Bulb) ---
  function graficoTemperaturas(items) {
    const width = 520;
    const height = 230;
    const marginLeft = 56;
    const marginBottom = 46;
    const marginTop = 26;
    const chartW = width - marginLeft - 14;
    const chartH = height - marginTop - marginBottom;

    const valores = items.map((it) => (typeof it.valor === "number" ? it.valor : 0));
    const maxDato = Math.max(0, ...valores);
    const max = Math.max(40, Math.ceil((maxDato * 1.15) / 10) * 10);

    const n = items.length;
    const gap = 14;
    const barW = (chartW - gap * (n - 1)) / n;
    const yFor = (v) => marginTop + chartH - (Math.min(v, max) / max) * chartH;

    let svg = `<svg viewBox="0 0 ${width} ${height}" class="w-full h-auto" xmlns="http://www.w3.org/2000/svg">`;

    [0, max / 2, max].forEach((v) => {
      const y = yFor(v);
      svg += `<line x1="${marginLeft}" y1="${y}" x2="${width - 4}" y2="${y}" stroke="#eef0f2" stroke-width="1"/>`;
      svg += `<text x="${marginLeft - 8}" y="${y + 4}" font-size="11" fill="#9aa3ab" text-anchor="end">${comaDecimal(v.toFixed(1))} °C</text>`;
    });

    items.forEach((it, i) => {
      const x = marginLeft + i * (barW + gap);
      const val = it.valor;
      const y = yFor(val ?? 0);
      const baseY = marginTop + chartH;
      const h = Math.max(baseY - y, 0);
      svg += `<rect x="${x}" y="${y}" width="${barW}" height="${h}" rx="2" fill="${it.color}"/>`;
      svg += `<text x="${x + barW / 2}" y="${y - 8}" font-size="12" font-weight="600" fill="#374151" text-anchor="middle">${val != null ? comaDecimal(val.toFixed(1)) : "--"}</text>`;
      svg += `<text x="${x + barW / 2}" y="${baseY + 16}" font-size="10.5" fill="#6b7280" text-anchor="end" transform="rotate(-28 ${x + barW / 2} ${baseY + 16})">${it.label}</text>`;
    });

    svg += `<line x1="${marginLeft}" y1="${marginTop + chartH}" x2="${width - 4}" y2="${marginTop + chartH}" stroke="#d7dbe0" stroke-width="1"/>`;
    svg += `</svg>`;
    return svg;
  }

  // --- 2) Gauge semicircular de velocidad del viento ---
  function polarToCartesian(cx, cy, r, angleDeg) {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  function describeArc(cx, cy, r, startAngle, endAngle) {
    const start = polarToCartesian(cx, cy, r, endAngle);
    const end = polarToCartesian(cx, cy, r, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
  }

  function gaugeViento(valorMs, max = 15) {
    const size = 220;
    const cx = size / 2;
    const cy = size / 2 + 6;
    const r = 86;
    const pct = Math.max(0, Math.min(1, (valorMs || 0) / max));
    const sweep = 180 * pct;

    const bgPath = describeArc(cx, cy, r, -90, 90);
    const fgPath = sweep > 0 ? describeArc(cx, cy, r, -90, -90 + sweep) : null;
    const inicio = polarToCartesian(cx, cy, r + 16, -90);

    return `
      <svg viewBox="0 0 ${size} ${size * 0.62}" class="w-full max-w-[220px] h-auto" xmlns="http://www.w3.org/2000/svg">
        <path d="${bgPath}" fill="none" stroke="#e7eaee" stroke-width="14" stroke-linecap="round"/>
        ${fgPath ? `<path d="${fgPath}" fill="none" stroke="#22c55e" stroke-width="14" stroke-linecap="round"/>` : ""}
        <text x="${inicio.x}" y="${inicio.y + 4}" font-size="11" fill="#9aa3ab" text-anchor="middle">0</text>
        <text x="${cx}" y="${cy - 14}" font-size="30" font-weight="700" fill="#1f2937" text-anchor="middle">${valorMs != null ? comaDecimal(valorMs.toFixed(1)) : "--"}</text>
        <text x="${cx}" y="${cy + 10}" font-size="13" fill="#6b7280" text-anchor="middle">m/s</text>
      </svg>`;
  }

  // --- 3) Rosa de los vientos (dirección) ---
  function polarXY(cx, cy, r, angleDeg) {
    // 0° = Norte (arriba), sentido horario, igual que un compás real.
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  function sectorPath(cx, cy, r, centerAngle, halfAngle) {
    const a0 = centerAngle - halfAngle;
    const a1 = centerAngle + halfAngle;
    const p0 = polarXY(cx, cy, r, a0);
    const p1 = polarXY(cx, cy, r, a1);
    const largeArc = a1 - a0 > 180 ? 1 : 0;
    return `M ${cx} ${cy} L ${p0.x} ${p0.y} A ${r} ${r} 0 ${largeArc} 1 ${p1.x} ${p1.y} Z`;
  }

  function rosaVientos(dirDeg, velMs, max = 10) {
    const size = 220;
    const cx = size / 2;
    const cy = size / 2;
    const r = 82;
    const labelR = r + 20;
    const direcciones = [
      { nombre: "Norte", angulo: 0 },
      { nombre: "Nordeste", angulo: 45 },
      { nombre: "Este", angulo: 90 },
      { nombre: "Sureste", angulo: 135 },
      { nombre: "Sur", angulo: 180 },
      { nombre: "Suroeste", angulo: 225 },
      { nombre: "Oeste", angulo: 270 },
      { nombre: "Noroeste", angulo: 315 },
    ];

    let svg = `<svg viewBox="0 0 ${size} ${size}" class="w-full max-w-[240px] h-auto" xmlns="http://www.w3.org/2000/svg">`;
    svg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#e5e7eb" stroke-width="1"/>`;

    direcciones.forEach((d) => {
      const p = polarXY(cx, cy, r, d.angulo);
      svg += `<line x1="${cx}" y1="${cy}" x2="${p.x}" y2="${p.y}" stroke="#eef0f2" stroke-width="1"/>`;
    });

    if (typeof dirDeg === "number") {
      const pct = Math.max(0.25, Math.min(1, (velMs || 0) / max));
      const wedgeR = r * pct;
      svg += `<path d="${sectorPath(cx, cy, wedgeR, dirDeg, 18)}" fill="#1d6fd8" fill-opacity="0.85"/>`;
    }

    direcciones.forEach((d) => {
      const p = polarXY(cx, cy, labelR, d.angulo);
      svg += `<text x="${p.x}" y="${p.y + 4}" font-size="11" fill="#6b7280" text-anchor="middle">${d.nombre.toLowerCase()}</text>`;
    });

    svg += `</svg>`;
    return svg;
  }

  function gradosACardinal(deg) {
    if (typeof deg !== "number") return "--";
    const puntos = ["Norte", "Noreste", "Este", "Sureste", "Sur", "Suroeste", "Oeste", "Noroeste"];
    return puntos[Math.round(deg / 45) % 8];
  }

  function pintar(dato) {
    const set = (id, valor) => {
      const el = document.getElementById(id);
      if (el) el.textContent = valor;
    };

    set("wl-temp", `${formatear(fToC(dato.temperatura_f))}°C`);
    set("wl-temp-max", `${formatear(fToC(dato.temperatura_max_f))}°C`);
    set("wl-temp-min", `${formatear(fToC(dato.temperatura_min_f))}°C`);
    set(
      "wl-temp-max-hora",
      dato.temperatura_max_hora ? `a las ${formatearHora(dato.temperatura_max_hora)}` : ""
    );
    set(
      "wl-temp-min-hora",
      dato.temperatura_min_hora ? `a las ${formatearHora(dato.temperatura_min_hora)}` : ""
    );
    set("wl-sensacion", `${formatear(fToC(dato.sensacion_termica_f))}°C`);
    set("wl-humedad", `${formatear(dato.humedad, 1)}%`);
    set("wl-presion", `${formatear(inHgAHpa(dato.presion_barometrica_in), 1)} hPa`);
    set("wl-viento", `${formatear(mphAKmh(dato.viento_velocidad_mph), 1)} km/h`);
    set("wl-viento-rafaga", `Ráfaga: ${formatear(mphAKmh(dato.viento_rafaga_mph), 1)} km/h`);
    set("wl-viento-dir", gradosACardinal(dato.viento_direccion));
    set("wl-lluvia-dia", `${formatear(inAMm(dato.lluvia_dia_in), 1)} mm`);
    set("wl-lluvia-tasa", `Tasa: ${formatear(inAMm(dato.lluvia_tasa_in_h), 1)} mm/h`);
    set("wl-uv", formatear(dato.uv, 1));
    set("wl-solar", `${formatear(dato.radiacion_solar_wm2, 0)} W/m²`);

    // Panel estilo WeatherLink (barras de temperatura + gauge + rosa de vientos)
    const contTemp = document.getElementById("wl-chart-temp");
    if (contTemp) {
      contTemp.innerHTML = graficoTemperaturas([
        { label: "Outside Temp", valor: redondear(fToC(dato.temperatura_f)), color: "#c0392b" },
        { label: "Wind Chill", valor: redondear(fToC(dato.wind_chill_f)), color: "#2f7ed8" },
        { label: "Heat Index", valor: redondear(fToC(dato.heat_index_f)), color: "#e67e22" },
        { label: "Dew Point", valor: redondear(fToC(dato.dew_point_f)), color: "#2f9e44" },
        { label: "Wet Bulb", valor: redondear(fToC(dato.wet_bulb_f)), color: "#5bc0de" },
      ]);
    }

    const contGauge = document.getElementById("wl-gauge-viento");
    if (contGauge) {
      contGauge.innerHTML = gaugeViento(redondear(mphAMs(dato.viento_velocidad_mph)));
    }

    const contRosa = document.getElementById("wl-compass-viento");
    if (contRosa) {
      contRosa.innerHTML = rosaVientos(dato.viento_direccion, mphAMs(dato.viento_velocidad_mph));
    }

    const actualizado = dato.actualizado
      ? new Date(dato.actualizado).toLocaleString("es-PE", {
          dateStyle: "short",
          timeStyle: "medium",
        })
      : "--";
    set("wl-actualizado", `Última actualización: ${actualizado}`);

    const estado = document.getElementById("wl-estado");
    if (estado) {
      estado.textContent = "En línea";
      estado.classList.remove("bg-red-100", "text-red-700");
      estado.classList.add("bg-green-100", "text-green-700");
    }
  }

  function mostrarError(mensaje) {
    const estado = document.getElementById("wl-estado");
    if (estado) {
      estado.textContent = "Sin conexión";
      estado.classList.remove("bg-green-100", "text-green-700");
      estado.classList.add("bg-red-100", "text-red-700");
    }
    const nota = document.getElementById("wl-error");
    if (nota) {
      nota.textContent = mensaje;
      nota.classList.remove("hidden");
    }
    console.error("[clima-dashboard]", mensaje);
  }

  async function cargarClimaActual() {
    try {
      const respuesta = await fetch("/api/clima/actual");
      const data = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(data.error || "Error al consultar el clima actual");
      }

      const nota = document.getElementById("wl-error");
      if (nota) nota.classList.add("hidden");

      pintar(data);
    } catch (error) {
      mostrarError(error.message);
    }
  }

  function iniciar() {
    if (!document.getElementById("wl-temp")) return; // no estamos en clima.html
    cargarClimaActual();
    timerRefresco = setInterval(cargarClimaActual, REFRESCO_MS);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar);
  } else {
    iniciar();
  }

  // evita timers acumulados si el usuario navega SPA-like
  window.addEventListener("beforeunload", () => {
    if (timerRefresco) clearInterval(timerRefresco);
  });
})();