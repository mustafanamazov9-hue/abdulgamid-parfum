/* Abdulgamid Parfum: общее для всех страниц.
   Атомайзер (SVG), корзина (localStorage), панель корзины, форма заявки в WhatsApp, появление через блюр, шапка. */
(function () {
  'use strict';

  var SHOP = window.SHOP || {};
  /* каталог: js/data.js, поверх него /api/catalog.js (правки из админки); скрытые ароматы на сайте не показываем */
  var CAT = (window.CATALOG || []).filter(function (p) { return p && !p.hide; });
  var byId = {};
  CAT.forEach(function (p) { byId[p.id] = p; });

  /* внутри Telegram Mini App (скрипт подключает js/tg-boot.js); вне Телеграма TG = null и сайт работает как обычно */
  var TG = (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData) ? window.Telegram.WebApp : null;

  var GENDER = { m: 'Мужской', w: 'Женский', u: 'Унисекс' };
  var VOLS = SHOP.volumes || [];
  var VOL_LABEL = {};
  VOLS.forEach(function (v) { VOL_LABEL[v.key] = v.label; });
  var LIQ_ORDER = ['oriental', 'gourmand', 'leather', 'woody', 'floral', 'fresh', 'musk', 'fougere'];

  /* ---------- утилиты ---------- */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function plural(n, f) {
    var a = Math.abs(n) % 100, b = a % 10;
    if (a > 10 && a < 20) return f[2];
    if (b > 1 && b < 5) return f[1];
    if (b === 1) return f[0];
    return f[2];
  }
  function cap(s) { s = s || ''; return s.charAt(0).toUpperCase() + s.slice(1); }
  function fullName(p) { return (p.b ? p.b + ' ' : '') + p.n; }
  function famText(p) {
    var a = [];
    if (p.g && GENDER[p.g]) a.push(GENDER[p.g]);
    if (p.fam) a.push(a.length ? p.fam : cap(p.fam));
    return a.join(' / ');
  }
  function liqClass(p) {
    var tags = (p && p.tags) || [];
    for (var i = 0; i < LIQ_ORDER.length; i++) if (tags.indexOf(LIQ_ORDER[i]) > -1) return 'liq-' + LIQ_ORDER[i];
    return 'liq-oriental';
  }
  function waLink(text) { return 'https://wa.me/' + SHOP.phone + (text ? '?text=' + encodeURIComponent(text) : ''); }
  function fmtRub(n) { return Number(n).toLocaleString('ru-RU') + ' ₽'; }
  function unitPrice(p, v) {
    var x = p && p.pr && p.pr[v];
    return typeof x === 'number' && x > 0 ? x : null;
  }
  /* путь к фото для атрибута src (уже экранирован): файл из img/p/ или загрузка из админки (/api/photo/...) */
  function photo(p) {
    if (!p || !p.p) return '';
    return esc(/^(\/|https?:)/.test(p.p) ? p.p : 'img/p/' + p.p);
  }

  /* ---------- атомайзер ---------- */
  var vialN = 0;
  function vial(o) {
    o = o || {};
    var n = ++vialN, lv = o.level == null ? 0.5 : o.level, labels = o.labels !== false, ticks = '', i, y, long;
    var body = 'M66 96Q66 84 78 84L122 84Q134 84 134 96L134 292Q134 306 120 306L80 306Q66 306 66 292Z';
    for (i = 1; i <= 10; i++) {
      y = 304 - i * 20.6; long = i % 5 === 0;
      ticks += '<line class="tick" x1="138" x2="' + (long ? 152 : 145) + '" y1="' + y.toFixed(1) + '" y2="' + y.toFixed(1) + '"/>';
      if (long && labels) ticks += '<text class="tick-l" x="157" y="' + (y + 3).toFixed(1) + '">' + i + '</text>';
    }
    return '<svg class="vial' + (o.cls ? ' ' + o.cls : '') + '" viewBox="0 0 200 320" style="--lv:' + lv + '" aria-hidden="true" focusable="false">' +
      '<defs><linearGradient id="vg' + n + '" x1="0" x2="1"><stop offset="0" stop-color="#b98a30"/><stop offset=".42" stop-color="#f2d68c"/><stop offset="1" stop-color="#9f7222"/></linearGradient>' +
      '<clipPath id="vc' + n + '"><path d="' + body + '"/></clipPath></defs>' +
      '<g clip-path="url(#vc' + n + ')"><rect class="liq" x="60" y="98" width="80" height="210"/></g>' +
      '<path class="glass" d="' + body + '"/>' +
      '<path class="shine" d="M75 104V284"/><path class="shine" style="opacity:.5" d="M125 110V240"/>' +
      ticks +
      '<rect x="91" y="6" width="18" height="16" rx="3" fill="url(#vg' + n + ')"/>' +
      '<rect x="74" y="20" width="52" height="52" rx="7" fill="url(#vg' + n + ')"/>' +
      '<path class="cap-line" d="M84 27V65M92 27V65M100 27V65M108 27V65M116 27V65"/>' +
      '<rect x="70" y="70" width="60" height="12" rx="3" fill="url(#vg' + n + ')"/>' +
      '</svg>';
  }
  function setLevel(svg, lv) { if (svg) svg.style.setProperty('--lv', lv); }

  /* ---------- уведомление ---------- */
  var toastEl, toastT;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('is-on');
    clearTimeout(toastT);
    toastT = setTimeout(function () { toastEl.classList.remove('is-on'); }, 3200);
  }

  /* ---------- корзина ---------- */
  var KEY = 'ap-cart';
  var cart = loadCart();
  var listeners = [];

  function validItem(it) {
    return it && byId[it.id] && !byId[it.id].out && VOL_LABEL[it.v] && it.q > 0;
  }
  function loadCart() {
    try {
      var a = JSON.parse(localStorage.getItem(KEY) || '[]');
      return Array.isArray(a) ? a.filter(validItem).map(function (it) { return { id: it.id, v: String(it.v), q: Math.min(99, Math.round(it.q)) }; }) : [];
    } catch (e) { return []; }
  }
  function saveCart() { try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch (e) { /* без хранилища корзина живёт до перезагрузки */ } }
  function changed() { saveCart(); listeners.forEach(function (fn) { fn(); }); }
  function findItem(id, v) {
    for (var i = 0; i < cart.length; i++) if (cart[i].id === id && cart[i].v === v) return cart[i];
    return null;
  }
  function cartCount() { return cart.reduce(function (s, it) { return s + it.q; }, 0); }
  function addToCart(id, v, q, silent) {
    var p = byId[id]; v = String(v || '5'); q = q || 1;
    if (!p || !VOL_LABEL[v]) return;
    if (p.out) { toast('Этого аромата сейчас нет в наличии. Спросите в WhatsApp.'); return; }
    var it = findItem(id, v);
    if (it) it.q = Math.min(99, it.q + q); else cart.push({ id: id, v: v, q: Math.min(99, q) });
    changed();
    var btn = $('.hdr__cart');
    if (btn) { btn.classList.remove('bump'); void btn.offsetWidth; btn.classList.add('bump'); }
    if (!silent) toast('Добавлено: ' + fullName(p) + ', ' + VOL_LABEL[v]);
  }
  function setQty(id, v, q) {
    var it = findItem(id, v); if (!it) return;
    if (q < 1) return removeItem(id, v);
    it.q = Math.min(99, q); changed();
  }
  function setVol(id, v, nv) {
    var it = findItem(id, v); if (!it || v === nv) return;
    var other = findItem(id, nv);
    if (other) { other.q = Math.min(99, other.q + it.q); cart.splice(cart.indexOf(it), 1); } else it.v = nv;
    changed();
  }
  function removeItem(id, v) {
    var it = findItem(id, v); if (!it) return;
    cart.splice(cart.indexOf(it), 1); changed();
  }
  function clearCart() { cart = []; changed(); }
  function cartSum() {
    var sum = 0;
    for (var i = 0; i < cart.length; i++) {
      var u = unitPrice(byId[cart[i].id], cart[i].v);
      if (u == null) return null;
      sum += u * cart[i].q;
    }
    return cart.length ? sum : null;
  }

  /* ---------- панель корзины ---------- */
  var root, listEl, footEl, lastFocus;
  function buildCart() {
    root = document.createElement('div');
    root.className = 'cart-root';
    root.id = 'cartRoot';
    root.innerHTML =
      '<div class="cart__scrim" data-cart-close></div>' +
      '<aside class="cart__panel" role="dialog" aria-modal="true" aria-labelledby="cartTitle" tabindex="-1">' +
      '<div class="cart__head"><h2 id="cartTitle">Корзина</h2><button type="button" class="cart__x" data-cart-close aria-label="Закрыть корзину">×</button></div>' +
      '<div class="cart__list" id="cartList"></div><div class="cart__foot" id="cartFoot"></div></aside>';
    document.body.appendChild(root);
    toastEl = document.createElement('div');
    toastEl.className = 'toast'; toastEl.setAttribute('role', 'status'); toastEl.setAttribute('aria-live', 'polite');
    document.body.appendChild(toastEl);
    listEl = $('#cartList'); footEl = $('#cartFoot');

    root.addEventListener('click', function (e) {
      if (e.target.closest('[data-cart-close]')) return closeCart();
      var row = e.target.closest('.citem'); if (!row) {
        if (e.target.closest('[data-cart-checkout]')) { closeCart(); goOrder(); }
        return;
      }
      var id = row.getAttribute('data-id'), v = row.getAttribute('data-v'), it = findItem(id, v);
      if (e.target.closest('[data-rm]')) removeItem(id, v);
      else if (e.target.closest('[data-minus]')) it && setQty(id, v, it.q - 1);
      else if (e.target.closest('[data-plus]')) it && setQty(id, v, it.q + 1);
    });
    root.addEventListener('change', function (e) {
      var sel = e.target.closest('select'); if (!sel) return;
      var row = sel.closest('.citem'); setVol(row.getAttribute('data-id'), row.getAttribute('data-v'), sel.value);
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && root.classList.contains('is-open')) closeCart(); });
  }
  function itemThumb(p) {
    return photo(p) ? '<img src="' + photo(p) + '" alt="" width="64" height="80" loading="lazy" decoding="async">' : '<span class="' + liqClass(p) + '">' + vial({ level: .7, labels: false }) + '</span>';
  }
  function renderCart() {
    var n = cartCount();
    $$('[data-cart-count]').forEach(function (el) { el.textContent = n; });
    $$('[data-cart-open]').forEach(function (el) { el.setAttribute('aria-label', 'Корзина: ' + n + ' ' + plural(n, ['позиция', 'позиции', 'позиций'])); });
    if (!listEl) return;
    if (!cart.length) {
      listEl.innerHTML = '<div class="cart__empty"><span class="liq-oriental">' + vial({ level: .02, labels: false }) + '</span><p>Пока пусто. Выберите аромат в каталоге и добавьте нужный объём.</p><a class="btn btn--primary" href="catalog.html">Открыть каталог</a></div>';
      footEl.innerHTML = '';
      return;
    }
    listEl.innerHTML = cart.map(function (it) {
      var p = byId[it.id], u = unitPrice(p, it.v);
      var opts = VOLS.map(function (v) { return '<option value="' + v.key + '"' + (v.key === it.v ? ' selected' : '') + '>' + v.label + '</option>'; }).join('');
      return '<div class="citem" data-id="' + esc(it.id) + '" data-v="' + it.v + '">' +
        '<div class="citem__img">' + itemThumb(p) + '</div>' +
        '<div><div class="citem__b">' + esc(p.b) + '</div><div class="citem__n">' + esc(p.n) + '</div>' +
        '<div class="citem__ctl"><select aria-label="Объём: ' + esc(fullName(p)) + '">' + opts + '</select>' +
        '<div class="qty"><button type="button" data-minus aria-label="Меньше">−</button><output aria-label="Количество">' + it.q + '</output><button type="button" data-plus aria-label="Больше">+</button></div></div>' +
        '<div class="citem__price">' + (u ? fmtRub(u * it.q) : 'Цену подскажем в WhatsApp') + '</div></div>' +
        '<button type="button" class="citem__rm" data-rm aria-label="Удалить: ' + esc(fullName(p)) + '">×</button></div>';
    }).join('');
    var sum = cartSum();
    footEl.innerHTML =
      '<div class="cart__sum"><span>' + n + ' ' + plural(n, ['позиция', 'позиции', 'позиций']) + '</span>' + (sum != null ? '<b>' + fmtRub(sum) + '</b>' : '<span>Цену подскажем в WhatsApp</span>') + '</div>' +
      '<button type="button" class="btn btn--primary btn--lg" data-cart-checkout>Оформить заявку</button>' +
      '<button type="button" class="btn btn--ghost" data-cart-close>Продолжить выбор</button>';
  }
  var inertEls = [];
  function openCart() {
    if (!root || root.classList.contains('is-open')) return;
    lastFocus = document.activeElement;
    inertEls = $$('body > *').filter(function (el) { return el !== root && el !== toastEl && el.tagName !== 'SCRIPT'; });
    inertEls.forEach(function (el) { el.setAttribute('inert', ''); });
    root.classList.add('is-open');
    document.documentElement.style.overflow = 'hidden';
    var panel = $('.cart__panel', root);
    setTimeout(function () { (panel.querySelector('.cart__x') || panel).focus(); }, 60);
  }
  function closeCart() {
    if (!root || !root.classList.contains('is-open')) return;
    root.classList.remove('is-open');
    document.documentElement.style.overflow = '';
    inertEls.forEach(function (el) { el.removeAttribute('inert'); });
    inertEls = [];
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  function goOrder() {
    var o = $('#order'); if (!o) { location.href = 'index.html#order'; return; }
    o.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    setTimeout(function () { var f = $('#f-name'); if (f) f.focus({ preventScroll: true }); }, 500);
  }

  /* ---------- карточка товара ---------- */
  function card(p) {
    var media = photo(p)
      ? '<img src="' + photo(p) + '" alt="' + esc(fullName(p)) + '" loading="lazy" decoding="async" width="400" height="500">'
      : '<div class="card__art ' + liqClass(p) + '">' + vial({ level: .7, labels: false }) + '</div>';
    var tag = p.out ? 'Нет в наличии' : (p.t === 'o' ? 'Масло' : (p.sg ? 'Авторский' : ''));
    var vols = VOLS.map(function (v) {
      return '<label class="vopt"><input type="radio" name="v-' + esc(p.id) + '" value="' + v.key + '"' + (v.key === '5' ? ' checked' : '') + '><span>' + (v.key === 'full' ? 'Флакон' : v.key) + '</span></label>';
    }).join('');
    var buy = p.out
      ? '<div class="card__buy"><div class="card__foot"><span class="price">Нет в наличии</span><a class="btn btn--ghost btn--sm" target="_blank" rel="noopener" href="' + esc(waLink('Здравствуйте! Хочу узнать, когда будет в наличии: ' + fullName(p))) + '">Узнать о наличии</a></div></div>'
      : '<div class="card__buy"><div class="vols" role="radiogroup" aria-label="Объём: ' + esc(fullName(p)) + '">' + vols + '</div>' +
        '<div class="card__foot"><span class="price" data-price>' + priceHtml(p, '5') + '</span><button type="button" class="btn btn--primary btn--sm" data-add>В корзину</button></div></div>';
    return '<article class="card' + (p.out ? ' is-out' : '') + '" data-id="' + esc(p.id) + '">' +
      '<a class="card__media" href="perfume.html?id=' + encodeURIComponent(p.id) + '" tabindex="-1" aria-hidden="true">' + media + (tag ? '<span class="card__tag">' + tag + '</span>' : '') + '</a>' +
      '<div class="card__body"><p class="card__brand">' + esc(p.b || ' ') + '</p>' +
      '<h3 class="card__name"><a href="perfume.html?id=' + encodeURIComponent(p.id) + '">' + esc(p.n) + '</a></h3>' +
      '<p class="card__meta">' + esc(famText(p)) + '</p>' +
      buy + '</div></article>';
  }
  function priceHtml(p, v) {
    var u = unitPrice(p, v);
    return u ? '<b>' + fmtRub(u) + '</b>' : 'Цена по запросу';
  }
  /* общие обработчики карточек: выбор объёма и «В корзину», плюс общее имя перехода для фото */
  function bindCards(container) {
    container.addEventListener('click', function (e) {
      var b = e.target.closest('[data-add]');
      if (b) {
        var c = b.closest('.card'), r = c.querySelector('input:checked');
        addToCart(c.getAttribute('data-id'), r ? r.value : '5');
        b.classList.add('is-added'); var t = b.textContent; b.textContent = 'Добавлено';
        setTimeout(function () { b.classList.remove('is-added'); b.textContent = t; }, 1400);
        return;
      }
      var a = e.target.closest('.card__name a, .card__media');
      if (a) { var m = a.closest('.card').querySelector('.card__media'); if (m) m.style.viewTransitionName = 'pf-media'; }
    });
    container.addEventListener('change', function (e) {
      var r = e.target.closest('input[type="radio"]'); if (!r) return;
      var c = r.closest('.card'), pr = c.querySelector('[data-price]');
      if (pr) pr.innerHTML = priceHtml(byId[c.getAttribute('data-id')], r.value);
    });
  }

  /* ---------- сообщение в WhatsApp ---------- */
  function lineText(name, v, q, p) {
    var u = p ? unitPrice(p, v) : null;
    return name + ' / ' + (VOL_LABEL[v] || v) + ' / ' + q + ' шт.' + (u ? ' / ' + fmtRub(u * q) : '');
  }

  /* ---------- форма заявки ---------- */
  var form, lines = [], lineSeq = 0, doneBox, lastMsg = '', lastUrl = '';
  function newManual() { return { k: 'm' + (++lineSeq), cart: '', name: '', v: '5', q: 1 }; }
  function syncLines() {
    var manual = lines.filter(function (l) { return !l.cart; });
    var fromCart = cart.map(function (it) {
      var p = byId[it.id];
      return { k: 'c' + it.id + '|' + it.v, cart: it.id + '|' + it.v, name: fullName(p), v: it.v, q: it.q };
    });
    if (fromCart.length) manual = manual.filter(function (l) { return l.name.trim(); });
    lines = fromCart.concat(manual);
    if (!lines.length) lines.push(newManual());
  }
  function fld(id, label, inner, extra) {
    return '<div class="fld' + (extra || '') + '"><label for="' + id + '">' + label + '</label>' + inner + '<p class="err" id="' + id + '-err"></p></div>';
  }
  function renderLines() {
    var box = $('#lines'); if (!box) return;
    var act = document.activeElement, keep = null;
    if (act && box.contains(act) && act.closest('.line')) keep = { k: act.closest('.line').getAttribute('data-k'), c: act.className.split(' ')[0] };
    box.innerHTML = lines.map(function (l) {
      var opts = VOLS.map(function (v) { return '<option value="' + v.key + '"' + (v.key === l.v ? ' selected' : '') + '>' + v.label + '</option>'; }).join('');
      return '<div class="line" data-k="' + l.k + '">' +
        fld('ln-n-' + l.k, 'Название духов', '<input id="ln-n-' + l.k + '" class="ln-name" list="dlPerfumes" autocomplete="off" placeholder="Tom Ford Oud Wood" value="' + esc(l.name) + '"' + (l.cart ? ' readonly' : '') + '>') +
        fld('ln-v-' + l.k, 'Объём', '<select id="ln-v-' + l.k + '" class="ln-vol">' + opts + '</select>') +
        fld('ln-q-' + l.k, 'Шт.', '<input id="ln-q-' + l.k + '" class="ln-q" type="number" min="1" max="99" inputmode="numeric" value="' + l.q + '">') +
        '<button type="button" class="line__rm" aria-label="Убрать строку">×</button></div>';
    }).join('');
    if (keep) { var el = $('.line[data-k="' + keep.k + '"] .' + keep.c, box); if (el) el.focus({ preventScroll: true }); }
  }
  function buildOrder() {
    var mount = $('#orderMount'); if (!mount) return;
    mount.innerHTML =
      '<form class="order__form" id="orderForm" novalidate>' +
      fld('f-name', 'Имя', '<input id="f-name" name="name" autocomplete="name" placeholder="Как к вам обращаться">') +
      fld('f-phone', 'Телефон', '<input id="f-phone" name="tel" type="tel" inputmode="tel" autocomplete="tel" placeholder="+7 (___) ___-__-__">') +
      '<fieldset class="lines"><legend>Что заказать</legend><div id="lines"></div><div><button type="button" class="link" id="addLine">+ ещё аромат</button></div></fieldset>' +
      fld('f-comment', 'Комментарий <i>(необязательно)</i>', '<textarea id="f-comment" name="comment" placeholder="Пожелания, вопросы, удобное время"></textarea>') +
      '<button class="btn btn--primary btn--lg" type="submit">' + (TG ? 'Отправить заказ' : 'Отправить в WhatsApp') + '</button>' +
      '<p class="fine">' + (TG ? 'Заказ уйдёт продавцу в Telegram, мы свяжемся с вами по указанному номеру.' : 'Данные не сохраняются на сайте: они попадают только в ваше сообщение WhatsApp.') + '</p></form>' +
      '<div class="order__done" id="orderDone" hidden></div>' +
      '<datalist id="dlPerfumes">' + CAT.map(function (p) { return '<option value="' + esc(fullName(p)) + '">'; }).join('') + '</datalist>';
    form = $('#orderForm'); doneBox = $('#orderDone');
    syncLines(); renderLines();

    var phone = $('#f-phone');
    phone.addEventListener('input', function () {
      var d = phone.value.replace(/\D/g, '');
      if (!d) { phone.value = ''; return; }
      if (d.charAt(0) === '8') d = '7' + d.slice(1); else if (d.charAt(0) !== '7') d = '7' + d;
      d = d.slice(1, 11);
      var s = '+7';
      if (d.length) s += ' (' + d.slice(0, 3);
      if (d.length > 3) s += ') ' + d.slice(3, 6);
      if (d.length > 6) s += '-' + d.slice(6, 8);
      if (d.length > 8) s += '-' + d.slice(8, 10);
      phone.value = s;
    });
    form.addEventListener('input', function (e) {
      var row = e.target.closest('.line');
      if (row && e.target.classList.contains('ln-name')) { var l = lineByKey(row.getAttribute('data-k')); if (l) l.name = e.target.value; }
      var f = e.target.closest('.fld'); if (f && f.classList.contains('has-err')) clearErr(f);
    });
    form.addEventListener('change', function (e) {
      var row = e.target.closest('.line'); if (!row) return;
      var l = lineByKey(row.getAttribute('data-k')); if (!l) return;
      if (e.target.classList.contains('ln-vol')) {
        if (l.cart) { var pr = l.cart.split('|'); setVol(pr[0], pr[1], e.target.value); } else l.v = e.target.value;
      } else if (e.target.classList.contains('ln-q')) {
        var q = Math.max(1, Math.min(99, parseInt(e.target.value, 10) || 1));
        e.target.value = q;
        if (l.cart) { var pq = l.cart.split('|'); setQty(pq[0], pq[1], q); } else l.q = q;
      }
    });
    form.addEventListener('click', function (e) {
      if (e.target.closest('#addLine')) { lines.push(newManual()); renderLines(); var last = $$('.ln-name', form).pop(); if (last) last.focus(); return; }
      var rm = e.target.closest('.line__rm'); if (!rm) return;
      var l = lineByKey(rm.closest('.line').getAttribute('data-k')); if (!l) return;
      if (l.cart) { var pr = l.cart.split('|'); removeItem(pr[0], pr[1]); }
      else { lines.splice(lines.indexOf(l), 1); if (!lines.length) lines.push(newManual()); renderLines(); }
    });
    form.addEventListener('submit', onSubmit);
    doneBox.addEventListener('click', onDoneClick);
  }
  function lineByKey(k) { for (var i = 0; i < lines.length; i++) if (lines[i].k === k) return lines[i]; return null; }
  function setErr(f, msg) {
    if (!f) return;
    f.classList.add('has-err');
    var er = f.querySelector('.err'), inp = f.querySelector('input,select,textarea');
    if (er) er.textContent = msg;
    if (inp) { inp.setAttribute('aria-invalid', 'true'); if (er) inp.setAttribute('aria-describedby', er.id); }
  }
  function clearErr(f) {
    f.classList.remove('has-err');
    var er = f.querySelector('.err'), inp = f.querySelector('input,select,textarea');
    if (er) er.textContent = '';
    if (inp) { inp.removeAttribute('aria-invalid'); inp.removeAttribute('aria-describedby'); }
  }
  function validate() {
    $$('.fld', form).forEach(clearErr);
    var first = null;
    function bad(f, msg) { setErr(f, msg); if (!first) first = f.querySelector('input,select,textarea'); }
    var name = $('#f-name').value.trim();
    if (name.length < 2) bad($('#f-name').closest('.fld'), name ? 'Введите имя полностью' : 'Введите имя');
    var digits = $('#f-phone').value.replace(/\D/g, '');
    if (digits.length < 11) bad($('#f-phone').closest('.fld'), digits.length ? 'Введите номер полностью, 10 цифр после +7' : 'Введите номер телефона');
    var filled = lines.filter(function (l) { return l.name.trim(); });
    if (!filled.length) { var fl = $('.line .fld', form); bad(fl, 'Укажите название духов'); }
    if (first) first.focus();
    return !first;
  }
  function buildMessage() {
    var out = [];
    if (!TG) out.push('Здравствуйте! Заявка с сайта ' + SHOP.name);
    out.push('Имя: ' + $('#f-name').value.trim(), 'Телефон: ' + $('#f-phone').value.trim(), '', 'Заказ:');
    var n = 0, sum = 0, all = true;
    lines.forEach(function (l) {
      if (!l.name.trim()) return;
      n++;
      var p = l.cart ? byId[l.cart.split('|')[0]] : null;
      out.push(n + '. ' + lineText(l.name.trim(), l.v, l.q, p));
      var u = p ? unitPrice(p, l.v) : null;
      if (u == null) all = false; else sum += u * l.q;
    });
    if (all && sum) out.push('Итого: ' + fmtRub(sum));
    var c = $('#f-comment').value.trim();
    if (c) { out.push(''); out.push('Комментарий: ' + c); }
    return out.join('\n');
  }
  function onSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    lastMsg = buildMessage();
    if (TG) { sendToTelegram(); return; }
    lastUrl = waLink(lastMsg);
    var w = window.open(lastUrl, '_blank');
    if (w) { try { w.opener = null; } catch (err) { /* не критично */ } } else { location.href = lastUrl; }
    showDone();
  }
  /* Mini App: заказ уходит на сервер, тот проверяет подпись Telegram и пересылает его продавцу (netlify/functions/api.mjs, /api/order) */
  function sendToTelegram() {
    var btn = $('button[type="submit"]', form), label = btn.textContent;
    btn.disabled = true; btn.textContent = 'Отправляем…';
    var back = function (msg) { btn.disabled = false; btn.textContent = label; toast(msg); try { TG.HapticFeedback.notificationOccurred('error'); } catch (err) { /* старый клиент */ } };
    fetch('/api/order', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ initData: TG.initData, message: lastMsg }) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (!res.ok) { back(res.j.message || 'Не удалось отправить заказ. Попробуйте ещё раз.'); return; }
        btn.disabled = false; btn.textContent = label;
        try { TG.HapticFeedback.notificationOccurred('success'); } catch (err) { /* старый клиент */ }
        showSent();
      })
      .catch(function () { back('Нет связи с сервером. Проверьте интернет и попробуйте ещё раз.'); });
  }
  function resetOrder() {
    clearCart(); lines = []; syncLines(); renderLines(); form.reset();
    var u = TG && TG.initDataUnsafe && TG.initDataUnsafe.user;
    if (u && u.first_name) $('#f-name').value = u.first_name;
  }
  function showSent() {
    doneBox.innerHTML =
      '<h3>Заказ отправлен</h3>' +
      '<p class="lead">Мы получили его в Telegram и свяжемся с вами по указанному номеру.</p>' +
      '<pre>' + esc(lastMsg) + '</pre>' +
      '<div class="order__act"><a class="btn btn--primary" href="catalog.html">Вернуться в каталог</a></div>';
    resetOrder();
    form.hidden = true; doneBox.hidden = false;
    doneBox.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
  function showDone() {
    doneBox.innerHTML =
      '<h3>Сообщение готово в WhatsApp</h3>' +
      '<p class="lead">В WhatsApp останется нажать «Отправить». Если он не открылся, нажмите кнопку ниже: текст уже составлен.</p>' +
      '<pre>' + esc(lastMsg) + '</pre>' +
      '<div class="order__act"><a class="btn btn--primary" href="' + esc(lastUrl) + '" target="_blank" rel="noopener">Открыть WhatsApp ещё раз</a>' +
      '<button type="button" class="btn btn--ghost" data-copy>Скопировать текст</button>' +
      '<button type="button" class="btn btn--ghost" data-reset>Очистить корзину и форму</button></div>' +
      '<p><button type="button" class="link" data-back>Изменить заявку</button></p>';
    form.hidden = true; doneBox.hidden = false;
    doneBox.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
  function onDoneClick(e) {
    if (e.target.closest('[data-back]')) { doneBox.hidden = true; form.hidden = false; return; }
    if (e.target.closest('[data-reset]')) {
      resetOrder();
      doneBox.hidden = true; form.hidden = false; toast('Корзина и форма очищены'); return;
    }
    if (e.target.closest('[data-copy]')) {
      var btn = e.target.closest('[data-copy]');
      var ok = function () { btn.textContent = 'Скопировано'; setTimeout(function () { btn.textContent = 'Скопировать текст'; }, 1600); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(lastMsg).then(ok, function () { toast('Не удалось скопировать: выделите текст вручную'); });
      else { var pre = $('pre', doneBox), r = document.createRange(); r.selectNodeContents(pre); var s = getSelection(); s.removeAllRanges(); s.addRange(r); try { document.execCommand('copy'); ok(); } catch (err) { toast('Выделите текст и скопируйте вручную'); } }
    }
  }

  /* ---------- шапка, появление, подвал ---------- */
  /* тема: тёмная (по умолчанию) и светлая; выбор помнит localStorage, атрибут data-theme ставит скрипт в <head> */
  var SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/></svg>';
  var MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z"/></svg>';
  function initTheme(hdr) {
    var root = document.documentElement, meta = $('meta[name="theme-color"]');
    var btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'hdr__theme';
    var cart = $('.hdr__cart', hdr); if (!cart) return;
    cart.parentNode.insertBefore(btn, cart);
    var paint = function () {
      var light = root.getAttribute('data-theme') === 'light';
      btn.innerHTML = light ? MOON : SUN;
      btn.setAttribute('aria-label', light ? 'Включить тёмную тему' : 'Включить светлую тему');
      if (meta) meta.setAttribute('content', light ? '#f8f6f1' : '#0f1013');
      tgColors();
    };
    btn.addEventListener('click', function () {
      var light = root.getAttribute('data-theme') !== 'light';
      if (light) root.setAttribute('data-theme', 'light'); else root.removeAttribute('data-theme');
      try { localStorage.setItem('ap-theme', light ? 'light' : 'dark'); } catch (e) { /* приватный режим */ }
      paint();
    });
    paint();
  }

  /* ---------- Telegram Mini App ---------- */
  /* шапка и фон окна Телеграма в цвет сайта (в обеих темах) */
  function tgColors() {
    if (!TG) return;
    var c = document.documentElement.getAttribute('data-theme') === 'light' ? '#f8f6f1' : '#0f1013';
    try { TG.setHeaderColor(c); TG.setBackgroundColor(c); } catch (e) { /* версия Bot API до 6.1 */ }
  }
  function initTelegram() {
    if (!TG) return;
    try { TG.ready(); TG.expand(); } catch (e) { /* не критично */ }
    /* тема: если посетитель сам не выбирал, берём ту, что в Телеграме */
    var saved = null; try { saved = localStorage.getItem('ap-theme'); } catch (e) { /* приватный режим */ }
    if (!saved && TG.colorScheme === 'light') document.documentElement.setAttribute('data-theme', 'light');
    tgColors();
    /* системная кнопка «назад» вместо стрелки браузера: на главной скрыта */
    try {
      if (document.body.getAttribute('data-page') !== 'home') {
        TG.BackButton.show();
        TG.BackButton.onClick(function () { if (history.length > 1) history.back(); else location.href = 'index.html'; });
      }
    } catch (e) { /* версия Bot API до 6.1 */ }
    /* внешние ссылки (WhatsApp, Instagram) открываются средствами Телеграма, а не внутри окна магазина */
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="http"]');
      if (!a || a.origin === location.origin) return;
      e.preventDefault();
      try { TG.openLink(a.href); } catch (err) { window.open(a.href, '_blank'); }
    });
  }

  /* полоска прогресса прокрутки сверху и плавающая кнопка WhatsApp на телефоне (на главной появляется после героя) */
  function initProgress() {
    var bar = document.createElement('div'); bar.className = 'pbar'; bar.setAttribute('aria-hidden', 'true'); bar.innerHTML = '<i></i>';
    var fab = document.createElement('a');
    fab.className = 'fab'; fab.target = '_blank'; fab.rel = 'noopener'; fab.setAttribute('aria-label', 'Написать в WhatsApp');
    fab.href = waLink('Здравствуйте! Хочу заказать духи.');
    fab.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>';
    document.body.appendChild(bar); document.body.appendChild(fab);
    var hero = $('.hero'), order = $('#order'), ticking = false;
    var upd = function () {
      ticking = false;
      var max = document.documentElement.scrollHeight - innerHeight;
      bar.style.setProperty('--sp', max > 0 ? Math.min(1, scrollY / max).toFixed(4) : 0);
      var limit = hero ? hero.offsetTop + hero.offsetHeight - innerHeight * .5 : 300;
      var nearOrder = order && order.getBoundingClientRect().top < innerHeight * .8;
      fab.classList.toggle('is-on', scrollY > limit && !nearOrder);
    };
    upd();
    addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(upd); } }, { passive: true });
    addEventListener('resize', upd);
  }
  function initHeader() {
    var hdr = $('.hdr'); if (!hdr) return;
    var onScroll = function () { hdr.classList.toggle('is-scrolled', window.scrollY > 24); };
    onScroll(); window.addEventListener('scroll', onScroll, { passive: true });
    initTheme(hdr);
    initProgress();
    var burger = $('.hdr__burger'), menu = $('.hdr__menu');
    if (burger && menu) {
      burger.addEventListener('click', function () {
        var open = burger.getAttribute('aria-expanded') !== 'true';
        burger.setAttribute('aria-expanded', open); menu.classList.toggle('is-open', open);
      });
      menu.addEventListener('click', function (e) { if (e.target.closest('a')) { burger.setAttribute('aria-expanded', 'false'); menu.classList.remove('is-open'); } });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menu.classList.contains('is-open')) { burger.setAttribute('aria-expanded', 'false'); menu.classList.remove('is-open'); burger.focus(); } });
    }
    document.addEventListener('click', function (e) {
      if (e.target.closest('[data-cart-open]')) { e.preventDefault(); openCart(); }
      var g = e.target.closest('[data-goto-order]'); if (g) { e.preventDefault(); goOrder(); }
    });
  }
  var io;
  function reveal(scope) {
    var els = $$('.rv:not(.in)', scope || document);
    if (!('IntersectionObserver' in window)) { els.forEach(function (el) { el.classList.add('in'); }); return; }
    if (!io) {
      io = new IntersectionObserver(function (entries) {
        var i = 0;
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          en.target.style.setProperty('--d', Math.min(i++ * 50, 400) + 'ms');
          en.target.classList.add('in'); io.unobserve(en.target);
        });
      }, { rootMargin: '0px 0px -6% 0px', threshold: 0.05 });
    }
    els.forEach(function (el) { io.observe(el); });
  }
  function initMark() {
    var m = $('.ftr__mark'); if (!m) return;
    if (!('IntersectionObserver' in window)) { m.classList.add('in'); return; }
    new IntersectionObserver(function (en, o) { if (en[0].isIntersecting) { m.classList.add('in'); o.disconnect(); } }, { threshold: 0.4 }).observe(m);
  }

  function init() {
    buildCart();
    initTelegram();
    initHeader();
    renderCart();
    $$('[data-wa]').forEach(function (a) { a.setAttribute('href', waLink(a.getAttribute('data-wa'))); });
    buildOrder();
    var tu = TG && TG.initDataUnsafe && TG.initDataUnsafe.user, nm = $('#f-name');
    if (tu && tu.first_name && nm && !nm.value) nm.value = tu.first_name;
    listeners.push(renderCart, function () { if (form) { syncLines(); renderLines(); } });
    window.addEventListener('storage', function (e) { if (e.key === KEY) { cart = loadCart(); listeners.forEach(function (fn) { fn(); }); } });
    initMark();
    var page = document.body.getAttribute('data-page');
    if (window.APPages && window.APPages[page]) window.APPages[page]();
    reveal();
  }

  window.AP = {
    SHOP: SHOP, CAT: CAT, byId: byId, GENDER: GENDER, VOLS: VOLS, VOL_LABEL: VOL_LABEL,
    $: $, $$: $$, esc: esc, plural: plural, cap: cap, fullName: fullName, famText: famText, liqClass: liqClass,
    vial: vial, setLevel: setLevel, card: card, bindCards: bindCards, photo: photo, priceHtml: priceHtml, unitPrice: unitPrice, fmtRub: fmtRub,
    waLink: waLink, toast: toast, addToCart: addToCart, reveal: reveal, lineText: lineText
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
