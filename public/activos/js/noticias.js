/* SECTION: Noticias Content */
function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function stripHtml(value) {
  return String(value ?? '')
    // Convierte saltos de bloque comunes en espacios para no pegar palabras
    .replace(/<\/(p|div|br|li|h[1-6])\s*>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    // Elimina cualquier otra etiqueta HTML
    .replace(/<[^>]*>/g, '')
    // Decodifica entidades HTML más comunes
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Normaliza espacios múltiples
    .replace(/\s+/g, ' ')
    .trim();
}

function getCategoryLabel(item) {
  return String(item && (item.nombre_categoria || item.categoria || item.id_categoria_noticia) || 'General').trim() || 'General';
}

function getCategoryKey(item) {
  return String(item && item.id_categoria_noticia ? item.id_categoria_noticia : getCategoryLabel(item)).trim().toLowerCase();
}

function getLatestNoticiasByCategory(items) {
  var latestByCategory = new Map();

  items
    .slice()
    .sort(function (a, b) {
      var dateA = a && a.fecha ? new Date(a.fecha).getTime() : 0;
      var dateB = b && b.fecha ? new Date(b.fecha).getTime() : 0;

      if (dateA !== dateB) {
        return dateB - dateA;
      }

      var idA = Number(a && a.id ? a.id : 0);
      var idB = Number(b && b.id ? b.id : 0);

      return idB - idA;
    })
    .forEach(function (item) {
      var categoryKey = getCategoryKey(item);

      if (!latestByCategory.has(categoryKey)) {
        latestByCategory.set(categoryKey, item);
      }
    });

  return Array.from(latestByCategory.values());
}

function toNoticiasCards(items) {
  return items.map(function (item) {
    var categoryLabel = getCategoryLabel(item);
    var categoryKey = getCategoryKey(item);

    return {
      id: item.id,
      articleClass: 'bg-white rounded-[30px] shadow-sm hover:shadow-md transition-shadow border border-gray-100 overflow-hidden flex flex-col relative group cursor-pointer news-card',
      categoryKey: categoryKey,
      category: categoryLabel,
      image: item.imagen_portada || '',
      alt: item.titulo || 'Noticia',
      imageClass: 'w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300',
      date: item.fecha ? new Date(item.fecha).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
      headingTag: 'h3',
      headingClass: 'text-lg font-bold font-montserrat text-gray-900 mb-3 group-hover:text-sedir-green transition-colors line-clamp-2',
      title: item.titulo || '',
      excerptClass: 'text-gray-600 text-sm mb-6 flex-grow line-clamp-3',
      excerpt: stripHtml(item.contenido).slice(0, 160),
      linkClass: 'readmore-link font-semibold text-sm flex items-center gap-1 transition-colors group-hover:gap-2'
    };
  });
}

function renderHomeNoticias(items) {
  var container = document.getElementById('home-news-container');
  var noticiasDestacadas = getLatestNoticiasByCategory(items);

  if (!container) {
    return;
  }

  container.innerHTML = noticiasDestacadas.map(function (item) {
    var image = item.imagen_portada || '/activos/img_noticias/notapalta00428114_18-08-25.jpg';
    var dateLabel = item.fecha ? new Date(item.fecha).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Sin fecha';
    var categoryLabel = getCategoryLabel(item);

    return `
      <article class="bg-white rounded-[30px] overflow-hidden border border-gray-200 shadow-sm hover:shadow-lg transition-all group flex flex-col">
        <div class="relative h-56 overflow-hidden">
          <img alt="${escapeHtml(item.titulo || 'Noticia')}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src="${escapeHtml(image)}" />
        </div>
        <div class="p-6 flex flex-col flex-grow">
          <div class="flex items-center gap-4 mb-4">
            <span class="text-xs text-gray-500 font-medium">${escapeHtml(dateLabel)}</span>
            <span class="text-xs category-badge px-3 py-1 rounded-full font-medium">${escapeHtml(categoryLabel)}</span>
          </div>
          <h3 class="text-lg font-bold text-gray-900 mb-3 leading-snug">${escapeHtml(item.titulo || '')}</h3>
          <p class="text-gray-600 text-sm mb-6 flex-grow line-clamp-3">${escapeHtml(stripHtml(item.contenido).slice(0, 160))}</p>
          <a class="readmore-link font-semibold text-sm flex items-center gap-2 group-hover:gap-3 transition-all" href="/paginas/noticia-detalle.html?id=${encodeURIComponent(item.id)}">Leer más</a>
        </div>
      </article>
    `;
  }).join('');
}

async function renderNoticiasCards() {
  var response = await fetch('/api/noticias');
  var noticias = response.ok ? await response.json() : [];
  var container = document.getElementById("news-cards-container");
  var templateEl = document.getElementById("news-card-template");

  renderHomeNoticias(noticias);

  if (!container || !templateEl) {
    return;
  }

  var noticiasCards = toNoticiasCards(noticias);

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

  // Attach click handlers: open modal and show video-sized view
  // Map noticias to DOM nodes in the container
  var cardNodes = container.querySelectorAll('[data-news-card]');
  cardNodes.forEach(function (node, idx) {
    var source = noticias[idx] || {};
    node.dataset.id = source.id || '';
    node.addEventListener('click', function (e) {
      // Si el clic fue directo sobre el link "Leer más", que siga su propio href.
      if (e.target.closest('a')) {
        return;
      }
      e.preventDefault();
      if (node.dataset.id) {
        window.location.href = '/paginas/noticia-detalle.html?id=' + encodeURIComponent(node.dataset.id);
      }
    });
  });
}

window.renderNoticiasCards = renderNoticiasCards;