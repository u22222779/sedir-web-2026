/* SECTION: Noticias Content */
function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function toNoticiasCards(items) {
  return items.map(function (item) {
    return {
      articleClass: 'bg-white rounded-[30px] shadow-sm hover:shadow-md transition-shadow border border-gray-100 overflow-hidden flex flex-col relative group cursor-pointer news-card',
      categoryKey: item.id_categoria_noticia || 'General',
      category: item.id_categoria_noticia || 'General',
      image: item.imagen_portada || '',
      alt: item.titulo || 'Noticia',
      imageClass: 'w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300',
      date: item.fecha ? new Date(item.fecha).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
      headingTag: 'h3',
      headingClass: 'text-lg font-bold font-montserrat text-gray-900 mb-3 group-hover:text-sedir-green transition-colors line-clamp-2',
      title: item.titulo || '',
      excerptClass: 'text-gray-600 text-sm mb-6 flex-grow line-clamp-3',
      excerpt: item.contenido || '',
      linkClass: 'readmore-link font-semibold text-sm flex items-center gap-1 transition-colors group-hover:gap-2'
    };
  });
}

function renderHomeNoticias(items) {
  var container = document.getElementById('home-news-container');

  if (!container) {
    return;
  }

  container.innerHTML = items.map(function (item) {
    var image = item.imagen_portada || '/activos/img_noticias/notapalta00428114_18-08-25.jpg';
    var dateLabel = item.fecha ? new Date(item.fecha).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Sin fecha';

    if (item.facebook_reel_url) {
      // embed Facebook Reel via iframe (URL should be public)
      const encoded = encodeURIComponent(item.facebook_reel_url);
      const iframeSrc = `https://www.facebook.com/plugins/video.php?href=${encoded}&show_text=0&width=560`;
      return `
      <article class="bg-white rounded-[30px] overflow-hidden border border-gray-200 shadow-sm hover:shadow-lg transition-all group flex flex-col">
        <div class="relative h-56 overflow-hidden">
          <iframe class="w-full h-full" src="${iframeSrc}" style="border:none;overflow:hidden" scrolling="no" frameborder="0" allowfullscreen allow="autoplay; clipboard-write; encrypted-media; picture-in-picture"></iframe>
        </div>
        <div class="p-6 flex flex-col flex-grow">
          <div class="flex items-center gap-4 mb-4">
            <span class="text-xs text-gray-500 font-medium">${escapeHtml(dateLabel)}</span>
            <span class="text-xs category-badge px-3 py-1 rounded-full font-medium">${escapeHtml(item.id_categoria_noticia || 'General')}</span>
          </div>
          <h3 class="text-lg font-bold text-gray-900 mb-3 leading-snug">${escapeHtml(item.titulo || '')}</h3>
          <p class="text-gray-600 text-sm mb-6 flex-grow line-clamp-3">${escapeHtml((item.contenido || '').slice(0, 160))}</p>
          <a class="readmore-link font-semibold text-sm flex items-center gap-2 group-hover:gap-3 transition-all" href="/paginas/noticia.html">Leer más</a>
        </div>
      </article>
      `;
    }

    return `
      <article class="bg-white rounded-[30px] overflow-hidden border border-gray-200 shadow-sm hover:shadow-lg transition-all group flex flex-col">
        <div class="relative h-56 overflow-hidden">
          <img alt="${escapeHtml(item.titulo || 'Noticia')}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src="${escapeHtml(image)}" />
        </div>
        <div class="p-6 flex flex-col flex-grow">
          <div class="flex items-center gap-4 mb-4">
            <span class="text-xs text-gray-500 font-medium">${escapeHtml(dateLabel)}</span>
            <span class="text-xs category-badge px-3 py-1 rounded-full font-medium">${escapeHtml(item.id_categoria_noticia || 'General')}</span>
          </div>
          <h3 class="text-lg font-bold text-gray-900 mb-3 leading-snug">${escapeHtml(item.titulo || '')}</h3>
          <p class="text-gray-600 text-sm mb-6 flex-grow line-clamp-3">${escapeHtml((item.contenido || '').slice(0, 160))}</p>
          <a class="readmore-link font-semibold text-sm flex items-center gap-2 group-hover:gap-3 transition-all" href="/paginas/noticia.html">Leer más</a>
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
    if (source.facebook_reel_url) node.dataset.reel = source.facebook_reel_url;
    node.dataset.title = source.titulo || '';
    node.dataset.content = source.contenido || '';
    node.dataset.image = source.imagen_portada || '';
    node.addEventListener('click', function (e) {
      e.preventDefault();
      openNewsModal(node.dataset);
    });
  });
}

function openNewsModal(data) {
  var modal = document.getElementById('news-modal');
  var content = document.getElementById('news-modal-content');
  if (!modal || !content) return;
  content.innerHTML = '';

  // Preferred: show embedded facebook reel if present
  if (data.reel) {
    var encoded = encodeURIComponent(data.reel);
    var iframe = document.createElement('iframe');
    iframe.setAttribute('src', 'https://www.facebook.com/plugins/video.php?href=' + encoded + '&show_text=0&width=900');
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('allow', 'autoplay; clipboard-write; encrypted-media; picture-in-picture');
    iframe.className = 'w-full h-full';
    content.appendChild(iframe);
  } else {
    // Display image and content sized to video aspect ratio
    var wrapper = document.createElement('div');
    wrapper.className = 'w-full h-full flex flex-col';
    var img = document.createElement('img');
    img.src = data.image || '';
    img.alt = data.title || '';
    img.className = 'w-full h-full object-cover';
    wrapper.appendChild(img);
    content.appendChild(wrapper);
  }

  modal.classList.remove('hidden');
}

// Close modal handlers
document.addEventListener('click', function (e) {
  var modal = document.getElementById('news-modal');
  if (!modal || modal.classList.contains('hidden')) return;
  var target = e.target;
  if (target.id === 'news-modal-close' || target.id === 'news-modal-backdrop') {
    modal.classList.add('hidden');
    var content = document.getElementById('news-modal-content');
    if (content) content.innerHTML = '';
  }
});

window.renderNoticiasCards = renderNoticiasCards;
