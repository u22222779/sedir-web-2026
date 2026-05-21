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
}

window.initNavbar = initNavbar;
window.initMenu = initNavbar;
