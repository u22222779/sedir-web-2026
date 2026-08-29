/* SECTION: Generic Component Loader */

// Los <script> insertados via innerHTML NO se ejecutan automaticamente
// (restriccion de seguridad de los navegadores). Esta funcion los busca
// dentro del contenedor recien inyectado y los vuelve a crear como
// elementos <script> nuevos, lo que si dispara su ejecucion.
function executeInjectedScripts(container) {
  var scripts = Array.from(container.querySelectorAll("script"));

  scripts.forEach(function (oldScript) {
    var newScript = document.createElement("script");

    Array.from(oldScript.attributes).forEach(function (attr) {
      newScript.setAttribute(attr.name, attr.value);
    });

    newScript.textContent = oldScript.textContent;
    oldScript.parentNode.replaceChild(newScript, oldScript);
  });
}

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
    executeInjectedScripts(target);
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
        var yaHidratado = target.classList.contains('navbar-loaded') && target.innerHTML.trim() !== '';

        try {
          if (yaHidratado) {
            // Un <script> inline ya pintó el navbar desde sessionStorage antes de que
            // este archivo (deferred) corriera: no lo volvemos a tocar, cero parpadeo.
            // Solo refrescamos la caché en segundo plano por si el navbar cambió.
            fetch(componentPath).then(function (response) {
              if (response.ok) {
                response.text().then(function (html) {
                  sessionStorage.setItem('sedirNavbarHTML', html);
                });
              }
            }).catch(function () {});
          } else {
            var cachedNavbar = sessionStorage.getItem('sedirNavbarHTML');

            if (cachedNavbar) {
              // Ya lo tenemos en esta sesión: se pinta al instante, sin fetch y sin parpadeo
              target.innerHTML = cachedNavbar;
              executeInjectedScripts(target);
              target.classList.remove('navbar-loading');
              target.classList.add('navbar-loaded');

              // Refresca la caché en segundo plano por si el navbar cambió
              fetch(componentPath).then(function (response) {
                if (response.ok) {
                  response.text().then(function (html) {
                    sessionStorage.setItem('sedirNavbarHTML', html);
                  });
                }
              }).catch(function () {});
            } else {
              target.classList.add('navbar-loading');
              var response = await fetch(componentPath);
              if (!response.ok) {
                throw new Error("No se pudo cargar " + componentPath);
              }

              var html = await response.text();
              target.innerHTML = html;
              executeInjectedScripts(target);
              sessionStorage.setItem('sedirNavbarHTML', html);

              requestAnimationFrame(function () {
                target.classList.remove('navbar-loading');
                target.classList.add('navbar-loaded');
              });
            }
          }
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
        executeInjectedScripts(target);
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
    var cachedNavbar = sessionStorage.getItem('sedirNavbarHTML');

    if (cachedNavbar) {
      container.innerHTML = cachedNavbar;
      executeInjectedScripts(container);
      container.classList.remove('navbar-loading');
      container.classList.add('navbar-loaded');

      fetch('/components/navbar.html').then(function (response) {
        if (response.ok) {
          response.text().then(function (html) {
            sessionStorage.setItem('sedirNavbarHTML', html);
          });
        }
      }).catch(function () {});
      return;
    }

    container.classList.add('navbar-loading');
    var response = await fetch('/components/navbar.html');
    if (!response.ok) throw new Error('No se pudo cargar /components/navbar.html');
    var html = await response.text();
    container.innerHTML = html;
    executeInjectedScripts(container);
    sessionStorage.setItem('sedirNavbarHTML', html);

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