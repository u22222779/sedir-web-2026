/**
 * ============================================================================
 * SUBNAV — SECCIÓN "ESTACIÓN EN VIVO" (clima-subnav.js)
 * ============================================================================
 * Controla el toggle entre las dos vistas de la estación en vivo:
 *   1) "Ahora mismo"       → dashboard dinámico (ApexCharts + gauges + SVG)
 *   2) "Panel WeatherLink" → panel embebido oficial (iframe)
 * ============================================================================
 */

(function () {
  "use strict";

  function initClimaSubnav() {
    // 1. Buscamos cualquier botón que tenga el atributo data-tab (sin importar sus clases)
    const buttons = document.querySelectorAll("button[data-tab]");
    if (!buttons.length) return;

    const panels = {
      dashboard: document.getElementById("tab-panel-dashboard"),
      weatherlink: document.getElementById("tab-panel-weatherlink"),
    };

    // Clases visuales de Tailwind para cada estado
    const clasesActivo = ["border-primary", "text-primary", "bg-white/60", "font-bold", "is-active"];
    const clasesInactivo = ["border-transparent", "text-gray-500", "font-medium"];

    function activate(tabKey) {
      if (!panels[tabKey]) return;

      // 2. Actualizamos el estado visual y atributos ARIA de los botones
      buttons.forEach((btn) => {
        const isActive = btn.dataset.tab === tabKey;
        btn.setAttribute("aria-selected", isActive ? "true" : "false");

        if (isActive) {
          btn.classList.remove(...clasesInactivo);
          btn.classList.add(...clasesActivo);
        } else {
          btn.classList.remove(...clasesActivo);
          btn.classList.add(...clasesInactivo);
        }
      });

      // 3. Mostramos u ocultamos los paneles
      Object.entries(panels).forEach(([key, panel]) => {
        if (!panel) return;
        panel.classList.toggle("hidden", key !== tabKey);
      });

      // 4. Recalcular gráficos si volvemos o iniciamos en el Dashboard
      if (tabKey === "dashboard") {
        window.requestAnimationFrame(() => {
          window.dispatchEvent(new Event("resize"));
        });
      }

      // 5. Opcional: recordar la pestaña seleccionada al recargar
      try {
        localStorage.setItem("sedir_clima_tab_activa", tabKey);
      } catch (e) {}
    }

    buttons.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        activate(btn.dataset.tab);
      });
    });

    // Vista inicial: verificamos si el usuario dejó abierta una pestaña antes, o abrimos dashboard por defecto
    try {
      const guardada = localStorage.getItem("sedir_clima_tab_activa");
      if (guardada && panels[guardada]) {
        activate(guardada);
        return;
      }
    } catch (e) {}

    activate("dashboard");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initClimaSubnav);
  } else {
    initClimaSubnav();
  }
})();