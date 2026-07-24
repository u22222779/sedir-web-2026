/**
 * ============================================================================
 * DASHBOARD DE TELEMETRÍA CLIMÁTICA — ESTACIÓN SEDIR (MORO, ÁNCASH)
 * ============================================================================
 * Clon del diseño y comportamiento dinámico de WeatherLink Pro.
 * Incorpora motores de acumulación en caché local (LocalStorage) para generar
 * curvas barométricas de 6 horas y rosas de los vientos multicapa con 
 * clasificación por rangos de velocidad de las últimas 24 horas.
 * ============================================================================
 */

(function () {
  "use strict";

  // ==========================================================================
  // 1. CONFIGURACIÓN DEL SISTEMA Y PALETA ESTÍLO WEATHERLINK PRO
  // ==========================================================================
  const CONFIG = {
    API_URL: "/api/clima/actual",
    REFRESH_INTERVAL_MS: 60 * 1000, // 1 minuto
    STORAGE_BAROMETER_KEY: "sedir_wlpro_barometro_v1",
    STORAGE_WIND_KEY: "sedir_wlpro_viento_v1",
    MAX_BAROMETER_AGE_MS: 6 * 60 * 60 * 1000,  // Ventana de 6 horas
    MAX_WIND_AGE_MS: 24 * 60 * 60 * 1000,      // Ventana de 24 horas (Día)
    COLORS: {
      // Paleta idéntica al gráfico de temperaturas de WeatherLink Pro
      TEMP_OUTSIDE: "#DC2626",   // Rojo intenso
      TEMP_WINDCHILL: "#1E3A8A", // Azul marino
      TEMP_HEATINDEX: "#D97706", // Ámbar / Naranja
      TEMP_DEWPOINT: "#10B981",  // Verde esmeralda
      TEMP_WETBULB: "#3B82F6",   // Azul cielo
      
      // Colores instrumentales generales
      WIND_GAUGE: "#64748B",     // Pizarra neutro
      WIND_VECTOR: "#0284C7",    // Azul directriz
      HUMIDITY_GREEN: "#0E7490", // Teal hídrico
      BAROMETER_LINE: "#1E293B", // Gris oscuro / Carbón
      SOLAR_RED: "#DC2626",      // Rojo radiación
      RAIN_BLUE: "#0284C7",      // Azul precipitación
      BORDER_GRID: "#E2E8F0",    // Líneas divisorias suaves
      TEXT_DARK: "#1E293B",
      TEXT_MUTED: "#64748B",
    },
    // Rangos de velocidad para la Rosa de los Vientos (m/s) según leyenda oficial
    WIND_SPEED_BINS: [
      { label: "0,0 - 0,9 m/s", min: 0.0, max: 0.9, color: "#10B981" },
      { label: "0,9 - 1,8 m/s", min: 0.9, max: 1.8, color: "#8B5CF6" },
      { label: "1,8 - 2,7 m/s", min: 1.8, max: 2.7, color: "#3B82F6" },
      { label: "2,7 - 3,6 m/s", min: 2.7, max: 3.6, color: "#EC4899" },
      { label: "3,6 - 4,5 m/s", min: 3.6, max: 4.5, color: "#F59E0B" },
      { label: "4,5 - 8,9 m/s", min: 4.5, max: 8.9, color: "#EF4444" },
      { label: "> 8,9 m/s",     min: 8.9, max: 999, color: "#1E293B" },
    ]
  };

  // ==========================================================================
  // 2. CONVERTIDOR FÍSICO Y FORMATEO METEOROLÓGICO
  // ==========================================================================
  class PhysicsConverter {
    static fToC(f) {
      return typeof f === "number" ? ((f - 32) * 5) / 9 : null;
    }
    static mphToKmh(mph) {
      return typeof mph === "number" ? mph * 1.60934 : null;
    }
    static mphToMs(mph) {
      return typeof mph === "number" ? mph * 0.44704 : null;
    }
    static inToMm(inches) {
      return typeof inches === "number" ? inches * 25.4 : null;
    }
    static inHgToHpa(inHg) {
      return typeof inHg === "number" ? inHg * 33.8639 : null;
    }
    static round(value, decimals = 1) {
      if (typeof value !== "number" || Number.isNaN(value)) return null;
      const factor = Math.pow(10, decimals);
      return Math.round((value + Number.EPSILON) * factor) / factor;
    }
    static format(value, decimals = 1, unit = "") {
      const rounded = this.round(value, decimals);
      if (rounded === null) return "--";
      const formatted = rounded.toFixed(decimals).replace(".", ",");
      return unit ? `${formatted} ${unit}` : formatted;
    }
    static degreesToCardinal(deg) {
      if (typeof deg !== "number") return "--";
      const points = ["norte", "nordeste", "este", "sureste", "sur", "sudoeste", "oeste", "noroeste"];
      return points[Math.round(deg / 45) % 8].toUpperCase();
    }
  }

  // ==========================================================================
  // 3. MOTOR DE PERSISTENCIA EN CACHÉ LOCAL (HISTORIAL Y TENDENCIAS)
  // ==========================================================================
  class TelemetryStorage {
    static recordBarometer(hpa) {
      if (typeof hpa !== "number" || Number.isNaN(hpa)) return this.getBarometerHistory();
      let history = this.getBarometerHistory();
      const now = Date.now();
      history.push({ t: now, v: PhysicsConverter.round(hpa, 1) });
      history = history.filter(item => now - item.t <= CONFIG.MAX_BAROMETER_AGE_MS);
      try { localStorage.setItem(CONFIG.STORAGE_BAROMETER_KEY, JSON.stringify(history)); } catch (e) {}
      return history;
    }

    static getBarometerHistory() {
      try {
        const data = JSON.parse(localStorage.getItem(CONFIG.STORAGE_BAROMETER_KEY) || "[]");
        const now = Date.now();
        return Array.isArray(data) ? data.filter(i => now - i.t <= CONFIG.MAX_BAROMETER_AGE_MS) : [];
      } catch (e) { return []; }
    }

    static recordWind(dirDeg, speedMs) {
      if (typeof dirDeg !== "number" || typeof speedMs !== "number") return this.getWindHistory();
      let history = this.getWindHistory();
      const now = Date.now();
      history.push({ t: now, d: dirDeg, s: PhysicsConverter.round(speedMs, 1) });
      history = history.filter(item => now - item.t <= CONFIG.MAX_WIND_AGE_MS);
      try { localStorage.setItem(CONFIG.STORAGE_WIND_KEY, JSON.stringify(history)); } catch (e) {}
      return history;
    }

    static getWindHistory() {
      try {
        const data = JSON.parse(localStorage.getItem(CONFIG.STORAGE_WIND_KEY) || "[]");
        const now = Date.now();
        return Array.isArray(data) ? data.filter(i => now - i.t <= CONFIG.MAX_WIND_AGE_MS) : [];
      } catch (e) { return []; }
    }
  }

  // ==========================================================================
  // 4. GENERADORES VECTORIALES SVG (COMPÁS DIRECTRIZ Y ROSA MULTICAPA)
  // ==========================================================================
  class WindVectorRenderer {
    static _polarToCartesian(cx, cy, r, angleDeg) {
      const rad = ((angleDeg - 90) * Math.PI) / 180.0;
      return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
    }

    static _createSectorPath(cx, cy, r, startAngle, endAngle) {
      const start = this._polarToCartesian(cx, cy, r, endAngle);
      const end = this._polarToCartesian(cx, cy, r, startAngle);
      const largeArc = endAngle - startAngle <= 180 ? "0" : "1";
      return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
    }

    // Panel 3: Dirección instantánea (Exacto al estilo "Dirección del viento" del Pro)
    static renderCompass(dirDeg) {
      const size = 220;
      const cx = size / 2, cy = size / 2, r = 80;
      const hasData = typeof dirDeg === "number";

      let svg = `<svg viewBox="0 0 ${size} ${size}" class="w-full max-w-[200px] h-auto mx-auto select-none" xmlns="http://www.w3.org/2000/svg">`;
      
      // Grilla de compás y ejes
      svg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${CONFIG.COLORS.BORDER_GRID}" stroke-width="1"/>`;
      svg += `<circle cx="${cx}" cy="${cy}" r="${r * 0.5}" fill="none" stroke="${CONFIG.COLORS.BORDER_GRID}" stroke-width="1" stroke-dasharray="3 3"/>`;
      svg += `<line x1="${cx}" y1="${cy - r}" x2="${cx}" y2="${cy + r}" stroke="${CONFIG.COLORS.BORDER_GRID}" stroke-width="1"/>`;
      svg += `<line x1="${cx - r}" y1="${cy}" x2="${cx + r}" y2="${cy}" stroke="${CONFIG.COLORS.BORDER_GRID}" stroke-width="1"/>`;
      svg += `<line x1="${cx - r*0.7}" y1="${cy - r*0.7}" x2="${cx + r*0.7}" y2="${cy + r*0.7}" stroke="#F1F5F9" stroke-width="1"/>`;
      svg += `<line x1="${cx + r*0.7}" y1="${cy - r*0.7}" x2="${cx - r*0.7}" y2="${cy + r*0.7}" stroke="#F1F5F9" stroke-width="1"/>`;

      // Sector directriz azul (Wedge del viento actual)
      if (hasData) {
        svg += `<path d="${this._createSectorPath(cx, cy, r * 0.95, dirDeg - 18, dirDeg + 18)}" fill="${CONFIG.COLORS.WIND_VECTOR}" fill-opacity="0.9" stroke="#0284C7" stroke-width="1"/>`;
      }

      // Nomenclatura externa idéntica a la imagen (norte, SE, S, SUDOESTE, W, noroeste, nordeste)
      const labels = [
        { text: "norte", angle: 0, rOffset: 16, bold: false },
        { text: "nordeste", angle: 45, rOffset: 16, bold: false },
        { text: "E", angle: 90, rOffset: 14, bold: false },
        { text: "SE", angle: 135, rOffset: 14, bold: false },
        { text: "S", angle: 180, rOffset: 14, bold: false },
        { text: "SUDOESTE", angle: 225, rOffset: 20, bold: false },
        { text: "W", angle: 270, rOffset: 14, bold: false },
        { text: "noroeste", angle: 315, rOffset: 18, bold: false },
      ];

      labels.forEach(l => {
        const pos = this._polarToCartesian(cx, cy, r + l.rOffset, l.angle);
        svg += `<text x="${pos.x}" y="${pos.y}" font-size="10.5" fill="${CONFIG.COLORS.TEXT_MUTED}" text-anchor="middle" dominant-baseline="central" font-family="inherit">${l.text}</text>`;
      });

      svg += `</svg>`;
      return svg;
    }

    // Panel 4: Rosa de los vientos multicapa (Clon exacto de la tarjeta 4 con leyenda)
    static renderWindRosePro(historyData, currentDir, currentSpeed) {
      // Si el historial está vacío en el primer minuto, generamos una semilla realista basada en el dato actual
      let data = historyData.length > 0 ? historyData : [{ d: currentDir || 135, s: currentSpeed || 2.5 }];
      
      const sectors = 8;
      const sectorAngle = 360 / sectors;
      const counts = Array.from({ length: sectors }, () => Array(CONFIG.WIND_SPEED_BINS.length).fill(0));
      let totalReadings = data.length;

      // Clasificar cada lectura histórica en su octante y en su rango de velocidad
      data.forEach(item => {
        const octant = Math.floor(((item.d + 22.5) % 360) / sectorAngle);
        const binIdx = CONFIG.WIND_SPEED_BINS.findIndex(b => item.s >= b.min && item.s <= b.max);
        if (binIdx !== -1) counts[octant][binIdx]++;
      });

      const size = 220;
      const cx = size / 2, cy = size / 2, maxR = 75;
      
      let svg = `<div class="flex flex-col items-center w-full">`;
      svg += `<svg viewBox="0 0 ${size} ${size}" class="w-full max-w-[200px] h-auto select-none" xmlns="http://www.w3.org/2000/svg">`;

      // Círculos concéntricos de frecuencia (0%, 25%)
      svg += `<circle cx="${cx}" cy="${cy}" r="${maxR}" fill="none" stroke="${CONFIG.COLORS.BORDER_GRID}" stroke-width="1"/>`;
      svg += `<circle cx="${cx}" cy="${cy}" r="${maxR * 0.5}" fill="none" stroke="${CONFIG.COLORS.BORDER_GRID}" stroke-width="1"/>`;
      svg += `<text x="${cx + 4}" y="${cy - maxR * 0.5}" font-size="9" fill="#94A3B8">0%</text>`;
      svg += `<text x="${cx + 4}" y="${cy - maxR + 10}" font-size="9" fill="#94A3B8">25%</text>`;

      // Ejes camuflados
      for (let a = 0; a < 360; a += 45) {
        const p = this._polarToCartesian(cx, cy, maxR, a);
        svg += `<line x1="${cx}" y1="${cy}" x2="${p.x}" y2="${p.y}" stroke="#F1F5F9" stroke-width="1"/>`;
      }

      // Dibujar pétalos apilados por sector
      counts.forEach((binCounts, octantIdx) => {
        const centerAngle = octantIdx * sectorAngle;
        let currentRadius = 0;
        
        binCounts.forEach((count, binIdx) => {
          if (count === 0) return;
          const frequency = count / totalReadings;
          // Escalamos visualmente para que una frecuencia del 25% o más llene el radio exterior
          const wedgeThickness = Math.min(1, frequency / 0.35) * maxR;
          const nextRadius = Math.min(maxR, currentRadius + wedgeThickness);
          
          if (nextRadius > currentRadius) {
            const path = this._createSectorPath(cx, cy, nextRadius, centerAngle - 16, centerAngle + 16);
            svg += `<path d="${path}" fill="${CONFIG.WIND_SPEED_BINS[binIdx].color}" fill-opacity="0.9" stroke="#FFFFFF" stroke-width="0.5"/>`;
            currentRadius = nextRadius;
          }
        });
      });

      // Etiquetas externas cardinales
      const labels = [
        { t: "norte", a: 0 }, { t: "nordeste", a: 45 }, { t: "E", a: 90 }, { t: "SE", a: 135 },
        { t: "S", a: 180 }, { t: "SUDOESTE", a: 225 }, { t: "W", a: 270 }, { t: "noroeste", a: 315 }
      ];
      labels.forEach(l => {
        const p = this._polarToCartesian(cx, cy, maxR + 16, l.a);
        svg += `<text x="${p.x}" y="${p.y}" font-size="10" fill="${CONFIG.COLORS.TEXT_MUTED}" text-anchor="middle" dominant-baseline="central">${l.t}</text>`;
      });

      svg += `</svg>`;

      // Subtítulo y Leyenda de colores idéntica a WeatherLink Pro
      svg += `<div class="text-[11px] font-bold text-slate-600 uppercase tracking-wider mt-1 mb-2">DÍA</div>`;
      svg += `<div class="grid grid-cols-2 gap-x-2 gap-y-1.5 w-full max-w-[210px] px-1">`;
      CONFIG.WIND_SPEED_BINS.forEach(bin => {
        svg += `<div class="flex items-center justify-center py-0.5 px-1.5 rounded text-[10px] font-bold text-white shadow-sm" style="background-color: ${bin.color}">${bin.label}</div>`;
      });
      svg += `</div></div>`;

      return svg;
    }
  }

  // ==========================================================================
  // 5. MOTOR DE GRÁFICOS APEXCHARTS (GESTIÓN SIN PARPARDEOS)
  // ==========================================================================
  class ChartManager {
    constructor() {
      this.charts = new Map();
    }

    // Panel 1: Gráfico de barras de temperatura con valores flotantes en el tope
    renderTempBars(containerId, items) {
      if (!document.getElementById(containerId)) return;
      const categories = items.map(i => i.label);
      const values = items.map(i => typeof i.val === "number" ? i.val : null);
      const colors = items.map(i => i.color);

      if (!this.charts.has(containerId)) {
        const options = {
          chart: { type: "bar", height: 210, toolbar: { show: false }, fontFamily: "inherit", animations: { speed: 350 } },
          series: [{ name: "Temperatura", data: values }],
          plotOptions: { bar: { distributed: true, borderRadius: 2, columnWidth: "55%" } },
          colors: colors,
          dataLabels: {
            enabled: true,
            formatter: (v) => v != null ? `${v.toFixed(1).replace(".", ",")}` : "--",
            style: { fontSize: "12px", fontWeight: 700, colors: ["#334155"] },
            offsetY: -20,
          },
          xaxis: {
            categories: categories,
            labels: { rotate: -25, trim: false, style: { fontSize: "11px", fontWeight: 600, colors: "#64748B" } },
            axisBorder: { color: CONFIG.COLORS.BORDER_GRID },
            axisTicks: { show: false }
          },
          yaxis: {
            labels: { formatter: (v) => `${v.toFixed(0)} °C`, style: { fontSize: "10.5px", colors: "#94A3B8" } },
            max: (max) => Math.max(30, max + 5)
          },
          grid: { borderColor: "#F8FAFC" },
          legend: { show: false },
          tooltip: { enabled: false }
        };
        const chart = new ApexCharts(document.getElementById(containerId), options);
        chart.render();
        this.charts.set(containerId, chart);
      } else {
        const chart = this.charts.get(containerId);
        chart.updateOptions({ colors, xaxis: { categories } }, false, false);
        chart.updateSeries([{ data: values }]);
      }
    }

    // Panel 5 y 6: Gráficos de barras para lluvia (Actual y Total)
    renderRainBars(containerId, categories, values, maxVal = 5) {
      if (!document.getElementById(containerId)) return;
      if (!this.charts.has(containerId)) {
        const options = {
          chart: { type: "bar", height: 180, toolbar: { show: false }, fontFamily: "inherit", animations: { speed: 300 } },
          series: [{ name: "Precipitación", data: values }],
          plotOptions: { bar: { borderRadius: 2, columnWidth: "35%", distributed: false } },
          colors: [CONFIG.COLORS.RAIN_BLUE],
          dataLabels: {
            enabled: true,
            formatter: (v) => v != null ? `${v.toFixed(1).replace(".", ",")}` : "--",
            style: { fontSize: "11px", fontWeight: 700, colors: ["#334155"] },
            offsetY: -18,
          },
          xaxis: {
            categories: categories,
            labels: { style: { fontSize: "11px", fontWeight: 600, colors: "#64748B" } },
            axisBorder: { color: CONFIG.COLORS.BORDER_GRID },
            axisTicks: { show: false }
          },
          yaxis: {
            labels: { formatter: (v) => `${v.toFixed(1).replace(".", ",")} mm`, style: { fontSize: "10px", colors: "#94A3B8" } },
            max: (max) => Math.max(maxVal, max + 1)
          },
          grid: { borderColor: "#F8FAFC" },
          tooltip: { enabled: false }
        };
        const chart = new ApexCharts(document.getElementById(containerId), options);
        chart.render();
        this.charts.set(containerId, chart);
      } else {
        this.charts.get(containerId).updateSeries([{ data: values }]);
      }
    }

    // Gauge Semicircular de estilo WeatherLink Pro (Humedad, Viento, Solar)
    renderGauge(containerId, value, options = {}) {
      if (!document.getElementById(containerId)) return;
      const { max = 100, unit = "", color = "#0E7490", decimals = 1 } = options;
      const isValid = typeof value === "number" && !Number.isNaN(value);
      const pct = isValid ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
      const textVal = isValid ? `${value.toFixed(decimals).replace(".", ",")} ${unit}`.trim() : "--";

      if (!this.charts.has(containerId)) {
        const chartOptions = {
          chart: { type: "radialBar", height: 180, sparkline: { enabled: true } },
          series: [pct],
          plotOptions: {
            radialBar: {
              startAngle: -90, endAngle: 90,
              hollow: { size: "65%" },
              track: { background: "#E2E8F0", strokeWidth: "100%" },
              dataLabels: {
                name: { show: false },
                value: { offsetY: 0, fontSize: "22px", fontWeight: 800, color: "#1E293B", formatter: () => textVal }
              }
            }
          },
          fill: { colors: [color] },
          stroke: { lineCap: "round" }
        };
        const chart = new ApexCharts(document.getElementById(containerId), chartOptions);
        chart.render();
        this.charts.set(containerId, chart);
      } else {
        const chart = this.charts.get(containerId);
        chart.updateOptions({ fill: { colors: [color] }, plotOptions: { radialBar: { dataLabels: { value: { formatter: () => textVal } } } } }, false, false);
        chart.updateSeries([pct]);
      }
    }

    // Panel 8: Barómetro en línea oscura con degradado y Tooltip preciso
    renderBarometer(containerId, historyData) {
      const el = document.getElementById(containerId);
      if (!el) return;
      if (!historyData || historyData.length < 2) {
        if (this.charts.has(containerId)) { this.charts.get(containerId).destroy(); this.charts.delete(containerId); }
        el.innerHTML = `<div class="flex items-center justify-center text-xs text-slate-400 font-medium h-[180px]">Reuniendo lecturas barométricas en tiempo real...</div>`;
        return;
      }

      const series = historyData.map(i => ({ x: i.t, y: i.v }));
      if (!this.charts.has(containerId)) {
        el.innerHTML = "";
        const options = {
          chart: { type: "area", height: 190, toolbar: { show: false }, animations: { speed: 300 }, fontFamily: "inherit" },
          series: [{ name: "Presión", data: series }],
          xaxis: {
            type: "datetime",
            labels: { datetimeUTC: false, format: "h A", style: { fontSize: "10.5px", colors: "#64748B", fontWeight: 600 } },
            axisBorder: { color: CONFIG.COLORS.BORDER_GRID }
          },
          yaxis: {
            labels: { formatter: (v) => `${v.toFixed(1).replace(".", ",")} mb`, style: { fontSize: "10px", colors: "#94A3B8" } },
            tickAmount: 4
          },
          stroke: { curve: "smooth", width: 2.2, colors: [CONFIG.COLORS.BAROMETER_LINE] },
          fill: {
            type: "gradient",
            gradient: { shadeIntensity: 1, opacityFrom: 0.25, opacityTo: 0.0, stops: [0, 95, 100] },
            colors: [CONFIG.COLORS.BAROMETER_LINE]
          },
          grid: { borderColor: "#F1F5F9" },
          tooltip: {
            theme: "dark",
            x: { format: "h:mm A" },
            y: { formatter: (v) => `${v.toFixed(1).replace(".", ",")} mb` }
          },
          markers: { size: 0, hover: { size: 5, sizeOffset: 2 } }
        };
        const chart = new ApexCharts(el, options);
        chart.render();
        this.charts.set(containerId, chart);
      } else {
        this.charts.get(containerId).updateSeries([{ data: series }]);
      }
    }

    destroyAll() {
      this.charts.forEach(c => c.destroy());
      this.charts.clear();
    }
  }

  // ==========================================================================
  // 6. CONTROLADOR Y ORQUESTADOR PRINCIPAL
  // ==========================================================================
  class WeatherLinkProApp {
    constructor() {
      this.charts = new ChartManager();
      this.timer = null;
    }

    init() {
      if (!document.getElementById("wl-temp")) return;
      window.addEventListener("beforeunload", () => this.destroy());
      this.fetchData();
      this.timer = setInterval(() => this.fetchData(), CONFIG.REFRESH_INTERVAL_MS);
    }

    async fetchData() {
      try {
        const response = await fetch(CONFIG.API_URL, { cache: "no-store" });
        if (!response.ok) throw new Error("Fallo en la comunicación con la estación.");
        const data = await response.json();
        this.updateDashboard(data);
        this.setConnectionState(true);
      } catch (error) {
        this.setConnectionState(false, error.message);
      }
    }

    updateDashboard(d) {
      // 1. Textos e indicadores numéricos en DOM
      const domMap = {
        "wl-temp": PhysicsConverter.format(PhysicsConverter.fToC(d.temperatura_f), 1, "°C"),
        "wl-temp-max": PhysicsConverter.format(PhysicsConverter.fToC(d.temperatura_max_f), 1, "°C"),
        "wl-temp-min": PhysicsConverter.format(PhysicsConverter.fToC(d.temperatura_min_f), 1, "°C"),
        "wl-sensacion": PhysicsConverter.format(PhysicsConverter.fToC(d.sensacion_termica_f), 1, "°C"),
        "wl-humedad": PhysicsConverter.format(d.humedad, 1, "%"),
        "wl-presion": PhysicsConverter.format(PhysicsConverter.inHgToHpa(d.presion_barometrica_in), 1, "mb"),
        "wl-viento": PhysicsConverter.format(PhysicsConverter.mphToMs(d.viento_velocidad_mph), 1, "m/s"),
        "wl-viento-dir": PhysicsConverter.degreesToCardinal(d.viento_direccion),
        "wl-viento-rafaga": `Ráfaga: ${PhysicsConverter.format(PhysicsConverter.mphToMs(d.viento_rafaga_mph), 1, "m/s")}`,
        "wl-lluvia-dia": PhysicsConverter.format(PhysicsConverter.inToMm(d.lluvia_dia_in), 1, "mm"),
        "wl-lluvia-tasa": `${PhysicsConverter.format(PhysicsConverter.inToMm(d.lluvia_tasa_in_h), 1, "mm/hr")}`,
        "wl-uv": PhysicsConverter.format(d.uv, 1),
        "wl-solar": PhysicsConverter.format(d.radiacion_solar_wm2, 0, "W/m²"),
        "wl-actualizado": d.actualizado ? `Última actualización: ${new Date(d.actualizado).toLocaleString("es-PE", { dateStyle: "long", timeStyle: "short" })}` : "--",
        "wl-temp-max-hora": d.temperatura_max_hora ? `a las ${d.temperatura_max_hora}` : "",
        "wl-temp-min-hora": d.temperatura_min_hora ? `a las ${d.temperatura_min_hora}` : "",
      };

      requestAnimationFrame(() => {
        for (const [id, val] of Object.entries(domMap)) {
          const el = document.getElementById(id);
          if (el) el.textContent = val;
        }

        // Panel 3: Dirección instantánea vectorial
        const compassEl = document.getElementById("wl-compass-viento");
        if (compassEl) compassEl.innerHTML = WindVectorRenderer.renderCompass(d.viento_direccion);

        // Panel 4: Rosa de los vientos con leyenda y acumulación en caché local
        const windRoseEl = document.getElementById("wl-wind-rose");
        if (windRoseEl) {
          const currentMs = PhysicsConverter.mphToMs(d.viento_velocidad_mph);
          const windHistory = TelemetryStorage.recordWind(d.viento_direccion, currentMs);
          windRoseEl.innerHTML = WindVectorRenderer.renderWindRosePro(windHistory, d.viento_direccion, currentMs);
        }
      });

      // Panel 1: Barras de temperaturas del aire
      this.charts.renderTempBars("wl-chart-temp", [
        { label: "Outside Temp", val: PhysicsConverter.round(PhysicsConverter.fToC(d.temperatura_f)), color: CONFIG.COLORS.TEMP_OUTSIDE },
        { label: "Wind Chill",   val: PhysicsConverter.round(PhysicsConverter.fToC(d.wind_chill_f)),  color: CONFIG.COLORS.TEMP_WINDCHILL },
        { label: "Heat Index",   val: PhysicsConverter.round(PhysicsConverter.fToC(d.heat_index_f)),  color: CONFIG.COLORS.TEMP_HEATINDEX },
        { label: "Dew Point",    val: PhysicsConverter.round(PhysicsConverter.fToC(d.dew_point_f)),   color: CONFIG.COLORS.TEMP_DEWPOINT },
        { label: "Wet Bulb",     val: PhysicsConverter.round(PhysicsConverter.fToC(d.wet_bulb_f)),    color: CONFIG.COLORS.TEMP_WETBULB },
      ]);

      // Panel 2: Gauge de Velocidad del viento (m/s)
      this.charts.renderGauge("wl-gauge-viento", PhysicsConverter.round(PhysicsConverter.mphToMs(d.viento_velocidad_mph)), {
        max: 15, unit: "m/s", color: CONFIG.COLORS.WIND_GAUGE, decimals: 1
      });

      // Panel 5: Lluvia actual (día y tasa), únicamente con datos reales que
      // entrega la API de WeatherLink. Se quitó el panel de "Mes/Año" porque
      // esos totales no vienen en el endpoint /current y antes se rellenaban
      // con una estimación inventada (día x 3), lo cual no son datos reales.
      const rainDayMm = PhysicsConverter.round(PhysicsConverter.inToMm(d.lluvia_dia_in), 1) || 0.0;
      const rainRateMm = PhysicsConverter.round(PhysicsConverter.inToMm(d.lluvia_tasa_in_h), 1) || 0.0;

      this.charts.renderRainBars("wl-chart-lluvia-actual", ["Día", "Tasa"], [rainDayMm, rainRateMm], 4.0);

      // Panel 7: Gauge de Humedad (%)
      this.charts.renderGauge("wl-gauge-humedad", PhysicsConverter.round(d.humedad, 1), {
        max: 100, unit: "%", color: CONFIG.COLORS.HUMIDITY_GREEN, decimals: 1
      });

      // Panel 8: Barómetro (Tendencia de presión atmosférica en directo)
      const currentHpa = PhysicsConverter.inHgToHpa(d.presion_barometrica_in);
      const pressureHistory = TelemetryStorage.recordBarometer(currentHpa);
      this.charts.renderBarometer("wl-chart-barometro", pressureHistory);

      // Panel 9 y 10: Radiación Solar y UV
      this.charts.renderGauge("wl-gauge-solar", PhysicsConverter.round(d.radiacion_solar_wm2, 0), {
        max: 1200, unit: "W/m²", color: CONFIG.COLORS.SOLAR_RED, decimals: 0
      });
      if (document.getElementById("wl-gauge-uv")) {
        this.charts.renderGauge("wl-gauge-uv", PhysicsConverter.round(d.uv, 1), {
          max: 12, unit: "", color: "#D97706", decimals: 1
        });
      }
    }

    setConnectionState(online, errorMsg = "") {
      const badge = document.getElementById("wl-estado");
      const errorBox = document.getElementById("wl-error");
      if (online) {
        if (badge) {
          badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-1.5 inline-block"></span> Estación en línea`;
          badge.className = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200";
        }
        if (errorBox) errorBox.classList.add("hidden");
      } else {
        if (badge) {
          badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-rose-500 mr-1.5 inline-block"></span> Sin conexión`;
          badge.className = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200";
        }
        if (errorBox) {
          errorBox.textContent = `Interrupción temporal de telemetría: ${errorMsg}. Intentando reconexión automática...`;
          errorBox.classList.remove("hidden");
        }
      }
    }

    destroy() {
      if (this.timer) clearInterval(this.timer);
      this.charts.destroyAll();
    }
  }

  // ==========================================================================
  // 7. ARRANQUE AUTOMÁTICO EN DOM
  // ==========================================================================
  const app = new WeatherLinkProApp();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => app.init());
  } else {
    app.init();
  }
})();