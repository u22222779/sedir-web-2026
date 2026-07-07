window.initNavbar = function () {
  const menuBtn = document.getElementById("menu-btn");
  const closeBtn = document.getElementById("close-menu");
  const mobileMenu = document.getElementById("mobile-menu");
  const overlay = document.getElementById("overlay");
  const mobileMenuBtn = document.getElementById("mobileMenuBtn");
  const mobileSubmenu = document.getElementById("mobileSubmenu");

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
};