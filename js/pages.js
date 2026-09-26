/* Abdulgamid Parfum: код отдельных страниц (главная, каталог, страница аромата). */
(function () {
  'use strict';
  var A = window.AP;
  if (!A) return;
  var $ = A.$, $$ = A.$$, esc = A.esc;

  var FAMILIES = [
    ['oriental', 'Восточные'], ['woody', 'Древесные'], ['fougere', 'Фужерные'], ['fresh', 'Цитрусовые и водяные'],
    ['floral', 'Цветочные'], ['gourmand', 'Гурманские и фруктовые'], ['leather', 'Кожаные'], ['musk', 'Мускусные']
  ];
  var SEARCH_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>';

  function norm(s) { return String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/[’']/g, ''); }
  function notesText(p) {
    var n = p.nt ? [p.nt.t, p.nt.h, p.nt.b].join(' ') : (p.na || '');
    return n;
  }
  function hay(p) {
    if (!p._h) p._h = norm([p.b, p.n, p.fam, notesText(p), A.GENDER[p.g] || '', p.t === 'o' ? 'масло' : ''].join(' '));
    return p._h;
  }
  function revealCards(scope) {
    $$('.card', scope).forEach(function (c) { c.classList.add('rv'); });
    A.reveal(scope);
  }

  window.APPages = {
    /* ---------------- главная ---------------- */
    home: function () {
      var n = A.CAT.length;
      $$('[data-count]').forEach(function (el) { el.textContent = n; });
      $$('[data-count-word]').forEach(function (el) { el.textContent = A.plural(n, ['аромат', 'аромата', 'ароматов']); });

      var hv = $('#heroVial');
      if (hv) {
        hv.innerHTML = A.vial({ level: 0.02 });
        var svg = hv.firstChild;
        setTimeout(function () { A.setLevel(svg, 1); }, 500);
      }

      var bl = A.CAT.filter(function (p) { return p.bl; });
      var bg = $('#blindGrid');
      if (bg) { bg.innerHTML = bl.map(A.card).join(''); A.bindCards(bg); revealCards(bg); }

      var sg = A.CAT.filter(function (p) { return p.sg; })[0], box = $('#sig');
      if (box && sg) {
        var img = A.photo(sg);
        $('#sigMedia').innerHTML = img ? '<img src="' + img + '" alt="' + esc(A.fullName(sg)) + '" loading="lazy" decoding="async" width="600" height="750">' : '';
        $('#sigName').textContent = sg.n;
        $('#sigNotes').innerHTML = pyramid(sg);
        $('#sigAdd').addEventListener('click', function () { A.addToCart(sg.id, '5'); });
        $('#sigOpen').setAttribute('href', 'perfume.html?id=' + encodeURIComponent(sg.id));
      } else if (box) { box.hidden = true; }

      var counts = {};
      A.CAT.forEach(function (p) { if (p.b && p.b !== 'Abdulgamid') counts[p.b] = (counts[p.b] || 0) + 1; });
      var brands = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a] || a.localeCompare(b); });
      var bx = $('#brandList');
      if (bx) {
        bx.innerHTML = brands.slice(0, 12).map(function (b) {
          return '<a class="brand rv" href="catalog.html?b=' + encodeURIComponent(b) + '"><span class="brand__name">' + esc(b) + '</span><span class="brand__n">' + counts[b] + ' ' + A.plural(counts[b], ['аромат', 'аромата', 'ароматов']) + '</span><span class="brand__go" aria-hidden="true">→</span></a>';
        }).join('');
        var bm = $('#brandMore'); if (bm) bm.textContent = 'Все ' + brands.length + ' ' + A.plural(brands.length, ['бренд', 'бренда', 'брендов']) + ' в каталоге';
      }
    },

    /* ---------------- каталог ---------------- */
    catalog: function () {
      var PAGE = 24;
      var qs = new URLSearchParams(location.search);
      var st = { q: qs.get('q') || '', g: qs.get('g') || '', f: qs.get('f') || '', b: qs.get('b') || '', o: qs.get('o') === '1', s: qs.get('s') === 'az' ? 'az' : 'new', n: PAGE };
      var brands = {};
      A.CAT.forEach(function (p) { if (p.b) brands[p.b] = (brands[p.b] || 0) + 1; });
      var brandNames = Object.keys(brands).sort(function (a, b) { return a.localeCompare(b); });
      if (st.b && !brands[st.b]) st.b = '';

      var tools = $('#tools'), grid = $('#catGrid'), more = $('#catMore'), res = $('#resCount'), head = $('#catCount');
      tools.innerHTML =
        '<div class="tools__row"><div class="tools__search">' + SEARCH_ICON + '<label class="vh" for="q">Поиск по каталогу</label><input id="q" type="search" placeholder="Поиск: бренд, название, нота" autocomplete="off" value="' + esc(st.q) + '"></div>' +
        '<select id="fb" aria-label="Бренд"><option value="">Все бренды</option>' + brandNames.map(function (b) { return '<option value="' + esc(b) + '"' + (b === st.b ? ' selected' : '') + '>' + esc(b) + ' (' + brands[b] + ')</option>'; }).join('') + '</select>' +
        '<select id="fs" aria-label="Сортировка"><option value="new"' + (st.s === 'new' ? ' selected' : '') + '>Сначала новые</option><option value="az"' + (st.s === 'az' ? ' selected' : '') + '>По алфавиту</option></select></div>' +
        '<div class="tools__row"><span class="tools__label">Для кого</span><div class="chips" id="cg">' +
        [['', 'Все'], ['m', 'Мужские'], ['w', 'Женские'], ['u', 'Унисекс']].map(function (x) { return '<button type="button" class="pill" data-g="' + x[0] + '" aria-pressed="' + (st.g === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</div></div>' +
        '<div class="tools__row"><span class="tools__label">Семейство</span><div class="chips" id="cf">' +
        '<button type="button" class="pill" data-f="" aria-pressed="' + (!st.f && !st.o) + '">Все</button>' +
        FAMILIES.map(function (x) { return '<button type="button" class="pill" data-f="' + x[0] + '" aria-pressed="' + (st.f === x[0]) + '">' + x[1] + '</button>'; }).join('') +
        '<button type="button" class="pill" data-oil aria-pressed="' + st.o + '">Масла</button></div></div>';

      function match(p) {
        if (st.g && p.g !== st.g) return false;
        if (st.f && (p.tags || []).indexOf(st.f) < 0) return false;
        if (st.b && p.b !== st.b) return false;
        if (st.o && p.t !== 'o') return false;
        if (st.q) { var toks = norm(st.q).split(/\s+/).filter(Boolean), h = hay(p); for (var i = 0; i < toks.length; i++) if (h.indexOf(toks[i]) < 0) return false; }
        return true;
      }
      function sorted(list) {
        var idx = {}; A.CAT.forEach(function (p, i) { idx[p.id] = i; });
        var byOut = function (a, b) { return (a.out ? 1 : 0) - (b.out ? 1 : 0); };   /* «нет в наличии» уходят в конец */
        return list.slice().sort(st.s === 'az'
          ? function (a, b) { return byOut(a, b) || A.fullName(a).localeCompare(A.fullName(b)); }
          : function (a, b) { return byOut(a, b) || (a.dt < b.dt ? 1 : a.dt > b.dt ? -1 : idx[a.id] - idx[b.id]); });
      }
      function syncURL() {
        var u = new URLSearchParams();
        if (st.q) u.set('q', st.q); if (st.g) u.set('g', st.g); if (st.f) u.set('f', st.f); if (st.b) u.set('b', st.b); if (st.o) u.set('o', '1'); if (st.s !== 'new') u.set('s', st.s);
        var s = u.toString();
        try { history.replaceState(null, '', location.pathname + (s ? '?' + s : '')); } catch (e) { /* file:// и т. п. */ }
      }
      function paint(reveal) {
        var list = sorted(A.CAT.filter(match)), shown = list.slice(0, st.n);
        var w = A.plural(list.length, ['аромат', 'аромата', 'ароматов']);
        res.textContent = list.length === A.CAT.length ? 'Показаны все ' + list.length + ' ' + w : 'Найдено: ' + list.length + ' ' + w;
        if (!list.length) {
          grid.innerHTML = '';
          more.innerHTML = '<div class="empty"><span class="liq-oriental">' + A.vial({ level: .02, labels: false }) + '</span><p>Под эти фильтры ничего не нашлось. Сбросьте их или напишите нам: подберём аромат по описанию.</p><div class="empty__act"><button type="button" class="btn btn--primary" id="reset">Сбросить фильтры</button><a class="btn btn--ghost" target="_blank" rel="noopener" href="' + A.waLink('Здравствуйте! Не нашёл(а) на сайте нужный аромат: ' + (st.q || '')) + '">Спросить в WhatsApp</a></div></div>';
          return;
        }
        grid.innerHTML = shown.map(A.card).join('');
        more.innerHTML = list.length > shown.length ? '<button type="button" class="btn btn--ghost btn--lg" id="showMore">Показать ещё ' + Math.min(PAGE, list.length - shown.length) + '</button><p class="fine">Показано ' + shown.length + ' из ' + list.length + '</p>' : '';
        if (reveal) revealCards(grid);
      }
      function update() { st.n = PAGE; syncURL(); paint(false); }

      var qEl = $('#q'), qT;
      qEl.addEventListener('input', function () { clearTimeout(qT); qT = setTimeout(function () { st.q = qEl.value.trim(); update(); }, 160); });
      $('#fb').addEventListener('change', function (e) { st.b = e.target.value; update(); });
      $('#fs').addEventListener('change', function (e) { st.s = e.target.value; update(); });
      $('#cg').addEventListener('click', function (e) {
        var b = e.target.closest('[data-g]'); if (!b) return;
        st.g = b.getAttribute('data-g'); $$('#cg .pill').forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); update();
      });
      $('#cf').addEventListener('click', function (e) {
        var b = e.target.closest('.pill'); if (!b) return;
        if (b.hasAttribute('data-oil')) { st.o = !st.o; b.setAttribute('aria-pressed', st.o); }
        else { st.f = b.getAttribute('data-f'); $$('#cf [data-f]').forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); }
        $('#cf [data-f=""]').setAttribute('aria-pressed', !st.f && !st.o);
        update();
      });
      more.addEventListener('click', function (e) {
        if (e.target.closest('#showMore')) {
          var before = grid.children.length; st.n += PAGE; paint(false);
          $$('.card', grid).slice(before).forEach(function (c) { c.classList.add('rv'); }); A.reveal(grid);
          var first = grid.children[before]; if (first) { var a = first.querySelector('.card__name a'); if (a) a.focus({ preventScroll: true }); }
        }
        if (e.target.closest('#reset')) {
          st = { q: '', g: '', f: '', b: '', o: false, s: 'new', n: PAGE };
          qEl.value = ''; $('#fb').value = ''; $('#fs').value = 'new';
          $$('#cg .pill').forEach(function (x) { x.setAttribute('aria-pressed', x.getAttribute('data-g') === ''); });
          $$('#cf .pill').forEach(function (x) { x.setAttribute('aria-pressed', x.getAttribute('data-f') === ''); });
          update();
        }
      });
      A.bindCards(grid);
      if (head) head.textContent = A.CAT.length;
      paint(true);
    },

    /* ---------------- страница аромата ---------------- */
    perfume: function () {
      var id = new URLSearchParams(location.search).get('id'), p = A.byId[id], mount = $('#pf');
      if (!p) {
        document.title = 'Аромат не найден | Abdulgamid Parfum';
        mount.innerHTML = '<div class="empty"><span class="liq-oriental">' + A.vial({ level: .02, labels: false }) + '</span><h1 class="h2">Такого аромата в каталоге нет</h1><p>Возможно, ссылка устарела. Откройте каталог или напишите нам: найдём нужный.</p><div class="empty__act"><a class="btn btn--primary" href="catalog.html">Открыть каталог</a><a class="btn btn--ghost" target="_blank" rel="noopener" href="' + A.waLink('Здравствуйте! Ищу аромат: ') + '">Написать в WhatsApp</a></div></div>';
        return;
      }
      var name = A.fullName(p);
      document.title = name + ': распив и заказ | Abdulgamid Parfum';
      var md = $('meta[name="description"]');
      if (md) md.setAttribute('content', name + ': ' + (p.d || A.famText(p) || 'нишевая парфюмерия') + ' Распив 3, 5, 10 мл и флакон, заявка в WhatsApp.');
      var ogt = $('meta[property="og:title"]'); if (ogt) ogt.setAttribute('content', name + ' | Abdulgamid Parfum');

      var v = '5', q = 1, img = A.photo(p);
      var media = img ? '<img src="' + img + '" alt="' + esc(name) + '" width="800" height="1000">' : '<div class="card__art ' + A.liqClass(p) + '">' + A.vial({ level: .7, labels: false }) + '</div>';
      var tags = [];
      if (p.g) tags.push(A.GENDER[p.g]);
      if (p.fam) tags.push(A.cap(p.fam));
      if (p.y) tags.push(p.y + ' год');
      if (p.c) tags.push(p.c);
      if (p.t === 'o') tags.push('Масло');
      var vols = A.VOLS.map(function (x) {
        return '<label class="vopt"><input type="radio" name="pfv" value="' + x.key + '"' + (x.key === v ? ' checked' : '') + '><span>' + x.label + '</span></label>';
      }).join('');
      var brandLink = p.b ? '<a href="catalog.html?b=' + encodeURIComponent(p.b) + '">' + esc(p.b) + '</a><span aria-hidden="true">/</span>' : '';
      var pyr = pyramid(p);
      var hasInfo = p.d || pyr;
      var buyHtml = p.out
        ? '<div class="pf__buy pf__out rv"><strong>Сейчас нет в наличии</strong><p>Напишите нам, и мы скажем, когда аромат появится.</p><a class="btn btn--primary btn--lg" target="_blank" rel="noopener" href="' + esc(A.waLink('Здравствуйте! Хочу узнать, когда будет в наличии: ' + name)) + '">Узнать о наличии в WhatsApp</a></div>'
        : '<div class="pf__buy rv"><div class="pf__buy-top"><div class="pf__vial ' + A.liqClass(p) + '" id="pfVial">' + A.vial({ level: .5, labels: false }) + '</div><div class="pf__fact"><strong id="pfA"></strong><span id="pfB"></span></div></div>' +
          '<div class="vols vols--lg" role="radiogroup" aria-label="Объём">' + vols + '</div>' +
          '<div class="pf__row"><div class="qty"><button type="button" id="qm" aria-label="Меньше">−</button><output id="qv" aria-label="Количество">1</output><button type="button" id="qp" aria-label="Больше">+</button></div>' +
          '<button type="button" class="btn btn--primary btn--lg" id="pfAdd">В корзину</button></div>' +
          '<div class="pf__row"><a class="btn btn--ghost" id="pfWa" target="_blank" rel="noopener" href="#">Заказать сразу в WhatsApp</a><span class="price" id="pfPrice"></span></div>' +
          (p.t === 'o' ? '<p class="fine">Масло: доступные объёмы и цену подскажем в WhatsApp.</p>' : '') + '</div>';

      mount.innerHTML =
        '<nav class="crumbs" aria-label="Хлебные крошки"><a href="index.html">Главная</a><span aria-hidden="true">/</span><a href="catalog.html">Каталог</a><span aria-hidden="true">/</span>' + brandLink + '<span aria-current="page">' + esc(p.n) + '</span></nav>' +
        '<div class="pf"><div class="pf__media">' + media + '</div><div class="pf__info">' +
        '<div><p class="pf__brand rv">' + esc(p.b || 'Abdulgamid Parfum') + '</p><h1 class="h1 rv">' + esc(p.n) + '</h1></div>' +
        (tags.length ? '<div class="tags rv">' + tags.map(function (t) { return '<span class="tag">' + esc(t) + '</span>'; }).join('') + '</div>' : '') +
        '<p class="pf__desc rv">' + (p.d ? esc(p.d) : (hasInfo ? '' : 'Подробного описания пока нет: расскажем про аромат и подберём объём в WhatsApp.')) + '</p>' +
        (pyr ? '<div class="rv">' + pyr + '</div>' : '') +
        buyHtml +
        (p.ig ? '<p class="pf__src rv">Информация из <a class="link" target="_blank" rel="noopener" href="https://www.instagram.com/p/' + esc(p.ig) + '/">поста магазина в Instagram</a></p>' : '') +
        '</div></div>' +
        '<section class="related" id="related" hidden><div class="sec__head"><p class="eyebrow">Похожие</p><h2 class="h2">Из того же <em>семейства</em></h2></div><div class="grid" id="relGrid"></div></section>';

      var svg = $('#pfVial .vial');
      function upd() {
        if (p.out) return;
        var vo = A.VOLS.filter(function (x) { return x.key === v; })[0];
        A.setLevel(svg, vo.level);
        $('#pfA').textContent = vo.puffs ? '≈ ' + vo.puffs + ' пшиков' : 'Полный флакон';
        $('#pfB').textContent = vo.span ? 'Хватит примерно на ' + vo.span : 'Объём и цену подскажем в WhatsApp';
        $('#qv').textContent = q;
        $('#pfPrice').innerHTML = A.priceHtml(p, v);
        $('#pfWa').setAttribute('href', A.waLink('Здравствуйте! Хочу заказать: ' + A.lineText(name, v, q, p)));
      }
      mount.addEventListener('change', function (e) { if (e.target.name === 'pfv') { v = e.target.value; upd(); } });
      if (!p.out) {
        $('#qm').addEventListener('click', function () { q = Math.max(1, q - 1); upd(); });
        $('#qp').addEventListener('click', function () { q = Math.min(99, q + 1); upd(); });
        $('#pfAdd').addEventListener('click', function () { A.addToCart(p.id, v, q); });
        upd();
      }

      var main = (p.tags || [])[0];
      var rel = A.CAT.filter(function (x) { return x.id !== p.id && main && (x.tags || []).indexOf(main) > -1 && x.p; }).slice(0, 4);
      if (rel.length) {
        var sec = $('#related'); sec.hidden = false;
        $('#relGrid').innerHTML = rel.map(A.card).join(''); A.bindCards($('#relGrid')); revealCards($('#relGrid'));
      }
    },

    raspiv: function () { /* страница статичная; атомайзеры подставляет app.js */ }
  };

  /* ноты: пирамида «верх / сердце / база» или одной строкой */
  function pyramid(p) {
    if (p.nt) {
      var rows = [['Верхние ноты', p.nt.t], ['Ноты сердца', p.nt.h], ['Базовые ноты', p.nt.b]].filter(function (r) { return r[1]; });
      return '<dl class="pyramid">' + rows.map(function (r) { return '<div><dt>' + r[0] + '</dt><dd>' + esc(r[1]) + '</dd></div>'; }).join('') + '</dl>';
    }
    if (p.na) return '<dl class="pyramid"><div><dt>Ноты</dt><dd>' + esc(p.na) + '</dd></div></dl>';
    return '';
  }
})();
