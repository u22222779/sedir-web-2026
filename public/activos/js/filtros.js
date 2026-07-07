/* SECTION: Noticias Filters */
function initFiltrosNoticias() {
  var container = document.getElementById("filtros-container");
  var cards = Array.from(document.querySelectorAll("[data-news-card]"));

  if (!container || !cards.length) {
    return;
  }

  var buttons = Array.from(container.querySelectorAll("[data-filter]"));

  function setActiveButton(activeFilter) {
    buttons.forEach(function (button) {
      var filter = button.getAttribute("data-filter") || "all";
      button.classList.toggle("is-active", filter === activeFilter);
      button.setAttribute("aria-pressed", filter === activeFilter ? "true" : "false");
    });
  }

  function applyFilter(activeFilter) {
    var normalizedFilter = String(activeFilter || "all").toLowerCase();

    cards.forEach(function (card) {
      var category = String(card.getAttribute("data-category") || "").toLowerCase();
      var shouldShow = normalizedFilter === "all" || category === normalizedFilter;
      card.classList.toggle("hidden", !shouldShow);
    });
  }

  buttons.forEach(function (button) {
    button.addEventListener("click", function () {
      var selectedFilter = button.getAttribute("data-filter") || "all";
      setActiveButton(selectedFilter);
      applyFilter(selectedFilter);
    });
  });

  setActiveButton("all");
  applyFilter("all");
}

window.initFiltrosNoticias = initFiltrosNoticias;
