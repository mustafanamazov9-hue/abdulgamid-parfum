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

  /* значки шагов подбора по нотам: свои линейные SVG (не юникод-эмодзи — не спорят с тёмной янтарной темой),
     один и тот же stroke-width/round как у остальных иконок сайта (поиск, WhatsApp, стрелка «Назад»). */
  function stepIcon(d) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>'; }
  var STEP_ICONS = {
    gender: stepIcon('<circle cx="12" cy="8" r="3.4"/><path d="M5.5 19c1-3.3 3.6-5 6.5-5s5.5 1.7 6.5 5"/>'),
    citrus: stepIcon('<circle cx="12" cy="12" r="8"/><path d="M12 4v16M4.8 7.8l14.4 8.4M4.8 16.2l14.4-8.4"/>'),
    sweet: stepIcon('<path d="M12 3c3 4.2 6 7.6 6 11a6 6 0 0 1-12 0c0-3.4 3-6.8 6-11Z"/>'),
    fruity: stepIcon('<circle cx="12" cy="14" r="6.2"/><path d="M12 7.8V5M9.5 5.2c1-1.6 3-2 4.6-1"/>'),
    floral: stepIcon('<circle cx="12" cy="7.3" r="2.6"/><circle cx="17" cy="12" r="2.6"/><circle cx="12" cy="16.7" r="2.6"/><circle cx="7" cy="12" r="2.6"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/>'),
    woody: stepIcon('<circle cx="12" cy="12" r="8.2"/><circle cx="12" cy="12" r="4.6"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/>'),
    spicy: stepIcon('<path d="M12 20c-4.4 0-8-3.1-8-7.3C4 9.2 6.8 7 10 7c2.6 0 4.6 1.7 4.6 4s-1.8 3.4-3.6 3.4c-1.4 0-2.4-.8-2.4-2 0-1 .8-1.6 1.6-1.6"/>'),
    oriental: stepIcon('<path d="M12 3.5 18.5 9 16 19H8L5.5 9Z"/><path d="M12 3.5 9.5 9h5L12 3.5ZM8 9h8M9.5 9 8 19M14.5 9l1.5 10"/>'),
    musk: stepIcon('<path d="M7.5 16a3.8 3.8 0 0 1-.5-7.6 4.6 4.6 0 0 1 8.8-1.6A4 4 0 0 1 16.5 16H7.5Z"/>'),
    leather: stepIcon('<path d="M9 20c3-1 1-3.5 0-5s-2-4 1-5.5S12 5 10.5 3.2"/>'),
    fresh: stepIcon('<path d="M3 14c2-2 4-2 6 0s4 2 6 0 4-2 6 0M3 9c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/>'),
    done: stepIcon('<circle cx="12" cy="12" r="8.2"/><path d="M8.3 12.3l2.6 2.6 5-5.4"/>')
  };

  /* Подбор по нотам: группы для чипов подбора. Ключ — id для URL/выбора, метка — подпись чипа,
     stems — с чего может начинаться слово в тексте нот/описания (после norm: ё→е, нижний регистр). */
  var NOTE_GROUPS = [
    { id: 'citrus', label: 'Цитрусовые', items: [
      ['бергамот', 'Бергамот', ['бергамот']], ['лимон', 'Лимон', ['лимон', 'цитрон']], ['апельсин', 'Апельсин', ['апельсин']],
      ['грейпфрут', 'Грейпфрут', ['грейпфрут']], ['мандарин', 'Мандарин', ['мандарин']]
    ] },
    { id: 'sweet', label: 'Сладкие и гурманские', items: [
      ['ваниль', 'Ваниль', ['ваниль']], ['карамель', 'Карамель', ['карамель']], ['мед', 'Мёд', ['мед']],
      ['шоколад', 'Шоколад', ['шоколад']], ['пралине', 'Пралине', ['пралине']], ['миндаль', 'Миндаль', ['миндал']], ['тонка', 'Бобы тонка', ['тонка']]
    ] },
    { id: 'fruity', label: 'Фруктовые и ягодные', items: [
      ['персик', 'Персик', ['персик']], ['малина', 'Малина', ['малин']], ['яблоко', 'Яблоко', ['яблок']],
      ['смородина', 'Чёрная смородина', ['смородин']], ['груша', 'Груша', ['груш']], ['слива', 'Слива', ['слив']], ['ананас', 'Ананас', ['ананас']]
    ] },
    { id: 'floral', label: 'Цветочные', items: [
      ['роза', 'Роза', ['роза']], ['жасмин', 'Жасмин', ['жасмин']], ['магнолия', 'Магнолия', ['магнол']], ['фиалка', 'Фиалка', ['фиалк']],
      ['ирис', 'Ирис', ['ирис']], ['нероли', 'Нероли', ['нероли']], ['туберoза', 'Тубероза', ['тубероз']]
    ] },
    { id: 'woody', label: 'Древесные', items: [
      ['сандал', 'Сандал', ['сандал']], ['кедр', 'Кедр', ['кедр']], ['ветивер', 'Ветивер', ['ветивер']],
      ['пачули', 'Пачули', ['пачул']], ['гваяк', 'Гваяк', ['гваяк']], ['мох', 'Дубовый мох', ['мох']]
    ] },
    { id: 'spicy', label: 'Пряные', items: [
      ['корица', 'Корица', ['корица']], ['кардамон', 'Кардамон', ['кардамон']], ['шафран', 'Шафран', ['шафран']],
      ['перец', 'Перец', ['перец']], ['имбирь', 'Имбирь', ['имбир']], ['мускат', 'Мускатный орех', ['мускатн']]
    ] },
    { id: 'oriental', label: 'Восточные и амбровые', items: [
      ['амбра', 'Амбра', ['амбра', 'ambroxan', 'амброксан']], ['ладан', 'Ладан', ['ладан']], ['уд', 'Уд', ['уда', 'oud']],
      ['бензоин', 'Бензоин', ['бензоин']], ['лабданум', 'Лабданум', ['лабданум']]
    ] },
    { id: 'musk', label: 'Мускусные и пудровые', items: [
      ['мускус', 'Мускус', ['мускус', 'musk']], ['кашмеран', 'Кашмеран', ['кашмеран']]
    ] },
    { id: 'leather', label: 'Кожаные и дымные', items: [
      ['кожа', 'Кожа', ['кожа', 'кожан']], ['табак', 'Табак', ['табак']], ['дым', 'Дымные ноты', ['дым']], ['смола', 'Смолистые ноты', ['смол']]
    ] },
    { id: 'fresh', label: 'Свежие и водяные', items: [
      ['море', 'Морская вода', ['морск']], ['чай', 'Зелёный чай', ['чай']], ['мята', 'Мята', ['мята']], ['водные', 'Водные ноты', ['водн']]
    ] }
  ];
  var NOTE_BY_ID = {};
  NOTE_GROUPS.forEach(function (g) { g.items.forEach(function (it) { NOTE_BY_ID[it[0]] = it; }); });

  function norm(s) { return String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/[’']/g, ''); }
  function notesText(p) {
    var n = p.nt ? [p.nt.t, p.nt.h, p.nt.b].join(' ') : (p.na || '');
    return n;
  }
  function hay(p) {
    if (!p._h) p._h = norm([p.b, p.n, p.fam, notesText(p), A.GENDER[p.g] || '', p.t === 'o' ? 'масло' : ''].join(' '));
    return p._h;
  }
  /* слова из нот + описания + названия для подбора по нотам (не путать с hay — тот ищет ещё и по бренду/семейству) */
  function noteWords(p) {
    if (!p._nw) p._nw = norm([notesText(p), p.d, p.n, p.fam].join(' ')).split(/[^a-zа-я]+/).filter(Boolean);
    return p._nw;
  }
  /* какие из выбранных нот реально нашлись у аромата (для бейджей «почему подошло» на карточке) */
  function matchedNoteIds(p, ids) {
    if (!ids.length) return [];
    var words = noteWords(p), out = [];
    for (var i = 0; i < ids.length; i++) {
      var stems = (NOTE_BY_ID[ids[i]] || {})[2] || [], hit = false;
      for (var j = 0; j < stems.length && !hit; j++) {
        if (words.some(function (w) { return w.indexOf(stems[j]) === 0; })) hit = true;
      }
      if (hit) out.push(ids[i]);
    }
    return out;
  }
  function noteScore(p, ids) { return matchedNoteIds(p, ids).length; }
  function revealCards(scope) {
    $$('.card', scope).forEach(function (c) { c.classList.add('rv'); });
    A.reveal(scope);
  }
  /* каскадное появление набора элементов через общий .rv/.in (не попадает под общий A.reveal(),
     т. к. класс .rv навешивается уже здесь, после того как разовый проход A.reveal() по странице отработал). */
  function staggerIn(els, step, cap) {
    if (!els.length) return;
    var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    els.forEach(function (el, i) {
      el.classList.add('rv');
      el.style.setProperty('--d', reduced ? '0ms' : Math.min(i * step, cap) + 'ms');
    });
    requestAnimationFrame(function () { requestAnimationFrame(function () { els.forEach(function (el) { el.classList.add('in'); }); }); });
  }
  /* снять и тут же вернуть класс, чтобы CSS-анимация проигралась заново */
  function bounce(el, cls) { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }
  function pop(el) { bounce(el, 'pop'); }

  window.APPages = {
    /* ---------------- главная ---------------- */
    home: function () {
      var n = A.CAT.length;
      $$('[data-count]').forEach(function (el) { el.textContent = n; });
      $$('[data-count-word]').forEach(function (el) { el.textContent = A.plural(n, ['аромат', 'аромата', 'ароматов']); });

      /* карточки первого экрана: бренд и название — из каталога (правки в админке подхватятся сами) */
      $$('.hcard[data-id]').forEach(function (c) {
        var p = A.byId[c.getAttribute('data-id')];
        if (!p) { var more = $('.hcard__more', c); if (more) more.remove(); return; }
        var fb = $('[data-f="b"]', c), fn = $('[data-f="n"]', c);
        if (fb && p.b) fb.textContent = p.b;
        if (fn && p.n) fn.textContent = p.n;
      });

      /* первый экран: сцена закреплена, пока прокручивается высокий .hero. Доля прокрутки p плавно догоняет цель
         (как покадровый скраб видео). Флаконы стоят столбиком: pos — какой сейчас в центре (дробное число).
         В шаге i флакон i открывает крышку, держится, затем уезжает вверх, а i+1 подъезжает снизу. */
      var heroEl = $('.hero');
      var reducedMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (heroEl && !reducedMotion) {
        var hs = heroEl.style, hcards = $$('.hcard', heroEl), bots = $$('.hbot', heroEl);
        var ranges = hcards.map(function (c) { return [parseFloat(c.getAttribute('data-from')), parseFloat(c.getAttribute('data-to'))]; });
        var lastStep = ranges.length - 1;
        var target = 0, cur = -1, running = false, activeIdx = -2;
        var clamp01 = function (x) { return x < 0 ? 0 : x > 1 ? 1 : x; };
        var seg = function (p, a, b) { var t = clamp01((p - a) / (b - a)); return t * t * (3 - 2 * t); };
        var placeBottles = function (pos, idx, l) {
          bots.forEach(function (b, j) {
            var d = j - pos, side = j % 2 ? 1 : -1, x, y, r, s, a;
            if (d >= 0) {
              var dd = Math.min(d, 1);
              x = side * dd * 8; y = d * 46; r = side * dd * 9; s = 1 - Math.min(d, 3) * .07; a = clamp01(1 - (d - 2.6) * 2);
            } else {
              x = -d * 10; y = d * 150; r = -d * 14; s = 1 + d * .3; a = clamp01(1 + d * 1.8);
            }
            b.style.transform = 'translate(-50%, -50%) translate(' + x.toFixed(2) + '%, ' + y.toFixed(2) + '%) rotate(' + r.toFixed(2) + 'deg) scale(' + s.toFixed(3) + ')';
            b.style.opacity = a.toFixed(3);
            b.style.setProperty('--k', (j < idx ? 1 : j === idx ? seg(l, .04, .42) : 0).toFixed(4));
            b.style.setProperty('--m', (j < idx ? 1 : j === idx ? seg(l, .3, .75) : 0).toFixed(4));
          });
        };
        var apply = function (p) {
          hs.setProperty('--p', p.toFixed(4));
          var idx = -1, local = 0;
          for (var i = 0; i < ranges.length; i++) {
            if (p >= ranges[i][0] && p < ranges[i][1]) { idx = i; local = (p - ranges[i][0]) / (ranges[i][1] - ranges[i][0]); break; }
          }
          local = clamp01(local);
          var pos = idx < 0 ? -.3 + .3 * seg(p, 0, ranges[0][0]) : idx + (idx < lastStep ? seg(local, .7, 1) : 0);
          placeBottles(pos, idx, local);
          hs.setProperty('--l', local.toFixed(4));
          if (idx === activeIdx) return;
          activeIdx = idx;
          hcards.forEach(function (c, j) { c.classList.toggle('is-active', j === idx); c.classList.toggle('is-prev', idx > -1 && j < idx); });
          heroEl.classList.toggle('is-started', idx > -1);
          hs.setProperty('--hc', idx > -1 ? hcards[idx].getAttribute('data-c') : 'var(--amber)');
        };
        var lastT = 0;
        var tick = function (now) {
          var dt = lastT ? Math.min(now - lastT, 100) : 16.7, d = target - cur;
          lastT = now;
          cur = Math.abs(d) < .0004 ? target : cur + d * (1 - Math.pow(.8, dt / 16.7));
          apply(cur);
          if (cur !== target) requestAnimationFrame(tick); else { running = false; lastT = 0; }
        };
        var scene = matchMedia('(min-height: 640px)');
        var clearScene = function () {
          hs.removeProperty('--p'); hs.removeProperty('--l'); hs.removeProperty('--hc'); heroEl.classList.remove('is-started'); activeIdx = -2; cur = -1;
          bots.forEach(function (b) { b.style.transform = ''; b.style.opacity = ''; b.style.removeProperty('--k'); b.style.removeProperty('--m'); });
          hcards.forEach(function (c) { c.classList.remove('is-active', 'is-prev'); });
        };
        var measure = function () {
          if (!scene.matches) { clearScene(); return; }
          var total = heroEl.offsetHeight - innerHeight;
          target = clamp01(-heroEl.getBoundingClientRect().top / Math.max(1, total));
          if (cur < 0) cur = target;
          if (!running) { running = true; requestAnimationFrame(tick); }
        };
        measure();
        addEventListener('scroll', measure, { passive: true });
        addEventListener('resize', measure);
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

      /* пирамида нот: слои раскрываются по прокрутке (пример: Althaïr, ноты берутся из каталога) */
      var pyr = $('#pyramid'), pyrAroma = A.byId['parfums-de-marly-althair'];
      if (pyr && !(pyrAroma && pyrAroma.nt && pyrAroma.nt.t)) { pyr.hidden = true; pyr = null; }
      if (pyr) {
        $('#pyrName').textContent = pyrAroma.n;
        var pyrRows = [['Верхние ноты', 'Первые минуты', pyrAroma.nt.t], ['Ноты сердца', 'Раскрываются позже', pyrAroma.nt.h], ['Базовые ноты', 'Остаются дольше всего', pyrAroma.nt.b]];
        $('#pyrTiers').innerHTML = pyrRows.map(function (r) {
          return '<li class="tier"><span class="tier__k">' + r[0] + '</span><span class="tier__n">' + esc(r[2]) + '</span><span class="tier__t">' + r[1] + '</span></li>';
        }).join('');
        var tierEls = $$('.tier', pyr), pinMq = matchMedia('(prefers-reduced-motion: no-preference) and (min-height: 640px)'), pyrTick = false;
        var pyrUpdate = function () {
          pyrTick = false;
          if (!pinMq.matches) {
            pyr.classList.remove('is-pinned'); pyr.style.removeProperty('--np');
            tierEls.forEach(function (el) { el.classList.add('is-on'); el.classList.remove('is-cur'); });
            return;
          }
          pyr.classList.add('is-pinned');
          var p = Math.max(0, Math.min(1, -pyr.getBoundingClientRect().top / Math.max(1, pyr.offsetHeight - innerHeight)));
          pyr.style.setProperty('--np', p.toFixed(3));
          var n = p > .66 ? 3 : p > .38 ? 2 : p > .08 ? 1 : 0;
          tierEls.forEach(function (el, i) { el.classList.toggle('is-on', i < n); el.classList.toggle('is-cur', i === n - 1); });
        };
        pyrUpdate();
        addEventListener('scroll', function () { if (!pyrTick) { pyrTick = true; requestAnimationFrame(pyrUpdate); } }, { passive: true });
        addEventListener('resize', pyrUpdate);
      }

      /* калькулятор «сколько хватит»: пшики из поста магазина (3 мл ≈ 50, 5 мл ≈ 80, 10 мл ≈ 160) */
      var calcForm = $('#calcForm');
      if (calcForm) {
        var PUFFS = { '3': 50, '5': 80, '10': 160 };
        var calcRun = function () {
          var v = $('input[name="cv"]:checked', calcForm).value, per = parseInt($('#calcPuffs').value, 10);
          var days = Math.max(1, Math.round(PUFFS[v] / per)), approx;
          if (days >= 45) approx = 'около ' + (days / 30).toFixed(1).replace('.', ',').replace(',0', '') + ' месяца';
          else if (days >= 14) approx = 'около ' + Math.round(days / 7) + ' ' + (Math.round(days / 7) === 1 ? 'недели' : 'недель');
          else approx = '';
          $('#calcPuffsOut').textContent = per;
          $('#calcDays').textContent = '≈ ' + days + ' ' + A.plural(days, ['день', 'дня', 'дней']);
          $('#calcSub').textContent = 'В ' + v + ' мл около ' + PUFFS[v] + ' пшиков' + (approx ? ' (' + approx + ')' : '') + '. Реальный срок зависит от силы нажатия и погоды.';
        };
        calcForm.addEventListener('input', calcRun); calcForm.addEventListener('change', calcRun);
        calcRun();
      }

      /* галерея заказов: фото открываются в лайтбоксе (dialog) */
      var shotImgs = $$('.shots .shot img');
      if (shotImgs.length && window.HTMLDialogElement) {
        var dlg = document.createElement('dialog'); dlg.className = 'lb'; dlg.setAttribute('aria-label', 'Фото заказа');
        dlg.innerHTML = '<img class="lb__img" alt=""><div class="lb__bar"><span class="lb__cap"></span><div class="lb__btns"><button type="button" data-d="-1" aria-label="Предыдущее фото">←</button><button type="button" data-d="1" aria-label="Следующее фото">→</button><button type="button" data-x aria-label="Закрыть">×</button></div></div>';
        document.body.appendChild(dlg);
        var lbImg = $('.lb__img', dlg), lbCap = $('.lb__cap', dlg), lbCur = 0;
        var lbShow = function (i) {
          lbCur = (i + shotImgs.length) % shotImgs.length;
          lbImg.src = shotImgs[lbCur].src; lbImg.alt = shotImgs[lbCur].alt;
          lbCap.textContent = 'Заказ клиента, фото ' + (lbCur + 1) + ' из ' + shotImgs.length;
        };
        shotImgs.forEach(function (im, i) {
          var b = document.createElement('button'); b.type = 'button'; b.className = 'shot__btn';
          b.setAttribute('aria-label', 'Открыть фото ' + (i + 1) + ' из ' + shotImgs.length);
          im.parentNode.insertBefore(b, im); b.appendChild(im);
          b.addEventListener('click', function () { lbShow(i); dlg.showModal(); });
        });
        dlg.addEventListener('click', function (e) {
          if (e.target === dlg || e.target.closest('[data-x]')) { dlg.close(); return; }
          var d = e.target.closest('[data-d]'); if (d) lbShow(lbCur + parseInt(d.getAttribute('data-d'), 10));
        });
        dlg.addEventListener('keydown', function (e) { if (e.key === 'ArrowLeft') lbShow(lbCur - 1); if (e.key === 'ArrowRight') lbShow(lbCur + 1); });
      }

      /* отзывы: только реальные, из SHOP.reviews.items; блок скрыт, пока флаг выключен */
      var revSec = $('#reviews'), revCfg = window.SHOP && window.SHOP.reviews;
      if (revSec && revCfg && revCfg.enabled && revCfg.items && revCfg.items.length) {
        revSec.hidden = false;
        $('#revList').innerHTML = revCfg.items.map(function (r) {
          return '<figure class="rev rv">' + (r.img ? '<img src="' + esc(r.img) + '" alt="Отзыв клиента" loading="lazy">' : '<blockquote>' + esc(r.text || '') + '</blockquote>') +
            '<figcaption>' + esc(r.author || 'Клиент') + (r.source ? ' / ' + esc(r.source) : '') + '</figcaption></figure>';
        }).join('');
        A.reveal(revSec);
      }

      /* разметка FAQPage строится из самого списка вопросов, чтобы текст не расходился */
      var faqItems = $$('#faq details');
      if (faqItems.length) {
        var faqLd = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqItems.map(function (d) {
          return { '@type': 'Question', name: $('summary', d).textContent.trim(), acceptedAnswer: { '@type': 'Answer', text: $('p', d).textContent.trim() } };
        }) };
        var faqEl = document.createElement('script'); faqEl.type = 'application/ld+json';
        faqEl.textContent = JSON.stringify(faqLd).replace(/</g, '\\u003c'); document.head.appendChild(faqEl);
      }

      window.APPages.podbor();
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

    /* ---------------- подбор по нотам ---------------- */
    podbor: function () {
      var PAGE = 24;
      var qs = new URLSearchParams(location.search);
      var firstEl = $('#pdGrid'), FIRST = (firstEl && parseInt(firstEl.getAttribute('data-first'), 10)) || PAGE;
      var st = { g: qs.get('g') || '', n: FIRST };
      var sel = {};
      (qs.get('notes') || '').split(',').forEach(function (id) { if (NOTE_BY_ID[id]) sel[id] = true; });

      var panel = $('#pdPanel'), grid = $('#pdGrid'), more = $('#pdMore'), res = $('#pdCount');
      if (!panel) return;

      var GENDERS = [['', 'Всё равно'], ['m', 'Мужской'], ['w', 'Женский'], ['u', 'Унисекс']];
      /* шаги подбора: сначала «Кому», затем каждая группа нот по очереди — виден только текущий шаг */
      var STEPS = [{ kind: 'gender' }].concat(NOTE_GROUPS.map(function (g) { return { kind: 'notes', grp: g }; }));
      var step = 0;
      var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
      var BACK_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>';

      panel.innerHTML =
        '<div class="stepper">' +
          '<div class="stepper__top">' +
            '<button type="button" class="stepper__nav" id="pdBack" aria-label="Назад">' + BACK_ICON + '</button>' +
            '<div class="stepper__bar" role="progressbar" aria-label="Прогресс подбора" aria-valuemin="0" aria-valuemax="' + STEPS.length + '"><span id="pdBarFill"></span></div>' +
            '<button type="button" class="stepper__skip" id="pdSkip">Пропустить</button>' +
          '</div>' +
          '<div class="stepper__body" id="pdStepBody" aria-live="polite"></div>' +
          '<div class="finder__foot"><p class="finder__count" id="pdSel"></p><button type="button" class="btn btn--ghost btn--sm" id="pdReset">Начать заново</button></div>' +
        '</div>';
      var body = $('#pdStepBody', panel), barFill = $('#pdBarFill', panel), bar = $('.stepper__bar', panel),
        backBtn = $('#pdBack', panel), skipBtn = $('#pdSkip', panel);

      function stepHTML(s) {
        if (!s) {
          return '<div class="stepper__head"><span class="stepper__icon">' + STEP_ICONS.done + '</span><div><p class="stepper__count">Готово</p><h3 class="stepper__title">Вот что мы подобрали</h3></div></div>' +
            '<p class="lead" style="max-width:none">Результаты ниже. Можно вернуться назад и уточнить выбор в любой группе нот.</p>';
        }
        var isGender = s.kind === 'gender';
        var items = isGender ? GENDERS : s.grp.items;
        var icon = isGender ? STEP_ICONS.gender : STEP_ICONS[s.grp.id];
        return '<div class="stepper__head"><span class="stepper__icon">' + icon + '</span><div><p class="stepper__count">Шаг ' + (step + 1) + ' из ' + STEPS.length + '</p>' +
          '<h3 class="stepper__title">' + (isGender ? 'Кому подбираем аромат?' : esc(s.grp.label)) + '</h3></div></div>' +
          '<div class="chips chips--wrap stepper__chips"' + (isGender ? ' id="pdGender" role="radiogroup" aria-label="Кому подбираем"' : ' data-grp="' + s.grp.id + '"') + '>' +
          items.map(function (it) {
            return isGender
              ? '<button type="button" class="pill" data-g="' + it[0] + '" aria-pressed="' + (st.g === it[0]) + '">' + it[1] + '</button>'
              : '<button type="button" class="pill" data-n="' + it[0] + '" aria-pressed="' + (!!sel[it[0]]) + '">' + esc(it[1]) + '</button>';
          }).join('') +
          '</div>';
      }
      /* перерисовать текущий шаг; animate — проиграть переход (уход старого контента и появление нового) */
      function renderBody(animate, focusHeading) {
        var atDone = step >= STEPS.length, s = atDone ? null : STEPS[step];
        barFill.style.width = Math.round(Math.min(step, STEPS.length) / STEPS.length * 100) + '%';
        bar.setAttribute('aria-valuenow', Math.min(step, STEPS.length));
        backBtn.disabled = step === 0;
        skipBtn.style.visibility = (atDone || (s && s.kind === 'gender')) ? 'hidden' : 'visible';
        function paintBody() {
          body.innerHTML = stepHTML(s);
          staggerIn($$('.stepper__icon, .stepper__title, .pill', body), 40, 280);
          if (focusHeading) {
            var h = $('.stepper__title', body);
            if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
          }
        }
        if (!animate || reduced) { paintBody(); return; }
        body.classList.add('step-leave');
        setTimeout(function () { paintBody(); body.classList.remove('step-leave'); }, 180);
      }
      function advance() { step++; renderBody(true, true); }

      function selIds() { return Object.keys(sel); }
      function genderLabel(g) { var x = GENDERS.filter(function (x) { return x[0] === g; })[0]; return x ? x[1] : ''; }
      function genderOk(p, g) {
        if (!g) return true;
        if (g === 'u') return p.g === 'u';
        return p.g === g || p.g === 'u' || !p.g;
      }
      function compute() {
        var ids = selIds();
        var arr = A.CAT.filter(function (p) { return genderOk(p, st.g); }).map(function (p) { return { p: p, s: noteScore(p, ids) }; });
        if (ids.length) arr = arr.filter(function (x) { return x.s > 0; });
        arr.sort(function (a, b) {
          return b.s - a.s
            || ((a.p.out ? 1 : 0) - (b.p.out ? 1 : 0))
            || ((st.g && b.p.g === st.g ? 1 : 0) - (st.g && a.p.g === st.g ? 1 : 0))
            || (a.p.dt < b.p.dt ? 1 : a.p.dt > b.p.dt ? -1 : 0);
        });
        return arr.map(function (x) { return x.p; });
      }
      function syncURL() {
        var u = new URLSearchParams();
        if (st.g) u.set('g', st.g);
        var ids = selIds(); if (ids.length) u.set('notes', ids.join(','));
        var s = u.toString();
        try { history.replaceState(null, '', location.pathname + (s ? '?' + s : '')); } catch (e) { /* file:// и т. п. */ }
      }
      function emptyWa() {
        var ids = selIds(), labels = ids.map(function (id) { return NOTE_BY_ID[id][1]; });
        var lines = ['Здравствуйте! Подбираю аромат.'];
        if (st.g) lines.push('Кому: ' + genderLabel(st.g));
        if (labels.length) lines.push('Любимые ноты: ' + labels.join(', '));
        return A.waLink(lines.join(' '));
      }
      function paint(reveal) {
        var ids = selIds(), list = compute(), w = A.plural(list.length, ['аромат', 'аромата', 'ароматов']), shown = list.slice(0, st.n);
        res.textContent = ids.length
          ? (list.length ? 'Подойдёт по вашим нотам: ' + list.length + ' ' + w : 'Под такое сочетание нот ничего не нашлось')
          : 'Пока без нот — показаны новинки каталога, ' + list.length + ' ' + w;
        $('#pdSel').textContent = ids.length ? 'Выбрано нот: ' + ids.length : 'Ноты пока не выбраны';
        if (!list.length) {
          grid.innerHTML = '';
          more.innerHTML = '<div class="empty"><span class="liq-oriental">' + A.vial({ level: .02, labels: false }) + '</span><p>Под такое сочетание пока ничего нет в каталоге. Уберите одну-две ноты или напишите нам — подберём вручную.</p><div class="empty__act"><button type="button" class="btn btn--primary" id="pdReset2">Сбросить ноты</button><a class="btn btn--ghost" target="_blank" rel="noopener" href="' + emptyWa() + '">Спросить в WhatsApp</a></div></div>';
          return;
        }
        grid.innerHTML = shown.map(A.card).join('');
        if (ids.length) {
          $$('.card', grid).forEach(function (cardEl) {
            var hitIds = matchedNoteIds(A.byId[cardEl.getAttribute('data-id')], ids);
            if (!hitIds.length) return;
            var row = document.createElement('div');
            row.className = 'card__notes';
            row.innerHTML = hitIds.map(function (id) { return '<span class="tag tag--hit">✓ ' + esc(NOTE_BY_ID[id][1]) + '</span>'; }).join('');
            cardEl.querySelector('.card__meta').insertAdjacentElement('afterend', row);
          });
        }
        more.innerHTML = list.length > shown.length ? '<button type="button" class="btn btn--ghost btn--lg" id="pdMoreBtn">Показать ещё ' + Math.min(PAGE, list.length - shown.length) + '</button><p class="fine">Показано ' + shown.length + ' из ' + list.length + '</p>' : '';
        if (reveal) revealCards(grid);
      }
      function update() { st.n = FIRST; syncURL(); paint(false); bounce(res, 'glow'); }
      function resetAll() {
        sel = {}; st.g = ''; step = 0;
        update();
        renderBody(true);
      }

      panel.addEventListener('click', function (e) {
        var gb = e.target.closest('#pdGender [data-g]');
        if (gb) { pop(gb); st.g = gb.getAttribute('data-g'); update(); advance(); return; }
        var nb = e.target.closest('.stepper__chips[data-grp] [data-n]');
        if (nb) {
          pop(nb);
          var id = nb.getAttribute('data-n');
          if (sel[id]) delete sel[id]; else sel[id] = true;
          update(); advance(); return;
        }
        if (e.target.closest('#pdSkip')) { advance(); return; }
        if (e.target.closest('#pdBack')) { if (step > 0) { step--; renderBody(true, true); } return; }
        if (e.target.closest('#pdReset')) resetAll();
      });
      more.addEventListener('click', function (e) {
        if (e.target.closest('#pdMoreBtn')) {
          var before = grid.children.length; st.n += PAGE; paint(false);
          $$('.card', grid).slice(before).forEach(function (c) { c.classList.add('rv'); }); A.reveal(grid);
          var first = grid.children[before]; if (first) { var a = first.querySelector('.card__name a'); if (a) a.focus({ preventScroll: true }); }
        }
        if (e.target.closest('#pdReset2')) resetAll();
      });
      A.bindCards(grid);
      renderBody(false);
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
      document.title = name + ': духи и заказ | Abdulgamid Parfum';
      var md = $('meta[name="description"]');
      if (md) md.setAttribute('content', name + ': ' + (p.d || A.famText(p) || 'нишевая парфюмерия') + ' Объёмы 3, 5, 10 мл и флакон, заявка в WhatsApp.');
      var ogt = $('meta[property="og:title"]'); if (ogt) ogt.setAttribute('content', name + ' | Abdulgamid Parfum');
      var ld = { '@context': 'https://schema.org', '@type': 'Product', name: name, brand: { '@type': 'Brand', name: p.b || 'Abdulgamid Parfum' }, description: p.d || A.famText(p) || 'Нишевая масляная парфюмерия, объёмы 3, 5, 10 мл и флакон' };
      var ldImg = A.photo(p); if (ldImg) ld.image = new URL(ldImg, location.href).href;
      var ldEl = document.createElement('script'); ldEl.type = 'application/ld+json'; ldEl.textContent = JSON.stringify(ld).replace(/</g, '\\u003c');
      document.head.appendChild(ldEl);

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
    }
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
