(function () {
  'use strict';

  // Carga una hoja de estilos si no existe
  function loadStylesheet(id, href, attributes = {}) {
    if (document.querySelector(`link[data-${id}="true"]`)) {
      return;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.setAttribute(`data-${id}`, 'true');
    
    Object.keys(attributes).forEach(key => {
      link.setAttribute(key, attributes[key]);
    });
    
    document.head.appendChild(link);
  }

  // Carga Bootstrap
  function ensureBootstrapStylesheet() {
    if (document.querySelector('link[href*="bootstrap"]')) {
      return;
    }

    loadStylesheet('bootstrap-css', 
      'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css',
      {
        'integrity': 'sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH',
        'crossorigin': 'anonymous'
      }
    );
  }

  // Carga Font Awesome
  function ensureIconFontStylesheet() {
    if (document.querySelector('link[href*="font-awesome"]')) {
      return;
    }

    loadStylesheet('icon-font-awesome',
      'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css'
    );
  }

  // Carga el CSS del footer
  function ensureFooterStylesheet() {
    loadStylesheet('shared-footer-css', '/activos/css/footer.css');
  }

  // Carga un componente HTML
  function loadComponent(containerId, componentPath, componentName) {
    const container = document.getElementById(containerId);
    if (!container) {
      return;
    }

    fetch(componentPath, { cache: 'no-store' })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Error ${response.status}: No se pudo cargar ${componentPath}`);
        }
        return response.text();
      })
      .then(html => {
        container.innerHTML = html;
      })
      .catch(error => {
        console.error(`Error cargando ${componentName}:`, error);
        container.innerHTML = `<p style="color: red; padding: 1rem;">Error al cargar ${componentName}</p>`;
      });
  }

  // Carga el footer
  function loadSharedFooter() {
    loadComponent('shared-footer', '/components/footer.html', 'footer');
  }

  // Carga la sección de iconos de familia
  function loadIconFamilySection() {
    loadComponent('shared-icon-family', '/components/icon-family.html', 'icon-family');
  }

  // Inicialización cuando el DOM esté listo
  document.addEventListener('DOMContentLoaded', function () {
    ensureBootstrapStylesheet();
    ensureFooterStylesheet();
    ensureIconFontStylesheet();
    loadIconFamilySection();
    loadSharedFooter();
  });
})();