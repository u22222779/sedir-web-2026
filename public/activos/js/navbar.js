window.initNavbar = function () {
  const menuBtn = document.getElementById("menu-btn");
  const mobileMenu = document.getElementById("mobile-menu");
  const overlay = document.getElementById("overlay");
  const mobileMenuBtn = document.getElementById("mobileMenuBtn");
  const mobileSubmenu = document.getElementById("mobileSubmenu");
  const navbarShell = document.querySelector(".navbar-shell");

  // ===============================
  // Marcar página activa
  // ===============================
  const marcarLinkActivo = () => {
    const rutaActual = window.location.pathname;
    const links = document.querySelectorAll(".navbar-link[href]");

    links.forEach(link => {
      const href = link.getAttribute("href");
      let esActivo = false;

      if (href === "/" && (rutaActual === "/" || rutaActual === "/index.html")) {
        esActivo = true;
      } else if (href && href !== "/" && rutaActual.includes(href.split("/").pop())) {
        esActivo = true;
      }

      link.classList.toggle("is-active", esActivo);
    });
  };

  marcarLinkActivo();

  if (!menuBtn) return;

  // ===============================
  // Abrir menú
  // ===============================
menuBtn.onclick = () => {

  const abierto = menuBtn.classList.contains("active");


  if(abierto){

    cerrarMenu();

  } else {

    mobileMenu.style.right = "0";

    overlay.classList.remove("hidden");

    navbarShell.classList.add("menu-open");

    menuBtn.classList.add("active");

  }

};

  // ===============================
  // Cerrar menú
  // ===============================
  const cerrarMenu = () => {

    mobileMenu.style.right = "-100%";
    overlay.classList.add("hidden");

    navbarShell.classList.remove("menu-open");

    // Regresar X a hamburguesa
    menuBtn.classList.remove("active");

  };

  // ===============================
  // Submenú móvil
  // ===============================
  if (mobileMenuBtn) {

    mobileMenuBtn.onclick = () => {

      mobileSubmenu.classList.toggle("hidden");

    };

  }

  // ===============================
  // Navbar sólido al hacer scroll
  // ===============================
  if (navbarShell && !navbarShell.dataset.scrollBound) {

    navbarShell.dataset.scrollBound = "true";

    const SCROLL_THRESHOLD = 60;

    const actualizarEstadoScroll = () => {

      navbarShell.classList.toggle(
        "is-scrolled",
        window.scrollY > SCROLL_THRESHOLD
      );

    };

    actualizarEstadoScroll();

    window.addEventListener(
      "scroll",
      actualizarEstadoScroll,
      { passive: true }
    );

  }

};