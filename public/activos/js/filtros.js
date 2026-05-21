/* SECTION: Noticias Filters */
function initFiltrosNoticias() {
  var container = document.getElementById("filtros-container");
  var cards = Array.from(document.querySelectorAll("[data-news-card]"));

  if (!container || !cards.length) {
    return;
  }

  var buttons = Array.from(container.querySelectorAll("[data-filter]"));
  var activeClasses = "bg-sedir-green text-white px-4 py-1.5 rounded-full text-sm font-semibold hover:bg-sedir-dark-green transition-colors";
  var inactiveClasses = "bg-white border border-gray-300 text-gray-600 px-4 py-1.5 rounded-full text-sm font-semibold hover:border-sedir-green hover:text-sedir-green transition-colors";

  function setActiveButton(activeFilter) {
    buttons.forEach(function (button) {
      var filter = button.getAttribute("data-filter") || "all";
      button.className = filter === activeFilter ? activeClasses : inactiveClasses;
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
