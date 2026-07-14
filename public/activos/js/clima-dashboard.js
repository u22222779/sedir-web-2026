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

  function inAMm(inches) {
    return typeof inches === "number" ? inches * 25.4 : null;
  }

  function inHgAHpa(inHg) {
    return typeof inHg === "number" ? inHg * 33.8639 : null;
  }

  function formatear(valor, decimales = 1) {
    return typeof valor === "number" && !Number.isNaN(valor)
      ? valor.toFixed(decimales)
      : "--";
  }

  function gradosACardinal(deg) {
    if (typeof deg !== "number") return "--";
    const puntos = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
    return puntos[Math.round(deg / 45) % 8];
  }

  function pintar(dato) {
    const set = (id, valor) => {
      const el = document.getElementById(id);
      if (el) el.textContent = valor;
    };

    set("wl-temp", `${formatear(fToC(dato.temperatura_f))}°C`);
    set("wl-sensacion", `${formatear(fToC(dato.sensacion_termica_f))}°C`);
    set("wl-humedad", `${formatear(dato.humedad, 0)}%`);
    set("wl-presion", `${formatear(inHgAHpa(dato.presion_barometrica_in), 0)} hPa`);
    set("wl-viento", `${formatear(mphAKmh(dato.viento_velocidad_mph), 0)} km/h`);
    set("wl-viento-rafaga", `Ráfaga: ${formatear(mphAKmh(dato.viento_rafaga_mph), 0)} km/h`);
    set("wl-viento-dir", gradosACardinal(dato.viento_direccion));
    set("wl-lluvia-dia", `${formatear(inAMm(dato.lluvia_dia_in), 1)} mm`);
    set("wl-lluvia-tasa", `Tasa: ${formatear(inAMm(dato.lluvia_tasa_in_h), 1)} mm/h`);
    set("wl-uv", formatear(dato.uv, 1));
    set("wl-solar", `${formatear(dato.radiacion_solar_wm2, 0)} W/m²`);

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