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

/* SECTION: App Bootstrap */
async function initializePage() {
  if (document.querySelector("[data-component]")) {
    await window.loadComponentsFromDataAttributes();
  } else if (typeof window.loadLegacyHomeComponents === "function") {
    await window.loadLegacyHomeComponents();
  }

  if (typeof window.initNavbar === "function") {
    window.initNavbar();
  } else if (typeof window.initMenu === "function") {
    window.initMenu();
  }

  if (typeof window.renderNoticiasCards === "function") {
    await window.renderNoticiasCards();
  }

  if (typeof window.renderProyectos === "function") {
    await window.renderProyectos();
  }

  if (typeof window.initFiltrosNoticias === "function") {
    window.initFiltrosNoticias();
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

  if (typeof window.initClimaPage === "function") {
    window.initClimaPage();
  }
}

document.addEventListener("DOMContentLoaded", initializePage);
