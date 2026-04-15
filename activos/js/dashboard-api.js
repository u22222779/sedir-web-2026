(function () {
  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function renderProduccion(lista) {
    var container = document.getElementById('dashboard-produccion');
    if (!container || !Array.isArray(lista) || lista.length === 0) {
      return;
    }

    var maxToneladas = Math.max.apply(null, lista.map(function (item) {
      return item.toneladas;
    }));

    container.innerHTML = lista.map(function (item) {
      var width = clamp((item.toneladas / maxToneladas) * 100, 8, 100);
      return [
        '<div>',
        '  <div class="eh-043"><span class="eh-044">' + item.cultivo + '</span><span class="eh-045">' + item.toneladas + ' t</span></div>',
        '  <div class="eh-046"><div style="height:6px;border-radius:4px;background:var(--sedir-green);width:' + width.toFixed(1) + '%;"></div></div>',
        '</div>'
      ].join('');
    }).join('');
  }

  function renderClima(clima) {
    var fields = [
      { id: 'temperatura', label: 'Temperatura' },
      { id: 'humedad', label: 'Humedad' },
      { id: 'viento', label: 'Viento' },
      { id: 'precipitacion', label: 'Precipitacion' }
    ];

    fields.forEach(function (field) {
      var root = document.getElementById('clima-' + field.id);
      if (!root || !clima[field.id]) {
        return;
      }

      root.querySelector('[data-role="label"]').textContent = field.label;
      root.querySelector('[data-role="valor"]').textContent = clima[field.id].valor;
      root.querySelector('[data-role="detalle"]').textContent = clima[field.id].detalle;
    });
  }

  function renderUpdatedAt(isoDate) {
    var el = document.getElementById('dashboard-updated-at');
    if (!el || !isoDate) {
      return;
    }

    var formatted = new Date(isoDate).toLocaleString('es-PE');
    el.textContent = 'Ultima actualizacion: ' + formatted;
  }

  function renderError(message) {
    var el = document.getElementById('dashboard-error');
    if (!el) {
      return;
    }

    el.textContent = message;
    el.hidden = false;
  }

  function loadDashboardData() {
    fetch('/api/dashboard')
      .then(function (response) {
        if (!response.ok) {
          throw new Error('Error al consultar /api/dashboard: ' + response.status);
        }
        return response.json();
      })
      .then(function (payload) {
        if (!payload || !payload.data) {
          throw new Error('La API de dashboard devolvio un formato invalido.');
        }

        renderProduccion(payload.data.produccion || []);
        renderClima(payload.data.clima || {});
        renderUpdatedAt(payload.updatedAt);
      })
      .catch(function (error) {
        console.error(error);
        renderError('No se pudieron cargar datos del dashboard. Verifica que el backend este ejecutandose.');
      });
  }

  document.addEventListener('DOMContentLoaded', loadDashboardData);
})();