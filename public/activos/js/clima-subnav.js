/**
 * ============================================================================
 * SUBNAV — SECCIÓN "ESTACIÓN EN VIVO" (clima.html)
 * ============================================================================
 * Controla el toggle entre las dos vistas de la estación en vivo:
 *   1) "Ahora mismo"       → dashboard dinámico (ApexCharts + gauges + SVG)
 *   2) "Panel WeatherLink" → panel embebido oficial (iframe)
 *
 * El dashboard ("Ahora mismo") es siempre la vista inicial, porque
 * clima-dashboard.js instancia sus gráficos ApexCharts en ese contenedor
 * apenas carga la página: si arrancara oculto, ApexCharts mediría un
 * ancho de 0px. Al volver a esta pestaña se dispara un "resize" para que
 * los charts ya existentes recalculen su tamaño correctamente.
 * ============================================================================
 */

(function () {
  "use strict";

  function initClimaSubnav() {
    const buttons = document.querySelectorAll(".clima-tab-btn[data-tab]");
    if (!buttons.length) return;

    const panels = {
      dashboard: document.getElementById("tab-panel-dashboard"),
      weatherlink: document.getElementById("tab-panel-weatherlink"),
    };

    function activate(tabKey) {
      if (!panels[tabKey]) return;

      buttons.forEach((btn) => {
        const isActive = btn.dataset.tab === tabKey;
        btn.classList.toggle("is-active", isActive);
        btn.setAttribute("aria-selected", isActive ? "true" : "false");
      });

      Object.entries(panels).forEach(([key, panel]) => {
        if (!panel) return;
        panel.classList.toggle("hidden", key !== tabKey);
      });

      // Los gráficos ApexCharts del dashboard quedan "congelados" en 0px de
      // ancho mientras su contenedor tiene display:none. Al reactivar la
      // pestaña, forzamos que recalculen su tamaño con el ancho real.
      if (tabKey === "dashboard") {
        window.requestAnimationFrame(() => {
          window.dispatchEvent(new Event("resize"));
        });
      }
    }

    buttons.forEach((btn) => {
      btn.addEventListener("click", () => activate(btn.dataset.tab));
    });

    // Vista inicial: siempre "Ahora mismo"
    activate("dashboard");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initClimaSubnav);
  } else {
    initClimaSubnav();
  }
})();
