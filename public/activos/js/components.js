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
