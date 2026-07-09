window.initNavbar = function () {
  const menuBtn = document.getElementById("menu-btn");
  const closeBtn = document.getElementById("close-menu");
  const mobileMenu = document.getElementById("mobile-menu");
  const overlay = document.getElementById("overlay");
  const mobileMenuBtn = document.getElementById("mobileMenuBtn");
  const mobileSubmenu = document.getElementById("mobileSubmenu");
  const navbarShell = document.querySelector(".navbar-shell");

  if (!menuBtn) return;

  menuBtn.onclick = () => {
    mobileMenu.style.right = "0";
    overlay.classList.remove("hidden");
  };

  closeBtn.onclick = () => {
    mobileMenu.style.right = "-100%";
    overlay.classList.add("hidden");
  };

  overlay.onclick = () => {
    mobileMenu.style.right = "-100%";
    overlay.classList.add("hidden");
  };

  if (mobileMenuBtn) {
    mobileMenuBtn.onclick = () => {
      mobileSubmenu.classList.toggle("hidden");
    };
  }

  // Navbar transparente -> blanco sólido al hacer scroll (~60px).
  // El CSS (navbar.css) ya define ambos estados vía la clase .is-scrolled;
  // aquí solo la activamos/desactivamos según la posición del scroll.
  if (navbarShell && !navbarShell.dataset.scrollBound) {
    navbarShell.dataset.scrollBound = "true";

    const SCROLL_THRESHOLD = 60;

    const actualizarEstadoScroll = () => {
      const debeEstarSolido = window.scrollY > SCROLL_THRESHOLD;
      navbarShell.classList.toggle("is-scrolled", debeEstarSolido);
    };

    // Estado inicial correcto sin esperar al primer scroll
    // (evita parpadeo si la página ya carga con scroll restaurado).
    actualizarEstadoScroll();

    window.addEventListener("scroll", actualizarEstadoScroll, { passive: true });
  }
};