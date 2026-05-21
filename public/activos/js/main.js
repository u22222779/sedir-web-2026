/* SECTION: Tailwind Config */
window.tailwind = window.tailwind || {};
window.tailwind.config = {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#00944a",
          dark: "#006a49",
          light: "#e6f4ed"
        },
        secondary: {
          DEFAULT: "#8c7855",
          dark: "#6e5e42"
        },
        dark: "#1a1a1a",
        gray: {
          50: "#f9fafb",
          100: "#f3f4f6",
          200: "#e5e7eb",
          800: "#1f2937",
          900: "#111827"
        }
      },
      fontFamily: {
        sans: ["Libre Franklin", "sans-serif"],
        display: ["Montserrat", "sans-serif"]
      }
    }
  }
};

/* SECTION: Component Loader */
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

/* SECTION: App Bootstrap */
async function initializePage() {
  await loadComponent("navbar-container", "/components/navbar.html");
  await loadComponent("hero-container", "/components/hero.html");
  await loadComponent("proyectos-container", "/components/proyectos.html");
  await loadComponent("contacto-container", "/components/contacto.html");
  await loadComponent("footer-container", "/components/footer.html");

  if (typeof window.initMenu === "function") {
    window.initMenu();
  }

  if (typeof window.initSlider === "function") {
    window.initSlider();
  }

  if (typeof window.initCounters === "function") {
    window.initCounters();
  }

  if (typeof window.initForm === "function") {
    window.initForm();
  }
}

document.addEventListener("DOMContentLoaded", initializePage);
