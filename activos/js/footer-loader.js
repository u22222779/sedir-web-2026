(function () {
  var siteRoot = '/';

  function ensureFooterStylesheet() {
    var existingLink = document.querySelector('link[data-shared-footer-css="true"]');
    if (existingLink) {
      return;
    }

    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = siteRoot + 'activos/css/footer.css';
    link.setAttribute('data-shared-footer-css', 'true');
    document.head.appendChild(link);
  }

  function loadSharedFooter() {
    var container = document.getElementById('shared-footer');
    if (!container) {
      return;
    }

    fetch(siteRoot + 'footer.html')
      .then(function (response) {
        if (!response.ok) {
          throw new Error('No se pudo cargar footer.html: ' + response.status);
        }
        return response.text();
      })
      .then(function (html) {
        container.innerHTML = html;
      })
      .catch(function (error) {
        console.error(error);
      });
  }

  document.addEventListener('DOMContentLoaded', function () {
    ensureFooterStylesheet();
    loadSharedFooter();
  });
})();
