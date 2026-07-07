/* SECTION: Generic Component Loader */
async function loadComponent(targetId, componentPath) {
  var target = document.getElementById(targetId);
  if (!target) {
    return;
  }

  try {
    var response = await fetch(componentPath);
    if (!response.ok) {
      throw new Error("No se pudo cargar " + componentPath);
    }

    target.innerHTML = await response.text();
  } catch (error) {
    console.error(error);
  }
}

async function loadComponentsFromDataAttributes() {
  var targets = Array.from(document.querySelectorAll("[data-component]"));

  await Promise.all(
    targets.map(async function (target) {
      var componentPath = target.getAttribute("data-component");
      if (!componentPath) {
        return;
      }

      // Special handling for navbar to avoid FOUC: reserve space, hide, then fade-in
      if (target.id === "navbar-container" || (componentPath && componentPath.indexOf('navbar.html') !== -1)) {
        try {
          target.classList.add('navbar-loading');
          var response = await fetch(componentPath);
          if (!response.ok) {
            throw new Error("No se pudo cargar " + componentPath);
          }

          target.innerHTML = await response.text();

          requestAnimationFrame(function () {
            target.classList.remove('navbar-loading');
            target.classList.add('navbar-loaded');
          });
        } catch (error) {
          console.error(error);
        }

        // Ensure mobile menu handlers are bound after navbar HTML is injected
        requestAnimationFrame(function () {
          if (typeof window.initMenu === "function") {
            window.initMenu();
          } else if (typeof window.initNavbar === "function") {
            window.initNavbar();
          }
        });

        return;
      }

      try {
        var response = await fetch(componentPath);
        if (!response.ok) {
          throw new Error("No se pudo cargar " + componentPath);
        }

        target.innerHTML = await response.text();
      } catch (error) {
        console.error(error);
      }
    })
  );
}

// Optional explicit loader for navbar when called directly
async function loadNavbar() {
  var container = document.getElementById('navbar-container');
  if (!container) return;

  try {
    container.classList.add('navbar-loading');
    var response = await fetch('/components/navbar.html');
    if (!response.ok) throw new Error('No se pudo cargar /components/navbar.html');
    container.innerHTML = await response.text();

    requestAnimationFrame(function () {
      container.classList.remove('navbar-loading');
      container.classList.add('navbar-loaded');
    });
  } catch (err) {
    console.error('Error cargando navbar:', err);
  }
}

window.loadNavbar = loadNavbar;

async function loadLegacyHomeComponents() {
  await loadComponent("navbar-container", "/components/navbar.html");
  await loadComponent("hero-container", "/components/hero.html");
  await loadComponent("proyectos-container", "/components/proyectos.html");
  await loadComponent("contacto-container", "/components/contacto.html");
  await loadComponent("footer-container", "/components/footer.html");
}

window.loadComponent = loadComponent;
window.loadComponentsFromDataAttributes = loadComponentsFromDataAttributes;
window.loadLegacyHomeComponents = loadLegacyHomeComponents;
