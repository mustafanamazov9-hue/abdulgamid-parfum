/* Админка Abdulgamid Parfum. Работает с функцией /api/* (netlify/functions/api.mjs).
   Правки копятся в браузере и уходят на сайт одной кнопкой «Сохранить на сайт». */
(function () {
  'use strict';

  var SEED = window.CATALOG || [];
  var FAMS = [['oriental', 'восточные'], ['woody', 'древесные'], ['fougere', 'фужерные'], ['fresh', 'цитрусовые'], ['floral', 'цветочные'], ['gourmand', 'гурманские'], ['leather', 'кожаные'], ['musk', 'мускусные']];
  var VOLS = [['3', '3 мл'], ['5', '5 мл'], ['10', '10 мл'], ['full', 'Флакон']];
  var GENDER = { m: 'Мужской', w: 'Женский', u: 'Унисекс' };
  var FILTERS = [['all', 'Все'], ['noprice', 'Без цены'], ['out', 'Нет в наличии'], ['hide', 'Скрытые'], ['oil', 'Масла'], ['new', 'Изменённые']];

  var st = { items: [], saved: {}, rev: null, live: false, hasPrev: false, filter: 'all', q: '', sel: {}, busy: false };
  var ed = null;   /* редактируемый аромат в окне */

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function plural(n, f) { var a = Math.abs(n) % 100, b = a % 10; if (a > 10 && a < 20) return f[2]; if (b > 1 && b < 5) return f[1]; if (b === 1) return f[0]; return f[2]; }
  function fmt(n) { return Number(n).toLocaleString('ru-RU'); }
  function today() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function name(p) { return (p.b ? p.b + ' ' : '') + p.n; }
  function photoSrc(p) { return p && p.p ? (/^(\/|https?:)/.test(p.p) ? p.p : 'img/p/' + p.p) : ''; }

  /* ---------- вызовы сервера ---------- */
  function api(method, path, body, raw) {
    var opts = { method: method, credentials: 'same-origin', headers: { 'x-ap-admin': '1' } };
    if (raw) { opts.body = raw.body; opts.headers['content-type'] = raw.type; }
    else if (body !== undefined) { opts.body = JSON.stringify(body); opts.headers['content-type'] = 'application/json'; }
    return fetch(path, opts).then(function (res) {
      if ((res.headers.get('content-type') || '').indexOf('json') < 0) { var e = new Error('Серверная часть недоступна'); e.unavailable = true; e.status = res.status; throw e; }
      return res.json().then(function (data) {
        if (!res.ok) { var err = new Error(data.message || 'Ошибка ' + res.status); err.status = res.status; err.code = data.error; throw err; }
        return data;
      });
    }, function () { var e = new Error('Нет связи с сервером. Проверьте интернет и попробуйте ещё раз.'); e.network = true; throw e; })
      .catch(function (e) { if (e.code === 'auth') { showLogin(panelEl.hidden ? '' : 'Сессия закончилась. Войдите снова: ваши правки в этом окне не потеряны.'); } throw e; });
  }

  /* ---------- экраны ---------- */
  var loginEl = $('#login'), panelEl = $('#panel'), saveBar = $('#savebar');
  function show(which) {
    loginEl.hidden = which !== 'login'; panelEl.hidden = which !== 'panel';
    if (which !== 'panel') saveBar.hidden = true;
    if (which === 'panel') updateBar();
  }
  function showLogin(note) {
    $('#loginNote').textContent = note || '';
    $('#loginFld').classList.remove('has-err'); $('#loginErr').textContent = '';
    show('login'); setTimeout(function () { $('#pw').focus(); }, 30);
  }
  function toast(msg) {
    var t = $('#toast'); t.textContent = msg; t.classList.add('is-on');
    clearTimeout(toast.t); toast.t = setTimeout(function () { t.classList.remove('is-on'); }, 3600);
  }
  function banner(html, kind) {
    var b = $('#banner'); if (!html) { b.hidden = true; return; }
    b.className = 'adm-info' + (kind ? ' adm-info--' + kind : ''); b.innerHTML = html; b.hidden = false;
  }

  /* ---------- состояние каталога ---------- */
  function snapshot() { st.saved = {}; st.items.forEach(function (p) { st.saved[p.id] = JSON.stringify(p); }); }
  function isDirty(p) { return st.saved[p.id] !== JSON.stringify(p); }
  function changeCount() {
    var n = 0, ids = {};
    st.items.forEach(function (p) { ids[p.id] = 1; if (isDirty(p)) n++; });
    Object.keys(st.saved).forEach(function (id) { if (!ids[id]) n++; });
    return n;
  }
  function get(id) { for (var i = 0; i < st.items.length; i++) if (st.items[i].id === id) return st.items[i]; return null; }

  function load() {
    return api('GET', '/api/admin/catalog').then(function (d) {
      st.live = !!d.items; st.rev = d.rev || null; st.hasPrev = !!d.hasPrev;
      st.items = clone(d.items || SEED); snapshot(); st.sel = {};
      afterLoad();
    });
  }
  function afterLoad() {
    $('#restoreBtn').hidden = !st.hasPrev;
    banner(st.live ? '' : '<b>Каталог пока берётся из файла js/data.js.</b> После первого сохранения он переедет в хранилище сайта, и дальше все правки будут только здесь.', 'warn');
    show('panel'); render();
  }

  /* ---------- список ---------- */
  function filtered() {
    var q = st.q.toLowerCase().replace(/ё/g, 'е').trim();
    return st.items.filter(function (p) {
      if (st.filter === 'noprice' && p.pr && Object.keys(p.pr).length) return false;
      if (st.filter === 'out' && !p.out) return false;
      if (st.filter === 'hide' && !p.hide) return false;
      if (st.filter === 'oil' && p.t !== 'o') return false;
      if (st.filter === 'new' && !isDirty(p)) return false;
      if (q && (name(p) + ' ' + p.n).toLowerCase().replace(/ё/g, 'е').indexOf(q) < 0) return false;
      return true;
    });
  }
  function counts() {
    return { all: st.items.length, noprice: st.items.filter(function (p) { return !(p.pr && Object.keys(p.pr).length); }).length, out: st.items.filter(function (p) { return p.out; }).length, hide: st.items.filter(function (p) { return p.hide; }).length, oil: st.items.filter(function (p) { return p.t === 'o'; }).length, 'new': st.items.filter(isDirty).length };
  }
  function renderFilters() {
    var c = counts();
    $('#filters').innerHTML = FILTERS.map(function (f) {
      return '<button type="button" class="pill" data-f="' + f[0] + '" aria-pressed="' + (st.filter === f[0]) + '">' + f[1] + ' <span style="opacity:.6;margin-left:6px">' + c[f[0]] + '</span></button>';
    }).join('');
  }
  function rowHtml(p) {
    var img = photoSrc(p);
    var media = img ? '<img src="' + esc(img) + '" alt="" loading="lazy" decoding="async" width="56" height="70">' : '<span class="liq-oriental">' + vialSvg() + '</span>';
    var meta = [GENDER[p.g], p.fam, p.t === 'o' ? 'масло' : ''].filter(Boolean).join(' / ');
    var prices = VOLS.map(function (v) {
      var val = p.pr && p.pr[v[0]] ? p.pr[v[0]] : '';
      return '<label class="pin"><span>' + v[1] + '</span><input type="number" min="0" step="10" inputmode="numeric" data-k="' + v[0] + '" value="' + val + '" aria-label="Цена, ' + v[1] + ': ' + esc(name(p)) + '"></label>';
    }).join('');
    return '<div class="arow' + (p.out ? ' is-out' : '') + (p.hide ? ' is-hide' : '') + (isDirty(p) ? ' is-dirty' : '') + '" data-id="' + esc(p.id) + '">' +
      '<label class="arow__sel"><input type="checkbox" data-sel' + (st.sel[p.id] ? ' checked' : '') + ' aria-label="Выбрать: ' + esc(name(p)) + '"></label>' +
      '<div class="arow__img">' + media + '</div>' +
      '<div class="arow__name"><div class="arow__b">' + esc(p.b || ' ') + '</div><div class="arow__n">' + esc(p.n) + '</div><div class="arow__m">' + esc(meta) + '</div></div>' +
      '<div class="arow__prices">' + prices + '</div>' +
      '<div class="arow__flags"><label class="sw"><input type="checkbox" data-flag="in"' + (p.out ? '' : ' checked') + '><span class="sw__ui"></span><span class="sw__t">В наличии</span></label>' +
      '<label class="sw"><input type="checkbox" data-flag="show"' + (p.hide ? '' : ' checked') + '><span class="sw__ui"></span><span class="sw__t">На сайте</span></label></div>' +
      '<button type="button" class="btn btn--ghost btn--sm" data-edit>Изменить</button></div>';
  }
  function vialSvg() {
    return '<svg class="vial" viewBox="0 0 200 320" aria-hidden="true"><rect x="68" y="150" width="64" height="154" rx="10" style="fill:var(--liq,#e0a04a)"/><path class="glass" d="M66 96Q66 84 78 84L122 84Q134 84 134 96L134 292Q134 306 120 306L80 306Q66 306 66 292Z"/><rect x="74" y="20" width="52" height="52" rx="7" fill="#d6ae5a"/><rect x="91" y="6" width="18" height="16" rx="3" fill="#d6ae5a"/></svg>';
  }
  function render() {
    renderFilters();
    var list = filtered();
    $('#count').textContent = list.length === st.items.length ? st.items.length + ' ' + plural(st.items.length, ['аромат', 'аромата', 'ароматов']) : 'Найдено: ' + list.length + ' из ' + st.items.length;
    $('#list').innerHTML = list.length ? list.map(rowHtml).join('') : '<div class="adm-info">Ничего не найдено. Измените поиск или фильтр.</div>';
    updateBulk(); updateBar();
    var all = $('#selAll'); all.checked = list.length > 0 && list.every(function (p) { return st.sel[p.id]; });
  }
  function touchRow(row, p) {
    row.classList.toggle('is-dirty', isDirty(p)); row.classList.toggle('is-out', !!p.out); row.classList.toggle('is-hide', !!p.hide);
    updateBar(); var c = counts();
    $$('#filters [data-f]').forEach(function (b) { var s = b.querySelector('span'); if (s) s.textContent = c[b.getAttribute('data-f')]; });
  }
  function updateBar() {
    var n = changeCount(), needFirst = !st.live;
    saveBar.hidden = panelEl.hidden || (!n && !needFirst);
    $('#saveStatus').innerHTML = needFirst && !n ? 'Каталог ещё не перенесён на сайт. Нажмите «Сохранить на сайт».' : '<b>Изменено: ' + n + '</b> ' + plural(n, ['аромат', 'аромата', 'ароматов']) + '. Изменения появятся на сайте после сохранения.';
    $('#discardBtn').hidden = !n;
  }
  function updateBulk() {
    var ids = Object.keys(st.sel).filter(function (id) { return st.sel[id] && get(id); });
    $('#bulk').hidden = !ids.length;
    $('#bulkN').textContent = 'Выбрано: ' + ids.length;
    if (!$('#bulkPrices').children.length) {
      $('#bulkPrices').innerHTML = VOLS.map(function (v) { return '<label>' + v[1] + '<input type="number" min="0" step="10" inputmode="numeric" data-bk="' + v[0] + '" placeholder="₽"></label>'; }).join('');
    }
  }

  /* ---------- события списка ---------- */
  $('#list').addEventListener('input', function (e) {
    var inp = e.target.closest('[data-k]'); if (!inp) return;
    var row = inp.closest('.arow'), p = get(row.getAttribute('data-id')); if (!p) return;
    var v = parseInt(inp.value, 10), k = inp.getAttribute('data-k');
    if (!p.pr) p.pr = {};
    if (v > 0) p.pr[k] = v; else delete p.pr[k];
    if (!Object.keys(p.pr).length) delete p.pr;
    touchRow(row, p);
  });
  $('#list').addEventListener('change', function (e) {
    var row = e.target.closest('.arow'); if (!row) return;
    var p = get(row.getAttribute('data-id')); if (!p) return;
    if (e.target.hasAttribute('data-sel')) { st.sel[p.id] = e.target.checked; updateBulk(); return; }
    var f = e.target.getAttribute('data-flag'); if (!f) return;
    if (f === 'in') { if (e.target.checked) delete p.out; else p.out = 1; }
    if (f === 'show') { if (e.target.checked) delete p.hide; else p.hide = 1; }
    touchRow(row, p);
  });
  $('#list').addEventListener('click', function (e) {
    if (!e.target.closest('[data-edit]')) return;
    openEditor(get(e.target.closest('.arow').getAttribute('data-id')));
  });
  $('#filters').addEventListener('click', function (e) { var b = e.target.closest('[data-f]'); if (!b) return; st.filter = b.getAttribute('data-f'); render(); });
  var qT; $('#q').addEventListener('input', function (e) { clearTimeout(qT); var v = e.target.value; qT = setTimeout(function () { st.q = v; render(); }, 150); });
  $('#selAll').addEventListener('change', function (e) { filtered().forEach(function (p) { st.sel[p.id] = e.target.checked; }); render(); });
  $('#bulkClear').addEventListener('click', function () { st.sel = {}; render(); });
  $('#bulkApply').addEventListener('click', function () {
    var vals = {}; $$('[data-bk]').forEach(function (i) { var v = parseInt(i.value, 10); if (v > 0) vals[i.getAttribute('data-bk')] = v; });
    var keys = Object.keys(vals);
    if (!keys.length) { toast('Впишите цену хотя бы на один объём'); return; }
    var ids = Object.keys(st.sel).filter(function (id) { return st.sel[id] && get(id); });
    ids.forEach(function (id) { var p = get(id); p.pr = p.pr || {}; keys.forEach(function (k) { p.pr[k] = vals[k]; }); });
    $$('[data-bk]').forEach(function (i) { i.value = ''; });
    render(); toast('Цены применены к ' + ids.length + ' ' + plural(ids.length, ['аромату', 'ароматам', 'ароматам']) + '. Не забудьте сохранить.');
  });

  /* ---------- окно аромата ---------- */
  var dlg = $('#editor');
  function slug(s) {
    var m = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya' };
    return s.toLowerCase().replace(/[а-яё]/g, function (c) { return m[c] || ''; }).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70);
  }
  function uniqueId(base) {
    base = base || 'aroma'; var id = base, i = 2;
    while (get(id)) id = base + '-' + (i++);
    return id;
  }
  function renderEdPhoto() {
    var src = photoSrc({ p: ed.p });
    $('#edPhoto').innerHTML = src ? '<img src="' + esc(src) + '" alt="">' : '<span class="liq-oriental">' + vialSvg() + '</span>';
    $('#edPhotoRm').hidden = !ed.p;
  }
  function renderEdTags() {
    $('#edTags').innerHTML = FAMS.map(function (f) { return '<button type="button" class="pill" data-t="' + f[0] + '" aria-pressed="' + (ed.tags.indexOf(f[0]) > -1) + '">' + f[1] + '</button>'; }).join('');
  }
  function openEditor(p) {
    var isNew = !p;
    ed = p ? clone(p) : { id: '', b: '', n: '', t: 's', g: '', fam: '', tags: [], y: '', c: '', pf: '', d: '', p: '', ig: '', dt: today() };
    ed._new = isNew; ed._orig = p ? p.id : null; ed._famTouched = false;
    $('#edTitle').textContent = isNew ? 'Новый аромат' : name(p);
    $('#edB').value = ed.b; $('#edN').value = ed.n; $('#edT').value = ed.t; $('#edG').value = ed.g;
    $('#edY').value = ed.y; $('#edC').value = ed.c; $('#edD').value = ed.d;
    $('#edNt').value = ed.nt ? ed.nt.t : ''; $('#edNh').value = ed.nt ? ed.nt.h : ''; $('#edNb').value = ed.nt ? ed.nt.b : ''; $('#edNa').value = ed.na || '';
    $('#edPrices').innerHTML = VOLS.map(function (v) { return '<div class="fld"><label for="edP' + v[0] + '">' + v[1] + '</label><input id="edP' + v[0] + '" type="number" min="0" step="10" inputmode="numeric" value="' + (ed.pr && ed.pr[v[0]] ? ed.pr[v[0]] : '') + '"></div>'; }).join('');
    $('#edIn').checked = !ed.out; $('#edShow').checked = !ed.hide; $('#edBl').checked = !!ed.bl;
    $('#edDelete').hidden = isNew;
    ['#edNErr', '#edYErr'].forEach(function (s) { $(s).textContent = ''; $(s).closest('.fld').classList.remove('has-err'); });
    $('#edFile').value = ''; renderEdPhoto(); renderEdTags();
    dlg.showModal(); $('#edB').focus();
  }
  function closeEditor() { if (dlg.open) dlg.close(); ed = null; }
  $('#addBtn').addEventListener('click', function () { openEditor(null); });
  $('#edClose').addEventListener('click', closeEditor);
  $('#edCancel').addEventListener('click', closeEditor);
  dlg.addEventListener('cancel', function () { ed = null; });
  dlg.addEventListener('click', function (e) { if (e.target === dlg) closeEditor(); });
  $('#edTags').addEventListener('click', function (e) {
    var b = e.target.closest('[data-t]'); if (!b) return;
    var k = b.getAttribute('data-t'), i = ed.tags.indexOf(k);
    if (i > -1) ed.tags.splice(i, 1); else ed.tags.push(k);
    ed.fam = FAMS.filter(function (f) { return ed.tags.indexOf(f[0]) > -1; }).map(function (f) { return f[1]; }).join(' ');
    ed._famTouched = true; renderEdTags();
  });
  $('#edPhotoRm').addEventListener('click', function () { ed.p = ''; renderEdPhoto(); });
  $('#edFile').addEventListener('change', function (e) {
    var f = e.target.files && e.target.files[0]; if (!f) return;
    var note = $('#edPhotoNote'); note.textContent = 'Загружаю…';
    shrink(f).then(function (blob) { return api('POST', '/api/admin/photo', undefined, { body: blob, type: 'application/octet-stream' }); })
      .then(function (r) { ed.p = r.path; renderEdPhoto(); note.textContent = 'Фото загружено. Оно попадёт на сайт после сохранения.'; })
      .catch(function (err) { note.textContent = err.message || 'Не удалось загрузить фото'; });
  });
  /* фото сжимаем в браузере: не больше 1200 px по длинной стороне, JPEG */
  function shrink(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var s = Math.min(1, 1200 / Math.max(img.naturalWidth, img.naturalHeight)), w = Math.round(img.naturalWidth * s), h = Math.round(img.naturalHeight * s);
        var c = document.createElement('canvas'); c.width = w; c.height = h;
        var ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        c.toBlob(function (b) { b ? resolve(b) : reject(new Error('Не удалось обработать фото')); }, 'image/jpeg', 0.85);
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('Не получилось открыть файл как картинку')); };
      img.src = url;
    });
  }
  function fieldErr(sel, msg) { var e = $(sel); e.textContent = msg; e.closest('.fld').classList.add('has-err'); }
  $('#edForm').addEventListener('submit', function (e) {
    e.preventDefault();
    ['#edNErr', '#edYErr'].forEach(function (s) { $(s).textContent = ''; $(s).closest('.fld').classList.remove('has-err'); });
    var n = $('#edN').value.trim(), y = $('#edY').value.trim(), bad = false;
    if (!n) { fieldErr('#edNErr', 'Укажите название'); $('#edN').focus(); bad = true; }
    if (y && !/^\d{4}$/.test(y)) { fieldErr('#edYErr', 'Год из четырёх цифр, например 2020'); if (!bad) $('#edY').focus(); bad = true; }
    if (bad) return;
    var isNew = ed._new, orig = ed._orig;
    var it = isNew ? ed : clone(get(orig));
    var b = $('#edB').value.trim();
    it.b = b; it.n = n; it.t = $('#edT').value; it.g = $('#edG').value; it.y = y; it.c = $('#edC').value.trim(); it.d = $('#edD').value.trim();
    it.tags = ed.tags.slice(); if (ed._famTouched) it.fam = ed.fam;
    it.p = ed.p;
    var nt = { t: $('#edNt').value.trim(), h: $('#edNh').value.trim(), b: $('#edNb').value.trim() }, na = $('#edNa').value.trim();
    delete it.nt; delete it.na;
    if (nt.t || nt.h || nt.b) it.nt = nt; else if (na) it.na = na;
    var pr = {}; VOLS.forEach(function (v) { var x = parseInt($('#edP' + v[0]).value, 10); if (x > 0) pr[v[0]] = x; });
    delete it.pr; if (Object.keys(pr).length) it.pr = pr;
    if ($('#edIn').checked) delete it.out; else it.out = 1;
    if ($('#edShow').checked) delete it.hide; else it.hide = 1;
    if ($('#edBl').checked) it.bl = 1; else delete it.bl;
    delete it._new; delete it._orig; delete it._famTouched;
    if (isNew) { it.id = uniqueId(slug((b ? b + ' ' : '') + n)); st.items.unshift(it); toast('Аромат добавлен. Нажмите «Сохранить на сайт».'); }
    else { st.items[st.items.indexOf(get(orig))] = it; }
    closeEditor(); render();
  });
  $('#edDelete').addEventListener('click', function () {
    var p = get(ed._orig); if (!p) return;
    if (!confirm('Удалить «' + name(p) + '» из каталога? Правка вступит в силу после сохранения.')) return;
    st.items.splice(st.items.indexOf(p), 1); delete st.sel[p.id]; closeEditor(); render();
  });

  /* ---------- сохранение и прочее ---------- */
  function busy(on) { st.busy = on; $('#saveBtn').disabled = on; $('#saveBtn').textContent = on ? 'Сохраняю…' : 'Сохранить на сайт'; }
  $('#saveBtn').addEventListener('click', function () {
    if (st.busy) return;
    busy(true); banner('');
    api('PUT', '/api/admin/catalog', { items: st.items, rev: st.rev }).then(function (r) {
      st.items = r.items; st.rev = r.rev; st.live = true; st.hasPrev = !!r.hasPrev; snapshot();
      $('#restoreBtn').hidden = !st.hasPrev; banner(''); render(); toast('Сохранено. Изменения уже на сайте.');
    }).catch(function (err) {
      if (err.code === 'conflict') banner('<b>Конфликт правок.</b> ' + esc(err.message) + ' <button type="button" class="link" id="reloadBtn">Обновить каталог</button> (несохранённые правки в этом окне пропадут).', 'err');
      else if (err.code !== 'auth') banner('<b>Не удалось сохранить.</b> ' + esc(err.message), 'err');
    }).then(function () { busy(false); var rb = $('#reloadBtn'); if (rb) rb.addEventListener('click', function () { load().then(function () { toast('Каталог обновлён'); }); }); });
  });
  $('#discardBtn').addEventListener('click', function () {
    if (!confirm('Отменить все несохранённые правки?')) return;
    st.items = Object.keys(st.saved).map(function (id) { return JSON.parse(st.saved[id]); });
    st.sel = {}; render(); toast('Правки отменены');
  });
  $('#exportBtn').addEventListener('click', function () {
    var blob = new Blob([JSON.stringify(st.items, null, 1)], { type: 'application/json' }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'catalog-' + today() + '.json'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  });
  $('#restoreBtn').addEventListener('click', function () {
    if (!confirm('Вернуть каталог, каким он был до последнего сохранения? Текущая версия станет «предыдущей».')) return;
    api('POST', '/api/admin/restore').then(function () { return load(); }).then(function () { toast('Предыдущее сохранение возвращено'); }).catch(function (e) { toast(e.message); });
  });
  $('#resetBtn').addEventListener('click', function () {
    if (!confirm('Вернуть исходный каталог из файла js/data.js? Все правки из админки будут убраны с сайта (предыдущее сохранение можно вернуть).')) return;
    api('DELETE', '/api/admin/catalog').then(function () { return load(); }).then(function () { toast('Исходный каталог возвращён'); }).catch(function (e) { toast(e.message); });
  });
  $('#logoutBtn').addEventListener('click', function () {
    if (changeCount() && !confirm('Есть несохранённые правки. Выйти без сохранения?')) return;
    api('POST', '/api/admin/logout').catch(function () { /* всё равно выходим */ }).then(function () { st.items = []; showLogin(''); });
  });
  window.addEventListener('beforeunload', function (e) { if (!panelEl.hidden && changeCount()) { e.preventDefault(); e.returnValue = ''; } });

  /* ---------- вход ---------- */
  $('#loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var pw = $('#pw').value; if (!pw) { $('#loginFld').classList.add('has-err'); $('#loginErr').textContent = 'Введите пароль'; return; }
    var btn = $('#loginBtn'); btn.disabled = true; btn.textContent = 'Проверяю…';
    api('POST', '/api/admin/login', { password: pw }).then(function () {
      $('#pw').value = ''; return st.items.length ? (show('panel'), render()) : load();
    }).catch(function (err) {
      $('#loginFld').classList.add('has-err'); $('#loginErr').textContent = err.unavailable ? 'Серверная часть недоступна: админка работает только на опубликованном сайте Netlify.' : err.message;
    }).then(function () { btn.disabled = false; btn.textContent = 'Войти'; });
  });

  /* ---------- запуск ---------- */
  api('GET', '/api/admin/session').then(function () { return load(); }).catch(function (err) {
    if (err.unavailable) { showLogin('Админка работает только на опубликованном сайте Netlify. Здесь (на компьютере или GitHub Pages) серверной части нет.'); return; }
    if (err.code !== 'auth') showLogin(err.message);
  });
})();
