/* SECTION: Navbar */
function initNavbar() {
  var menuBtn = document.getElementById("menu-btn");
  var closeBtn = document.getElementById("close-menu");
  var mobileMenu = document.getElementById("mobile-menu");
  var overlay = document.getElementById("overlay");

  if (!menuBtn || !closeBtn || !mobileMenu || !overlay) {
    return;
  }

  var openMenu = function () {
    mobileMenu.style.right = "0";
    overlay.classList.remove("hidden");
  };

  var closeMenu = function () {
    mobileMenu.style.right = "-100%";
    overlay.classList.add("hidden");
  };

  menuBtn.addEventListener("click", openMenu);
  closeBtn.addEventListener("click", closeMenu);
  overlay.addEventListener("click", closeMenu);

  document.querySelectorAll("#mobile-menu a").forEach(function (link) {
    link.addEventListener("click", closeMenu);
  });

  var normalizePath = function (value) {
    var path = value.split("?")[0].split("#")[0];

    if (path.endsWith("/")) {
      return path.slice(0, -1);
    }

    return path;
  };

  var currentPath = normalizePath(window.location.pathname || "/");

  document.querySelectorAll(".navbar-link").forEach(function (link) {
    var target = link.getAttribute("href");

    if (!target || target === "#") {
      return;
    }

    var linkUrl = new URL(target, window.location.origin);
    var linkPath = normalizePath(linkUrl.pathname);

    if (linkPath === currentPath) {
      link.classList.add("is-active");
      link.setAttribute("aria-current", "page");
    }
  });
}

window.initNavbar = initNavbar;
window.initMenu = initNavbar;
