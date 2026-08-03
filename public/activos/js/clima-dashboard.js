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
  // 1. CONFIGURACIÓN DEL SISTEMA Y PALETA INSTITUCIONAL SEDIR
  // ==========================================================================
  const CONFIG = {
    API_URL: "/api/clima/actual",
    REFRESH_INTERVAL_MS: 60 * 1000, // 1 minuto
    STORAGE_BAROMETER_KEY: "sedir_wlpro_barometro_v1",
    STORAGE_WIND_KEY: "sedir_wlpro_viento_v1",
    STORAGE_TEMP_KEY: "sedir_wlpro_temperatura_v1",
    MAX_BAROMETER_AGE_MS: 6 * 60 * 60 * 1000,  // Ventana de 6 horas
    MAX_WIND_AGE_MS: 24 * 60 * 60 * 1000,      // Ventana de 24 horas (Día)
    MAX_TEMP_AGE_MS: 24 * 60 * 60 * 1000,      // Ventana de 24 horas para alta/baja relativa
    COLORS: {
      // Paleta institucional (Manual de Identidad Visual SEDIR): una sola
      // familia cromática (verde institucional + neutros de tinta) en vez
      // de colores saturados dispares, para una lectura más técnica/seria.
      TEMP_OUTSIDE: "#00302B",    // Ink / tinta oscura — variable principal
      TEMP_WINDCHILL: "#3F5F58",  // Slate verdoso oscuro
      TEMP_HEATINDEX: "#8C7855",  // Marrón institucional
      TEMP_DEWPOINT: "#006A49",   // Verde institucional oscuro
      TEMP_WETBULB: "#7C9992",    // Gris verdoso claro

      // Colores instrumentales generales
      WIND_GAUGE: "#425A54",      // Pizarra verdosa neutra
      WIND_VECTOR: "#006A49",     // Verde institucional oscuro
      HUMIDITY_GREEN: "#00944A",  // Verde institucional (primary)
      BAROMETER_LINE: "#20302B",  // Tinta / carbón verdoso
      SOLAR_RED: "#8C7855",       // Marrón institucional (radiación)
      UV_COLOR: "#6E5A3B",        // Marrón oscuro (UV)
      RAIN_BLUE: "#425A54",       // Pizarra verdosa (precipitación)
      BORDER_GRID: "#E4E1D6",     // Líneas divisorias cálidas y suaves
      TEXT_DARK: "#20302B",
      TEXT_MUTED: "#6B7A73",
    },
    // Rangos de velocidad para la Rosa de los Vientos (m/s): rampa
    // secuencial de un solo tono (claro → oscuro) según intensidad, en vez
    // de un arcoíris de colores sin relación entre sí.
    WIND_SPEED_BINS: [
      { label: "0,0 - 0,9 m/s", min: 0.0, max: 0.9, color: "#D7E4DD" },
      { label: "0,9 - 1,8 m/s", min: 0.9, max: 1.8, color: "#A9C4B8" },
      { label: "1,8 - 2,7 m/s", min: 1.8, max: 2.7, color: "#6FA290" },
      { label: "2,7 - 3,6 m/s", min: 2.7, max: 3.6, color: "#009C63" },
      { label: "3,6 - 4,5 m/s", min: 3.6, max: 4.5, color: "#00944A" },
      { label: "4,5 - 8,9 m/s", min: 4.5, max: 8.9, color: "#006A49" },
      { label: "> 8,9 m/s",     min: 8.9, max: 999, color: "#20302B" },
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
  // 2b. SEMÁFORO AGRÍCOLA — traduce cada número a una palabra + color simple,
  // para que alguien sin conocimientos técnicos entienda de un vistazo si el
  // valor es normal o si requiere atención. Umbrales generales de referencia;
  // un ingeniero agrónomo de SEDIR puede ajustarlos según el cultivo.
  // ==========================================================================
  class AgroThresholds {
    static badge(label, tono) {
      const clases = {
        bien: "tremor-badge tremor-badge-live",
        cuidado: "tremor-badge tremor-badge-warning",
        alerta: "tremor-badge tremor-badge-up",
        info: "tremor-badge tremor-badge-neutral",
      };
      return { label, className: clases[tono] || clases.info };
    }

    static temperatura(celsius) {
      if (typeof celsius !== "number" || Number.isNaN(celsius)) return this.badge("--", "info");
      if (celsius < 12) return this.badge("Frío", "cuidado");
      if (celsius > 32) return this.badge("Calor alto", "alerta");
      if (celsius > 28) return this.badge("Cálido", "cuidado");
      return this.badge("Normal", "bien");
    }

    static viento(ms) {
      if (typeof ms !== "number" || Number.isNaN(ms)) return this.badge("--", "info");
      if (ms > 5.5) return this.badge("Evitar fumigar", "alerta");
      if (ms > 3) return this.badge("Con cuidado", "cuidado");
      return this.badge("Ideal p/ fumigar", "bien");
    }

    static humedad(pct) {
      if (typeof pct !== "number" || Number.isNaN(pct)) return this.badge("--", "info");
      if (pct > 88) return this.badge("Riesgo hongos", "alerta");
      if (pct < 35) return this.badge("Ambiente seco", "cuidado");
      return this.badge("Normal", "bien");
    }

    static uv(indice) {
      if (typeof indice !== "number" || Number.isNaN(indice)) return this.badge("--", "info");
      if (indice >= 8) return this.badge("Muy alto", "alerta");
      if (indice >= 6) return this.badge("Protegerse", "cuidado");
      if (indice >= 3) return this.badge("Moderado", "cuidado");
      return this.badge("Bajo", "bien");
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

    static recordTemperature(celsius) {
      if (typeof celsius !== "number" || Number.isNaN(celsius)) return this.getTemperatureHistory();
      let history = this.getTemperatureHistory();
      const now = Date.now();
      history.push({ t: now, v: PhysicsConverter.round(celsius, 1) });
      history = history.filter(item => now - item.t <= CONFIG.MAX_TEMP_AGE_MS);
      try { localStorage.setItem(CONFIG.STORAGE_TEMP_KEY, JSON.stringify(history)); } catch (e) {}
      return history;
    }

    static getTemperatureHistory() {
      try {
        const data = JSON.parse(localStorage.getItem(CONFIG.STORAGE_TEMP_KEY) || "[]");
        const now = Date.now();
        return Array.isArray(data) ? data.filter(i => now - i.t <= CONFIG.MAX_TEMP_AGE_MS) : [];
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
      svg += `<line x1="${cx - r*0.7}" y1="${cy - r*0.7}" x2="${cx + r*0.7}" y2="${cy + r*0.7}" stroke="#EDEAE0" stroke-width="1"/>`;
      svg += `<line x1="${cx + r*0.7}" y1="${cy - r*0.7}" x2="${cx - r*0.7}" y2="${cy + r*0.7}" stroke="#EDEAE0" stroke-width="1"/>`;

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
      svg += `<text x="${cx + 4}" y="${cy - maxR * 0.5}" font-size="9" fill="${CONFIG.COLORS.TEXT_MUTED}">0%</text>`;
      svg += `<text x="${cx + 4}" y="${cy - maxR + 10}" font-size="9" fill="${CONFIG.COLORS.TEXT_MUTED}">25%</text>`;

      // Ejes camuflados
      for (let a = 0; a < 360; a += 45) {
        const p = this._polarToCartesian(cx, cy, maxR, a);
        svg += `<line x1="${cx}" y1="${cy}" x2="${p.x}" y2="${p.y}" stroke="#EDEAE0" stroke-width="1"/>`;
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
  // 5. MOTOR DE GRÁFICOS D3.JS (SVG NATIVO, SIN PARPADEOS)
  // ==========================================================================
  class ChartManager {
    constructor() {
      // Guarda referencias { svg, ...escalas/selecciones } por contenedor,
      // para actualizar datos sin destruir y recrear el SVG en cada refresco.
      this.charts = new Map();
    }

    _clear(containerId) {
      const el = document.getElementById(containerId);
      if (el) el.innerHTML = "";
      this.charts.delete(containerId);
    }

    // Crea (o reutiliza) el <svg> responsivo de un contenedor, con viewBox
    // para que escale de forma fluida sin depender del ancho en píxeles.
    _svg(containerId, width, height) {
      const el = document.getElementById(containerId);
      if (!el) return null;
      let svg = d3.select(el).select("svg");
      if (svg.empty()) {
        svg = d3.select(el)
          .append("svg")
          .attr("viewBox", `0 0 ${width} ${height}`)
          .attr("width", "100%")
          .attr("height", height)
          .attr("font-family", "inherit")
          .style("overflow", "visible");
      }
      return svg;
    }

    // ------------------------------------------------------------------
    // Panel 1: Barras de temperatura (Outside Temp, Wind Chill, etc.)
    // ------------------------------------------------------------------
    renderTempBars(containerId, items) {
      if (!document.getElementById(containerId)) return;
      const width = 460, height = 210;
      const margin = { top: 24, right: 10, bottom: 34, left: 32 };
      const innerW = width - margin.left - margin.right;
      const innerH = height - margin.top - margin.bottom;

      const svg = this._svg(containerId, width, height);
      if (!svg) return;

      const x = d3.scaleBand()
        .domain(items.map(d => d.label))
        .range([0, innerW])
        .padding(0.35);

      const maxVal = Math.max(30, d3.max(items, d => d.val ?? 0) + 5);
      const y = d3.scaleLinear().domain([0, maxVal]).range([innerH, 0]);

      let g = svg.select("g.plot-area");
      if (g.empty()) {
        g = svg.append("g").attr("class", "plot-area")
          .attr("transform", `translate(${margin.left},${margin.top})`);
        g.append("g").attr("class", "axis-y");
        g.append("g").attr("class", "axis-x").attr("transform", `translate(0,${innerH})`);
        g.append("g").attr("class", "bars");
      }

      // Eje Y (líneas de referencia sutiles, sin marco pesado)
      g.select(".axis-y")
        .call(d3.axisLeft(y).ticks(4).tickSize(-innerW).tickFormat(v => `${v.toFixed(0)}°C`))
        .call(sel => sel.select(".domain").remove())
        .call(sel => sel.selectAll(".tick line").attr("stroke", CONFIG.COLORS.BORDER_GRID))
        .call(sel => sel.selectAll(".tick text")
          .attr("fill", CONFIG.COLORS.TEXT_MUTED)
          .attr("font-size", "10px")
          .attr("dx", "-4"));

      // Eje X
      g.select(".axis-x")
        .call(d3.axisBottom(x).tickSize(0))
        .call(sel => sel.select(".domain").attr("stroke", CONFIG.COLORS.BORDER_GRID))
        .call(sel => sel.selectAll(".tick text")
          .attr("fill", CONFIG.COLORS.TEXT_MUTED)
          .attr("font-size", "10.5px")
          .attr("font-weight", 600)
          .attr("transform", "rotate(-20)")
          .style("text-anchor", "end"));

      // Barras + etiqueta de valor
      const bars = g.select(".bars").selectAll("g.bar-group").data(items, d => d.label);
      const barsEnter = bars.enter().append("g").attr("class", "bar-group");
      barsEnter.append("rect").attr("class", "bar-rect").attr("rx", 3);
      barsEnter.append("text").attr("class", "bar-label").attr("text-anchor", "middle");

      const merged = barsEnter.merge(bars);
      merged.select(".bar-rect")
        .attr("x", d => x(d.label))
        .attr("width", x.bandwidth())
        .attr("fill", d => d.color)
        .transition().duration(300)
        .attr("y", d => y(Math.max(d.val ?? 0, 0)))
        .attr("height", d => innerH - y(Math.max(d.val ?? 0, 0)));

      merged.select(".bar-label")
        .attr("x", d => x(d.label) + x.bandwidth() / 2)
        .attr("fill", CONFIG.COLORS.TEXT_DARK)
        .attr("font-size", "11.5px")
        .attr("font-weight", 600)
        .transition().duration(300)
        .attr("y", d => y(Math.max(d.val ?? 0, 0)) - 8)
        .text(d => d.val != null ? d.val.toFixed(1).replace(".", ",") : "--");

      bars.exit().remove();
      this.charts.set(containerId, { type: "temp-bars" });
    }

    // ------------------------------------------------------------------
    // Panel 5: Barras de lluvia (Día / Tasa)
    // ------------------------------------------------------------------
    renderRainBars(containerId, categories, values, maxVal = 5) {
      if (!document.getElementById(containerId)) return;
      const width = 320, height = 180;
      const margin = { top: 22, right: 10, bottom: 26, left: 36 };
      const innerW = width - margin.left - margin.right;
      const innerH = height - margin.top - margin.bottom;

      const svg = this._svg(containerId, width, height);
      if (!svg) return;

      const items = categories.map((c, i) => ({ label: c, val: values[i] }));
      const x = d3.scaleBand().domain(categories).range([0, innerW]).padding(0.5);
      const domainMax = Math.max(maxVal, d3.max(values) + 1 || maxVal);
      const y = d3.scaleLinear().domain([0, domainMax]).range([innerH, 0]);

      let g = svg.select("g.plot-area");
      if (g.empty()) {
        g = svg.append("g").attr("class", "plot-area")
          .attr("transform", `translate(${margin.left},${margin.top})`);
        g.append("g").attr("class", "axis-y");
        g.append("g").attr("class", "axis-x").attr("transform", `translate(0,${innerH})`);
        g.append("g").attr("class", "bars");
      }

      g.select(".axis-y")
        .call(d3.axisLeft(y).ticks(4).tickSize(-innerW).tickFormat(v => `${v.toFixed(1).replace(".", ",")} mm`))
        .call(sel => sel.select(".domain").remove())
        .call(sel => sel.selectAll(".tick line").attr("stroke", "#F5F3EC"))
        .call(sel => sel.selectAll(".tick text").attr("fill", CONFIG.COLORS.TEXT_MUTED).attr("font-size", "9.5px"));

      g.select(".axis-x")
        .call(d3.axisBottom(x).tickSize(0))
        .call(sel => sel.select(".domain").attr("stroke", CONFIG.COLORS.BORDER_GRID))
        .call(sel => sel.selectAll(".tick text")
          .attr("fill", CONFIG.COLORS.TEXT_MUTED).attr("font-size", "11px").attr("font-weight", 600));

      const bars = g.select(".bars").selectAll("g.bar-group").data(items, d => d.label);
      const barsEnter = bars.enter().append("g").attr("class", "bar-group");
      barsEnter.append("rect").attr("class", "bar-rect").attr("rx", 3).attr("fill", CONFIG.COLORS.RAIN_BLUE);
      barsEnter.append("text").attr("class", "bar-label").attr("text-anchor", "middle");

      const merged = barsEnter.merge(bars);
      merged.select(".bar-rect")
        .attr("x", d => x(d.label) + x.bandwidth() / 2 - 18)
        .attr("width", 36)
        .transition().duration(300)
        .attr("y", d => y(Math.max(d.val ?? 0, 0)))
        .attr("height", d => innerH - y(Math.max(d.val ?? 0, 0)));

      merged.select(".bar-label")
        .attr("x", d => x(d.label) + x.bandwidth() / 2)
        .attr("fill", CONFIG.COLORS.TEXT_DARK)
        .attr("font-size", "11px")
        .attr("font-weight", 700)
        .transition().duration(300)
        .attr("y", d => y(Math.max(d.val ?? 0, 0)) - 8)
        .text(d => d.val != null ? d.val.toFixed(1).replace(".", ",") : "--");

      bars.exit().remove();
      this.charts.set(containerId, { type: "rain-bars" });
    }

    // ------------------------------------------------------------------
    // Gauges semicirculares (Viento, Humedad, UV, Radiación solar)
    // ------------------------------------------------------------------
    renderGauge(containerId, value, options = {}) {
      const el = document.getElementById(containerId);
      if (!el) return;
      const { max = 100, unit = "", color = CONFIG.COLORS.HUMIDITY_GREEN, decimals = 1 } = options;
      const isValid = typeof value === "number" && !Number.isNaN(value);
      const frac = isValid ? Math.max(0, Math.min(1, value / max)) : 0;
      const textVal = isValid ? `${value.toFixed(decimals).replace(".", ",")} ${unit}`.trim() : "--";

      const size = 170;
      const cx = size / 2, cyOffset = size * 0.56;
      const outerR = size * 0.42, innerR = outerR * 0.65;

      const startAngle = -Math.PI / 2, endAngle = Math.PI / 2;

      let svg = d3.select(el).select("svg");
      let state = this.charts.get(containerId);

      if (svg.empty() || !state || state.type !== "gauge") {
        el.innerHTML = "";
        svg = d3.select(el).append("svg")
          .attr("viewBox", `0 0 ${size} ${size * 0.72}`)
          .attr("width", "100%")
          .style("max-width", "200px")
          .style("display", "block")
          .style("margin", "0 auto");

        const g = svg.append("g").attr("transform", `translate(${cx},${cyOffset})`);

        const track = d3.arc().innerRadius(innerR).outerRadius(outerR).startAngle(startAngle).endAngle(endAngle);
        g.append("path").attr("class", "gauge-track").attr("d", track).attr("fill", CONFIG.COLORS.BORDER_GRID);

        g.append("path").attr("class", "gauge-fill").attr("fill", color);

        g.append("text").attr("class", "gauge-value")
          .attr("text-anchor", "middle")
          .attr("y", -6)
          .attr("font-size", "19px")
          .attr("font-weight", 700)
          .attr("fill", CONFIG.COLORS.TEXT_DARK);

        this.charts.set(containerId, { type: "gauge", g, arcGen: d3.arc().innerRadius(innerR).outerRadius(outerR).startAngle(startAngle) });
        state = this.charts.get(containerId);
      }

      const targetAngle = startAngle + frac * (endAngle - startAngle);
      const fillPath = state.g.select(".gauge-fill");
      const prevAngle = fillPath.datum() ?? startAngle;

      fillPath.datum(targetAngle)
        .transition().duration(400)
        .attrTween("d", function (d) {
          const interpolate = d3.interpolate(prevAngle, d);
          return t => state.arcGen.endAngle(interpolate(t))();
        });

      state.g.select(".gauge-fill").attr("fill", color);
      state.g.select(".gauge-value").text(textVal);
    }

    // ------------------------------------------------------------------
    // Panel 8: Barómetro — área con degradado y eje temporal
    // ------------------------------------------------------------------
    renderBarometer(containerId, historyData) {
      const el = document.getElementById(containerId);
      if (!el) return;

      if (!historyData || historyData.length < 2) {
        this._clear(containerId);
        el.innerHTML = `<div class="flex items-center justify-center text-xs font-medium h-[190px]" style="color:${CONFIG.COLORS.TEXT_MUTED}">Reuniendo lecturas barométricas en tiempo real...</div>`;
        return;
      }

      const width = 460, height = 190;
      const margin = { top: 16, right: 14, bottom: 26, left: 44 };
      const innerW = width - margin.left - margin.right;
      const innerH = height - margin.top - margin.bottom;

      let svg = d3.select(el).select("svg");
      let g;
      const gradientId = `barometro-gradient-${containerId}`;

      if (svg.empty()) {
        el.innerHTML = "";
        svg = d3.select(el).append("svg")
          .attr("viewBox", `0 0 ${width} ${height}`)
          .attr("width", "100%")
          .attr("height", height);

        const defs = svg.append("defs");
        const gradient = defs.append("linearGradient")
          .attr("id", gradientId).attr("x1", "0").attr("y1", "0").attr("x2", "0").attr("y2", "1");
        gradient.append("stop").attr("offset", "0%").attr("stop-color", CONFIG.COLORS.BAROMETER_LINE).attr("stop-opacity", 0.25);
        gradient.append("stop").attr("offset", "100%").attr("stop-color", CONFIG.COLORS.BAROMETER_LINE).attr("stop-opacity", 0);

        g = svg.append("g").attr("class", "plot-area").attr("transform", `translate(${margin.left},${margin.top})`);
        g.append("g").attr("class", "axis-y");
        g.append("g").attr("class", "axis-x").attr("transform", `translate(0,${innerH})`);
        g.append("path").attr("class", "area-path").attr("fill", `url(#${gradientId})`);
        g.append("path").attr("class", "line-path").attr("fill", "none")
          .attr("stroke", CONFIG.COLORS.BAROMETER_LINE).attr("stroke-width", 2);
      } else {
        g = svg.select("g.plot-area");
      }

      const x = d3.scaleTime()
        .domain(d3.extent(historyData, d => new Date(d.t)))
        .range([0, innerW]);
      const y = d3.scaleLinear()
        .domain([d3.min(historyData, d => d.v) - 0.5, d3.max(historyData, d => d.v) + 0.5])
        .range([innerH, 0]);

      g.select(".axis-y")
        .call(d3.axisLeft(y).ticks(4).tickSize(-innerW).tickFormat(v => `${v.toFixed(1).replace(".", ",")} mb`))
        .call(sel => sel.select(".domain").remove())
        .call(sel => sel.selectAll(".tick line").attr("stroke", "#EDEAE0"))
        .call(sel => sel.selectAll(".tick text").attr("fill", CONFIG.COLORS.TEXT_MUTED).attr("font-size", "10px"));

      g.select(".axis-x")
        .call(d3.axisBottom(x).ticks(6).tickFormat(d3.timeFormat("%-I %p")).tickSize(0))
        .call(sel => sel.select(".domain").attr("stroke", CONFIG.COLORS.BORDER_GRID))
        .call(sel => sel.selectAll(".tick text")
          .attr("fill", CONFIG.COLORS.TEXT_MUTED).attr("font-size", "10.5px").attr("font-weight", 600));

      const lineGen = d3.line().x(d => x(new Date(d.t))).y(d => y(d.v)).curve(d3.curveMonotoneX);
      const areaGen = d3.area().x(d => x(new Date(d.t))).y0(innerH).y1(d => y(d.v)).curve(d3.curveMonotoneX);

      g.select(".line-path").datum(historyData).transition().duration(300).attr("d", lineGen);
      g.select(".area-path").datum(historyData).transition().duration(300).attr("d", areaGen);

      this.charts.set(containerId, { type: "barometer" });
    }

    destroyAll() {
      this.charts.forEach((_, containerId) => this._clear(containerId));
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
      const tempCurrentC = PhysicsConverter.fToC(d.temperatura_f);
      const tempHistory = TelemetryStorage.recordTemperature(tempCurrentC);
      const tempMaxRel = tempHistory.length ? Math.max(...tempHistory.map(item => item.v)) : tempCurrentC;
      const tempMinRel = tempHistory.length ? Math.min(...tempHistory.map(item => item.v)) : tempCurrentC;

      const tempMaxValue = d.temperatura_max_f ? PhysicsConverter.fToC(d.temperatura_max_f) : tempMaxRel;
      const tempMinValue = d.temperatura_min_f ? PhysicsConverter.fToC(d.temperatura_min_f) : tempMinRel;

      // 1. Textos e indicadores numéricos en DOM
      const domMap = {
        "wl-temp": PhysicsConverter.format(tempCurrentC, 1, "°C"),
        "wl-temp-max": PhysicsConverter.format(tempMaxValue, 1, "°C"),
        "wl-temp-min": PhysicsConverter.format(tempMinValue, 1, "°C"),
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
        "wl-temp-max-hora": d.temperatura_max_hora ? `a las ${d.temperatura_max_hora}` : "Relativa reciente",
        "wl-temp-min-hora": d.temperatura_min_hora ? `a las ${d.temperatura_min_hora}` : "Relativa reciente",
      };

      requestAnimationFrame(() => {
        for (const [id, val] of Object.entries(domMap)) {
          const el = document.getElementById(id);
          if (el) el.textContent = val;
        }

        // Semáforo agrícola: número + palabra simple + color, sin necesidad
        // de interpretar un gráfico técnico.
        const pills = {
          "wl-temp-status": AgroThresholds.temperatura(tempCurrentC),
          "wl-viento-status": AgroThresholds.viento(PhysicsConverter.mphToMs(d.viento_velocidad_mph)),
          "wl-humedad-status": AgroThresholds.humedad(d.humedad),
          "wl-uv-status": AgroThresholds.uv(d.uv),
        };
        for (const [id, pill] of Object.entries(pills)) {
          const el = document.getElementById(id);
          if (el) {
            el.textContent = pill.label;
            el.className = pill.className;
          }
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
          max: 12, unit: "", color: CONFIG.COLORS.UV_COLOR, decimals: 1
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