/* SECTION: Noticias Content */
var noticiasCards = [
  {
    articleClass: "bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-100 overflow-hidden flex flex-col md:col-span-2 relative group cursor-pointer border-dashed border-2 border-blue-400 news-card news-card--featured",
    categoryKey: "Apicultura",
    category: "Apicultura",
    image: "",
    alt: "Apicultura",
    imageClass: "w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300",
    date: "15 Abril 2025",
    headingTag: "h2",
    headingClass: "text-xl font-bold font-montserrat text-gray-900 mb-3 group-hover:text-sedir-green transition-colors",
    title: "Más de 200 apicultores del valle reciben capacitación técnica en manejo de colmenas",
    excerptClass: "text-gray-600 text-sm mb-6 flex-grow line-clamp-3",
    excerpt: "En el marco del proyecto PROAPICOLA, familias productoras de los distritos de Moro, Cáceres del Perú y Nepeña participaron en talleres intensivos sobre manejo sanitario, cosecha de miel y fortalecimiento de capacidades organizacionales para mejorar su competitividad en el mercado regional.",
    linkClass: "readmore-link font-semibold text-sm flex items-center gap-1 transition-colors group-hover:gap-2"
  },
  {
    articleClass: "bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-100 overflow-hidden flex flex-col relative group cursor-pointer border-dashed border-2 border-blue-400 news-card",
    categoryKey: "Agricultura",
    category: "Agricultura",
    image: "",
    alt: "Irrigation techniques",
    imageClass: "w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300",
    date: "28 Marzo 2025",
    headingTag: "h3",
    headingClass: "text-lg font-bold font-montserrat text-gray-900 mb-3 group-hover:text-sedir-green transition-colors line-clamp-2",
    title: "Agricultores del valle adoptan técnicas de riego tecnificado",
    excerptClass: "text-gray-600 text-sm mb-6 flex-grow line-clamp-3",
    excerpt: "Con el apoyo de SEDIR, 350 familias implementaron sistemas de riego por goteo que reducen el consumo de agua hasta en un 40%, mejorando la productividad de sus cultivos de maíz y frutales.",
    linkClass: "readmore-link font-semibold text-sm flex items-center gap-1 transition-colors group-hover:gap-2"
  },
  {
    articleClass: "bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-100 overflow-hidden flex flex-col relative group cursor-pointer border-dashed border-2 border-blue-400 news-card",
    categoryKey: "Capacitación",
    category: "Capacitación",
    image: "",
    alt: "Community Workshop",
    imageClass: "w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300",
    date: "10 Marzo 2025",
    headingTag: "h3",
    headingClass: "text-lg font-bold font-montserrat text-gray-900 mb-3 group-hover:text-sedir-green transition-colors line-clamp-2",
    title: "Taller de liderazgo comunitario fortalece a mujeres rurales",
    excerptClass: "text-gray-600 text-sm mb-6 flex-grow line-clamp-3",
    excerpt: "SEDIR capacitó a 80 lideresas del Valle de Nepeña en gestión organizacional, derechos ciudadanos y desarrollo de emprendimientos locales, impulsando su participación activa en la toma de decisiones comunales.",
    linkClass: "readmore-link font-semibold text-sm flex items-center gap-1 transition-colors group-hover:gap-2"
  },
  {
    articleClass: "bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-100 overflow-hidden flex flex-col relative group cursor-pointer border-dashed border-2 border-blue-400 news-card",
    categoryKey: "Comunidad",
    category: "Comunidad",
    image: "",
    alt: "Signing agreement",
    imageClass: "w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300",
    date: "20 Febrero 2025",
    headingTag: "h3",
    headingClass: "text-lg font-bold font-montserrat text-gray-900 mb-3 group-hover:text-sedir-green transition-colors line-clamp-2",
    title: "SEDIR firma convenio con municipalidad para ampliar cobertura",
    excerptClass: "text-gray-600 text-sm mb-6 flex-grow line-clamp-3",
    excerpt: "El acuerdo permitirá extender los programas de desarrollo rural a 12 nuevas comunidades, beneficiando a más de 800 familias adicionales en zonas de difícil acceso del distrito de Nepeña.",
    linkClass: "readmore-link font-semibold text-sm flex items-center gap-1 transition-colors group-hover:gap-2"
  },
  {
    articleClass: "bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-100 overflow-hidden flex flex-col relative group cursor-pointer border-dashed border-2 border-blue-400 news-card",
    categoryKey: "Agricultura",
    category: "Agricultura",
    image: "",
    alt: "Organic farming inspection",
    imageClass: "w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300",
    date: "5 Febrero 2025",
    headingTag: "h3",
    headingClass: "text-lg font-bold font-montserrat text-gray-900 mb-3 group-hover:text-sedir-green transition-colors line-clamp-2",
    title: "Productores orgánicos del valle obtienen certificación nacional",
    excerptClass: "text-gray-600 text-sm mb-6 flex-grow line-clamp-3",
    excerpt: "Gracias al acompañamiento técnico de SEDIR, 45 productores de espárragos y palta obtuvieron la certificación orgánica del SENASA, abriendo puertas a mercados de exportación con mejores precios.",
    linkClass: "text-sedir-green font-semibold text-sm flex items-center gap-1 hover:text-sedir-dark-green transition-colors group-hover:gap-2"
  }
];

function compileNoticiasTemplate(templateHtml, data) {
  return templateHtml.replace(/{{(\w+)}}/g, function (_, key) {
    return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : "";
  });
}

async function renderNoticiasCards() {
  var container = document.getElementById("news-cards-container");
  var templateEl = document.getElementById("news-card-template");

  if (!container || !templateEl) {
    return;
  }

  // Use DOM template cloning to avoid HTML-escaping and allow attribute/text replacements
  var fragment = document.createDocumentFragment();

  noticiasCards.forEach(function (card) {
    var clone = document.importNode(templateEl.content, true);

    // Replace tokens in text nodes and attributes within the clone
    var walker = document.createTreeWalker(clone, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, null, false);
    var node = walker.nextNode();
    while (node) {
      if (node.nodeType === Node.TEXT_NODE) {
        node.nodeValue = node.nodeValue.replace(/{{(\w+)}}/g, function (_, key) {
          return Object.prototype.hasOwnProperty.call(card, key) ? card[key] : '';
        });
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        // Replace in attributes
        Array.from(node.attributes).forEach(function (attr) {
          if (/{{\w+}}/.test(attr.value)) {
            attr.value = attr.value.replace(/{{(\w+)}}/g, function (_, key) {
              return Object.prototype.hasOwnProperty.call(card, key) ? card[key] : '';
            });
          }
        });
      }
      node = walker.nextNode();
    }

    // Now replace heading placeholder elements with real heading tags
    var headingPlaceholders = clone.querySelectorAll('[data-heading-tag]');
    headingPlaceholders.forEach(function (ph) {
      var tag = ph.getAttribute('data-heading-tag') || 'h3';
      var cls = ph.getAttribute('data-heading-class') || '';
      var text = ph.textContent || '';
      var h = document.createElement(tag);
      if (cls) h.className = cls;
      h.textContent = text;
      ph.parentNode.replaceChild(h, ph);
    });

    fragment.appendChild(clone);
  });

  // Clear and append
  container.innerHTML = "";
  container.appendChild(fragment);
}

window.renderNoticiasCards = renderNoticiasCards;
window.noticiasCards = noticiasCards;
