/* SECTION: Mobile Menu (solo utilidades de enlace activo; abrir/cerrar lo maneja navbar.js) */
function initMenu() {

  var normalizePath = function (value) {
    var path = value.split("?")[0].split("#")[0];

    if (path === "" || path === "/") {
      return "/index.html";
    }

    if (path.endsWith("/")) {
      return path.slice(0, -1);
    }

    return path;
  };

  var normalizeHash = function (value) {
    if (!value) {
      return "";
    }

    return value.startsWith("#") ? value : "#" + value;
  };

  var applyActiveLinks = function () {
    var currentPath = normalizePath(window.location.pathname || "/");
    var currentHash = normalizeHash(window.location.hash || "");

    document.querySelectorAll(".navbar-link").forEach(function (link) {
      link.classList.remove("is-active");
      link.removeAttribute("aria-current");

      var target = link.getAttribute("href");

      if (!target || target === "#") {
        return;
      }

      var linkUrl = new URL(target, window.location.origin);
      var linkPath = normalizePath(linkUrl.pathname);
      var linkHash = normalizeHash(linkUrl.hash);

      var isActive = false;

      if (linkPath === currentPath) {
        if (linkHash) {
          isActive = linkHash === currentHash;
        } else if (linkPath === "/index.html") {
          isActive = currentHash === "";
        } else {
          isActive = true;
        }
      }

      if (isActive) {
        link.classList.add("is-active");
        link.setAttribute("aria-current", "page");
      }
    });

    var ctaLink = document.querySelector('.navbar-cta[href]');

    if (ctaLink) {
      ctaLink.removeAttribute('aria-current');
      ctaLink.style.boxShadow = '';

      var ctaUrl = new URL(
        ctaLink.getAttribute('href'),
        window.location.origin
      );

      var ctaPath = normalizePath(ctaUrl.pathname);

      if (ctaPath === currentPath) {
        ctaLink.setAttribute('aria-current', 'page');
        ctaLink.style.boxShadow = '0 0 0 2px #006a49 inset';
      }
    }
  };

  applyActiveLinks();
  window.addEventListener('hashchange', applyActiveLinks);
}

window.initMenu = initMenu;