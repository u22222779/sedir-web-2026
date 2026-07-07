/* SECTION: Climate Dashboard Rendering */
function compileTemplate(templateHtml, data) {
  return templateHtml.replace(/{{(\w+)}}/g, function (_, key) {
    return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : "";
  });
}

function renderClimateReasons() {
  var container = document.getElementById("clima-reasons-container");
  var template = document.getElementById("clima-reason-template");

  if (!container || !template || !Array.isArray(window.climaReasons)) {
    return;
  }

  container.innerHTML = window.climaReasons.map(function (reason) {
    return compileTemplate(template.innerHTML, reason);
  }).join("");
}

function renderClimateKpis() {
  var container = document.getElementById("clima-kpi-container");
  var template = document.getElementById("clima-kpi-template");

  if (!container || !template || !Array.isArray(window.climaKpis)) {
    return;
  }

  container.innerHTML = window.climaKpis.map(function (kpi) {
    return compileTemplate(template.innerHTML, kpi);
  }).join("");
}

function renderClimateHistory() {
  var container = document.getElementById("clima-history-body");
  var template = document.getElementById("clima-history-row-template");

  if (!container || !template || !Array.isArray(window.climaHistory)) {
    return;
  }

  container.innerHTML = window.climaHistory.map(function (row) {
    return compileTemplate(template.innerHTML, row);
  }).join("");
}

function initClimaPage() {
  renderClimateReasons();
  renderClimateKpis();
  renderClimateHistory();
}

window.renderClimateReasons = renderClimateReasons;
window.renderClimateKpis = renderClimateKpis;
window.renderClimateHistory = renderClimateHistory;
window.initClimaPage = initClimaPage;
