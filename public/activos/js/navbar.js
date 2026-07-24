window.initNavbar = function () {
  const menuBtn = document.getElementById("menu-btn");
  const mobileMenu = document.getElementById("mobile-menu");
  const overlay = document.getElementById("overlay");
  const mobileMenuBtn = document.getElementById("mobileMenuBtn");
  const mobileSubmenu = document.getElementById("mobileSubmenu");
  const navbarShell = document.querySelector(".navbar-shell");

  // ===============================
  // 1. Marcar página activa
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
  // 2. Cerrar menú (función auxiliar)
  // ===============================
  const cerrarMenu = () => {
    if (mobileMenu) mobileMenu.style.right = "-100%";
    if (overlay) overlay.classList.add("hidden");
    if (navbarShell) navbarShell.classList.remove("menu-open");
    menuBtn.classList.remove("active");
    document.body.style.overflow = ""; // Restaura el scroll del cuerpo
  };

  // ===============================
  // 3. Abrir / Cerrar menú
  // ===============================
  menuBtn.onclick = () => {
    const abierto = menuBtn.classList.contains("active");

    if (abierto) {
      cerrarMenu();
    } else {
      if (mobileMenu) mobileMenu.style.right = "0";
      if (overlay) overlay.classList.remove("hidden");
      if (navbarShell) navbarShell.classList.add("menu-open");
      menuBtn.classList.add("active");
      document.body.style.overflow = "hidden"; // Bloquea el scroll de fondo
    }
  };

  // Cerrar si tocan el fondo oscuro (overlay)
  if (overlay) {
    overlay.onclick = cerrarMenu;
  }

  // ===============================
  // 4. Submenú móvil
  // ===============================
  if (mobileMenuBtn && mobileSubmenu) {
    mobileMenuBtn.onclick = () => {
      mobileSubmenu.classList.toggle("hidden");
    };
  }

  // ===============================
  // 5. Navbar inteligente: Sólido + Ocultar al bajar
  // ===============================
  if (navbarShell && !navbarShell.dataset.scrollBound) {
    navbarShell.dataset.scrollBound = "true";

    const SCROLL_THRESHOLD = 60;
    let lastScrollY = window.scrollY;

    const actualizarEstadoScroll = () => {
      const currentScrollY = window.scrollY;

      // Estado 1: Cambiar a fondo sólido o sombra al pasar el umbral
      navbarShell.classList.toggle("is-scrolled", currentScrollY > SCROLL_THRESHOLD);

      // Estado 2: Ocultar al bajar, mostrar al subir (sólo si el menú móvil está cerrado)
      if (!navbarShell.classList.contains("menu-open")) {
        if (currentScrollY > lastScrollY && currentScrollY > 120) {
          // Bajando: esconde el navbar
          navbarShell.classList.add("navbar-hidden");
        } else {
          // Subiendo: muestra el navbar
          navbarShell.classList.remove("navbar-hidden");
        }
      }

      lastScrollY = currentScrollY;
    };

    window.addEventListener("scroll", actualizarEstadoScroll, { passive: true });
  }
};