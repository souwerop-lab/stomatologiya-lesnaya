(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const STATIC = /[?&]static/.test(location.search), DEBUG = /[?&]debug/.test(location.search);
  const still = STATIC || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const ease = (x) => { x = clamp(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };

  /* высота экрана запоминается один раз (панели браузера Telegram/Safari не должны менять длину страницы) */
  let VH = innerHeight / 100, W = innerWidth;
  const setVH = () => { VH = innerHeight / 100; document.documentElement.style.setProperty('--vh', VH + 'px'); };
  setVH();
  addEventListener('resize', () => { if (innerWidth !== W) { W = innerWidth; setVH(); } });

  /* меню: «Услуги» на ПК, шторка на телефоне */
  (() => {
    const mp = $('#mp'), mb = $('#mb'), ov = $('#ov'); let menuY = 0;
    const menu = (open) => { mp.classList.toggle('on', open); ov.classList.toggle('on', open); document.body.classList.toggle('menu-open', open); mb.setAttribute('aria-expanded', open); mb.textContent = open ? 'Закрыть' : 'Меню'; menuY = scrollY; };
    mb.addEventListener('click', () => menu(!mp.classList.contains('on')));
    $$('a', mp).forEach((a) => a.addEventListener('click', () => menu(false)));
    const ab = $('.accb', mp), sub = $('#sub2');
    if (ab) ab.addEventListener('click', () => { const o = ab.getAttribute('aria-expanded') !== 'true'; ab.setAttribute('aria-expanded', o); sub.hidden = !o; });
    const dd = $('.dd'), db = $('.dd > button');
    const ddSet = (o) => { dd.classList.toggle('open', o); db.setAttribute('aria-expanded', o); };
    db.addEventListener('click', () => ddSet(!dd.classList.contains('open')));
    addEventListener('keydown', (e) => { if (e.key === 'Escape') { menu(false); ddSet(false); } });
    document.addEventListener('pointerdown', (e) => {
      if (mp.classList.contains('on') && !mp.contains(e.target) && !mb.contains(e.target)) menu(false);
      if (!dd.contains(e.target)) ddSet(false);
    });
    addEventListener('scroll', () => { if (mp.classList.contains('on') && Math.abs(scrollY - menuY) > 60) menu(false); }, { passive: true });
  })();

  /* появление блоков */
  if (!still && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
    $$('.rv').forEach((el) => io.observe(el));
  } else $$('.rv').forEach((el) => el.classList.add('in'));

  /* главная: имплант непрерывно и спокойно вращается в одну сторону (полный оборот 7,85 с, родная скорость видео, кадры из видео, петля без паузы);
     движение мыши или пальца над ним ускоряет вращение и задаёт направление, затем скорость плавно возвращается к спокойной в исходную сторону.
     Кадры загружаются после load; между соседними кадрами плавный переход прозрачностью второго слоя (дёшево для процессора).
     Один не загрузившийся кадр не отключает вращение (MX-10): вращаются те кадры, что загрузились.
     reduced-motion и ?static: само не крутится, кадр 0; зуб плавно поворачивается за курсором или пальцем (положение по ширине зуба).
     ?debug: в углу страницы состояние (какие кадры, режим, скорость). */
  (() => {
    const spin = $('#spin'), img = $('#spinImg'); if (!spin || !img) return;
    const pre = innerWidth <= 900 ? 'm-' : 'd-';
    const TURN = 7.85, BOOST_MAX = 28;                             // секунд на оборот; максимум скорости от курсора, кадров/с
    const T = { on: false, ready: false, n: 0, imgs: [], fr: [], p: 0, v: 0, tp: 0, lx: null, lt: 0, okc: 0, bad: 0, why: '' };
    const ov = document.createElement('img'); ov.alt = ''; ov.setAttribute('aria-hidden', 'true'); ov.className = 'spin2';
    img.parentNode.appendChild(ov);
    let vis = true, tabOn = !document.hidden, raf = 0, last = 0, shown = -1, shownO = -1, op = 0, dragging = false;
    const base = () => T.n / TURN;                                 // спокойная скорость, кадров/с
    const render = () => {
      const n = T.n, q = ((T.p % n) + n) % n, i = Math.floor(q) % n, j = (i + 1) % n; let f = q - Math.floor(q);
      if (i !== shown) { shown = i; img.src = T.fr[i].src; }
      if (j !== shownO) { shownO = j; ov.src = T.fr[j].src; }
      f = Math.round(f * 100) / 100; if (f !== op) { op = f; ov.style.opacity = f; }
    };
    const frame = (t) => {
      raf = 0; if (!T.on || !vis || !tabOn) return;
      const dt = Math.min(.1, (t - last) / 1000); last = t;
      if (!still) {
        T.v += (base() - T.v) * (1 - Math.exp(-dt / .7));          // к спокойной скорости в исходную сторону
        T.p += T.v * dt;
      } else {                                                     // без автодвижения: плавно догоняем положение курсора
        const n = T.n, d = ((((T.tp - T.p) % n) + 1.5 * n) % n) - n / 2;
        T.p += d * (1 - Math.exp(-dt / .18));
        render(); if (Math.abs(d) < .02) return;
        raf = requestAnimationFrame(frame); return;
      }
      render();
      raf = requestAnimationFrame(frame);
    };
    const start = () => { if (!raf && T.on && vis && tabOn) { last = performance.now(); raf = requestAnimationFrame(frame); } };
    const enable = () => { if (T.ready && !T.on) { T.on = true; $$('source', spin).forEach((x) => x.remove()); img.src = T.fr[0].src; shown = 0; T.v = base(); if (!still) start(); } };
    const finish = (why) => {
      if (T.ready) return;
      T.fr = T.imgs.filter((im) => im && im.complete && im.naturalWidth > 0); T.n = T.fr.length; T.why = why;
      if (T.n < 8) return;                                         // слишком мало кадров: остаётся картинка первого экрана
      T.ready = true; if (!still) setTimeout(enable, 800);
    };
    const load = () => fetch('assets/turn/frames.json').then((r) => r.json()).then((j) => {
      let done = 0; T.total = j.count;
      const settle = () => { if (++done === j.count) finish('все кадры'); };
      for (let i = 0; i < j.count; i++) {
        const im = new Image(); im.onload = () => { T.okc++; settle(); }; im.onerror = () => { T.bad++; settle(); };
        im.src = j.dir + pre + String(i).padStart(2, '0') + '.webp'; T.imgs.push(im);
      }
      setTimeout(() => finish('по таймеру: загрузились ' + T.okc + ' из ' + j.count), 12000);   // медленная сеть: не ждём последние кадры
    }).catch(() => { T.why = 'frames.json не загрузился'; });
    if (document.readyState === 'complete') load(); else addEventListener('load', load);
    setTimeout(() => { if (!T.total && !T.why) load(); }, 6000);   // load затянулся (медленная сторонняя загрузка): не ждём его
    if ('IntersectionObserver' in window) new IntersectionObserver((es) => { vis = es[0].isIntersecting; if (vis) start(); }).observe(spin);
    /* страховка (MX-10): вкладку увели в фон и вернули, браузер усыпил или «заморозил» страницу, потерялся кадр анимации — при возврате, фокусе, показе страницы,
       движении курсора и раз в 2 с проверяем: если вращение должно идти, а цикл стоит или завис, перезапускаем */
    const revive = () => {
      tabOn = !document.hidden; const r = spin.getBoundingClientRect(); vis = r.bottom > 0 && r.top < innerHeight;
      if (T.on && !still && vis && tabOn && (!raf || performance.now() - last > 1500)) { if (raf) cancelAnimationFrame(raf); raf = 0; start(); }
    };
    document.addEventListener('visibilitychange', revive); addEventListener('focus', revive); addEventListener('pageshow', revive);
    setInterval(revive, 2000);
    if (DEBUG) window.__spinKill = () => { cancelAnimationFrame(raf); raf = 1; last = performance.now() - 5000; };   // имитация зависшего цикла
    /* движение мыши или пальца над зубом ускоряет вращение в сторону движения; в режиме «без анимации» зуб поворачивается за курсором */
    const frac = (e) => { const r = spin.getBoundingClientRect(); return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)); };
    spin.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') dragging = true; enable(); T.lx = e.clientX; T.lt = e.timeStamp; if (still && T.ready) { T.tp = frac(e) * T.n; start(); } });
    const endDrag = () => { dragging = false; T.lx = null; };
    addEventListener('pointerup', endDrag); addEventListener('pointercancel', endDrag);
    spin.addEventListener('pointerleave', () => { T.lx = null; });
    spin.addEventListener('pointermove', (e) => {
      if (!T.ready || (e.pointerType !== 'mouse' && !dragging)) return;
      enable(); revive();
      if (still) { T.tp = frac(e) * T.n; start(); }
      else if (T.lx !== null) {
        const dx = e.clientX - T.lx, dt = Math.max(8, e.timeStamp - T.lt);
        if (dx) {
          const sp = Math.min(BOOST_MAX, Math.abs(dx) / dt * 1000 * .03), want = (dx > 0 ? 1 : -1) * Math.max(sp, base());
          T.v = T.v * .5 + want * .5;
          start();
        }
      }
      T.lx = e.clientX; T.lt = e.timeStamp;
    });
    if (DEBUG) {
      const box = document.createElement('pre'); box.id = 'dbg';
      box.style.cssText = 'position:fixed;z-index:999;right:8px;bottom:8px;margin:0;padding:8px 10px;background:#000c;color:#9f9;font:12px/1.35 monospace;max-width:92vw;white-space:pre-wrap;pointer-events:none';
      document.body.appendChild(box);
      setInterval(() => {
        box.textContent = ['файлы: ' + pre + 'NN.webp', 'reduced-motion: ' + matchMedia('(prefers-reduced-motion: reduce)').matches + ', ?static: ' + STATIC + ' → still=' + still,
          'кадры: загружено ' + T.okc + ', ошибок ' + T.bad + ', всего ' + (T.total || '?') + ', в работе ' + T.n, 'ready=' + T.ready + ' on=' + T.on + ' vis=' + vis + ' tabOn=' + tabOn + ' raf=' + !!raf,
          'кадр ' + (T.n ? (((T.p % T.n) + T.n) % T.n).toFixed(1) : '-') + ', скорость ' + T.v.toFixed(1) + ' к/с' + (T.why ? ', старт: ' + T.why : ''), 'pointer: ' + (window.PointerEvent ? 'есть' : 'нет')].join('\n');
      }, 250);
    }
  })();

  /* страница имплантации: части собираются по шагам лечения */
  (() => {
    const track = $('#implant'); if (!track) return;
    const rig = $('#rig'), parts = $$('.part', rig), moving = parts.slice(1), steps = $$('.step', track), done = $('#done');
    const R = [[.14, .32], [.38, .56], [.62, .80]];
    function draw() {
      let p;
      if (matchMedia('(max-width:900px)').matches) {   // телефон: прогресс идёт по положению сцены на экране
        const g = rig.getBoundingClientRect(), c = (innerHeight * .5 - g.top) / g.height;
        p = still ? 1 : clamp((c - .3) / .5);   // финал раньше: собранный зуб целиком ниже шапки
      } else { const r = track.getBoundingClientRect(), len = r.height - VH * 100; p = still ? 1 : clamp(-r.top / len); }
      moving.forEach((el, i) => {
        const S = ease((p - R[i][0]) / (R[i][1] - R[i][0])), base = Math.min(1, Math.max(S * 3, p > R[i][0] - .08 ? 1 : 0));
        el.style.transform = `translateY(${S * +el.dataset.dy}%)`; el.style.opacity = .4 + .6 * base;
      });
      let a = 0; R.forEach(([s], i) => { if (p >= s) a = i + 1; });
      steps.forEach((s, i) => s.classList.toggle('on', still || i === a));
      done.classList.toggle('on', still || p > .88);
    }
    addEventListener('scroll', draw, { passive: true }); addEventListener('resize', draw); draw();
  })();

  /* нижняя панель на телефоне: после первого экрана, скрыта у формы записи */
  (() => {
    const bar = $('#bar'); if (!bar) return;
    const first = $('#top') || $('.ph'), bk = $('#zapis'); let atBook = false;
    const upd = () => bar.classList.toggle('on', scrollY > (first ? first.offsetHeight * .8 : 400) && !atBook);
    if (bk) new IntersectionObserver((es) => { atBook = es[0].isIntersecting; upd(); }).observe(bk);
    addEventListener('scroll', upd, { passive: true }); upd();
  })();

  /* cookies и карта: плашка при первом визите; до «Хорошо» запросов к Яндексу нет (карта только по кнопке), после — карта грузится сама, когда блок подходит к экрану */
  (() => {
    const KEY = 'dentist-cookies-ok';
    /* выбор помним в localStorage; если он закрыт — в sessionStorage (до закрытия вкладки), иначе плашка покажется снова */
    const get = () => { for (const st of ['localStorage', 'sessionStorage']) { try { if (window[st].getItem(KEY) === '1') return true; } catch (e) {} } return false; };
    const set = () => { for (const st of ['localStorage', 'sessionStorage']) { try { window[st].setItem(KEY, '1'); } catch (e) {} } };
    const btn = $('#mapBtn'), box = $('#map'), note = $('.mapnote'), ck = $('#ck');
    let loaded = false, io = null;
    const loadMap = () => {
      if (loaded || !box) return; loaded = true; if (io) io.disconnect();
      const f = document.createElement('iframe');
      f.src = 'https://yandex.ru/map-widget/v1/?ll=39.839992%2C57.603325&z=16&pt=39.839992%2C57.603325%2Cpm2blm';
      f.title = 'Яндекс Карта: ул. Лесная, 10, Ярославль'; f.referrerPolicy = 'no-referrer';
      f.addEventListener('load', () => { f.classList.add('on'); const im = $('#mapImg'); if (im) setTimeout(() => { im.hidden = true; }, 400); });
      if (btn) btn.hidden = true; if (note) note.hidden = true; box.appendChild(f);
    };
    const auto = () => {
      if (!box) return;
      if (note) note.textContent = 'Схема расположения, не в масштабе. Карта Яндекса загружается.';
      if (btn) btn.hidden = true;
      if ('IntersectionObserver' in window) { io = new IntersectionObserver((es) => { if (es[0].isIntersecting) loadMap(); }, { rootMargin: '100% 0px' }); io.observe(box); } else loadMap();
    };
    if (btn) btn.addEventListener('click', loadMap);
    if (get()) auto();
    else if (ck) {
      ck.hidden = false; document.documentElement.classList.add('ckon');
      const fit = () => document.documentElement.style.setProperty('--ckh', (ck.hidden || getComputedStyle(ck).position !== 'absolute') ? '0px' : ck.offsetHeight + 'px'); fit(); addEventListener('resize', fit);   // ckon: запас прокрутки, чтобы фокус не прятался под плашкой
      $('#ckOk').addEventListener('click', () => { set(); ck.hidden = true; document.documentElement.classList.remove('ckon'); document.documentElement.style.removeProperty('--ckh'); auto(); });
    }
    const res = $('#chatRes');
    $$('[data-chat]').forEach((b) => b.addEventListener('click', () => { res.hidden = false; }));
  })();

  /* шторки «до / после» */
  $$('.ba').forEach((ba) => {
    const inp = $('input', ba), set = () => ba.style.setProperty('--p', inp.value + '%');
    inp.addEventListener('input', set); set();
  });

  /* запись на приём (демо: ничего не отправляет). Параметры ссылки: ?doc=1&service=implantaciya */
  (() => {
    const f = $('#bf'); if (!f) return;
    const daysEl = $('#days'), slotsEl = $('#slots'), sum = $('#sum'), res = $('#res'), guard = $('.guard', f);
    const WD = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'], MO = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
    const now = new Date(), days = [];
    for (let i = 1; i <= 7; i++) days.push(new Date(now.getFullYear(), now.getMonth(), now.getDate() + i));
    days.forEach((d, i) => daysEl.insertAdjacentHTML('beforeend', `<label class="chip"><input type="radio" name="day" value="${i}"><span>${d.getDate()}<small>${WD[d.getDay()]}</small></span></label>`));
    const radios = (n) => $$(`input[type=radio]`, f).filter((r) => r.name === n);
    const val = (n) => { const c = radios(n).find((r) => r.checked); return c ? c.value : null; };
    const label = (n) => { const c = radios(n).find((r) => r.checked); return c ? c.nextElementSibling.firstChild.textContent : ''; };
    const q = new URLSearchParams(location.search);
    ['doc', 'service'].forEach((n) => { const v = q.get(n); if (v === null) return; const r = radios(n).find((x) => x.value === v); if (r) r.checked = true; });   // сравнение значений, без селектора из URL
    let timeReset = false;
    const fmt = (m) => `${Math.floor(m / 60)}:${m % 60 ? '30' : '00'}`;
    function slots() {
      const day = val('day'), doc = +val('doc'), keep = val('time'); slotsEl.innerHTML = '';
      const di = day === null ? 0 : +day, sun = day !== null && days[di].getDay() === 0;
      const a = sun ? 10 * 60 : 8 * 60, b = sun ? 17 * 60 + 30 : 20 * 60 + 30;   // будни 8:00–20:30, воскресенье 10:00–17:30
      let kept = false;
      for (let m = a; m <= b; m += 30) {
        const busy = (di * 7 + doc * 3 + (m / 30) * 5) % (doc === 0 ? 7 : 4) === 0, ok = keep == m && !busy; kept = kept || ok;
        slotsEl.insertAdjacentHTML('beforeend', `<label class="chip"><input type="radio" name="time" value="${m}" ${busy ? 'disabled' : ''} ${ok ? 'checked' : ''}><span>${fmt(m)}</span></label>`);
      }
      timeReset = !!keep && !kept; upd();
    }
    function upd() {
      const day = val('day'), t = val('time');
      const parts = [`<b>${label('service')}</b>`, label('doc')];
      if (day !== null) { const d = days[+day]; parts.push(`${d.getDate()} ${MO[d.getMonth()]}`); }
      if (t) parts.push(fmt(+t));
      sum.innerHTML = timeReset && !t ? 'Выбранное время занято: выберите другое.' : (day === null || !t ? '' : 'Вы выбрали: ' + parts.join(', '));
    }
    const feOf = (el) => (el.matches('.agree') ? el.nextElementSibling : el.querySelector('.fe'));
    const clearErr = () => { $$('.fe', f).forEach((x) => { x.textContent = ''; }); $$('.bad', f).forEach((x) => x.classList.toggle('bad', false)); };
    const mark = (el, msg) => { el.classList.add('bad'); const t = feOf(el); if (t) { t.textContent = (t.textContent ? t.textContent + ' ' : '') + msg; } };
    const syncGuard = () => { const c = radios('service').find((r) => r.checked); guard.hidden = !(c && c.dataset.child); guard.nextElementSibling.hidden = guard.hidden; };
    f.addEventListener('change', (e) => {
      if (e.target.name === 'doc' || e.target.name === 'day') slots(); else { timeReset = false; upd(); }
      if (e.target.name === 'service') syncGuard();
      clearErr();
    });
    f.addEventListener('input', clearErr);
    syncGuard(); slots();
    f.addEventListener('submit', (e) => {
      e.preventDefault(); res.hidden = true; clearErr();
      if (f.elements.website.value) return;   // ловушка для роботов
      const name = f.elements.name.value.trim(), tel = f.elements.tel.value.replace(/[\s()\-]/g, ''), inp = $('.inp', f), bad = [];
      if (val('day') === null) bad.push([daysEl.closest('.fld'), 'Выберите день.']);
      if (!val('time')) bad.push([slotsEl.closest('.fld'), 'Выберите время.']);
      const fl = $$('.ifld', f);
      if (!/\p{L}{2,}/u.test(name)) bad.push([fl[0], 'Укажите имя.']);
      if (!/^(\+7|8)\d{10}$/.test(tel)) bad.push([fl[1], 'Телефон: +7 900 000-00-00.']);
      if (!guard.hidden && !f.elements.guardian.checked) bad.push([guard, 'Нужно подтверждение.']);
      if (!f.elements.agree.checked) bad.push([$('.agree:not(.guard)', f), 'Нужно согласие на обработку.']);
      if (bad.length) {
        bad.forEach(([el, m]) => mark(el, m));
        const first = bad[0][0]; first.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'center' });
        const i = $('input:not([type=radio]):not([type=checkbox])', first) || $('input', first); if (i) i.focus({ preventScroll: true });
        return;
      }
      res.hidden = false; res.textContent = 'Заявка не отправлена: это демо-проект. На рабочем сайте её получит администратор клиники и перезвонит.';
    });
  })();

  (function () {
    const d = document.querySelector('footer .fd'); if (!d) return;
    const mq = matchMedia('(max-width:600px)');
    const sync = () => { d.open = !mq.matches; };
    sync(); mq.addEventListener('change', sync);
    d.querySelector('summary').addEventListener('click', (e) => { if (!mq.matches) e.preventDefault(); });
  })();
  /* телефон (MX-9): врачи, услуги и отзывы на главной — горизонтальные ленты со свайпом и точками; цены — аккордеон (открыт один раздел).
     На ПК и планшете ничего не меняется: ленты и аккордеон включаются только при ширине до 600 px. */
  (() => {
    const mq = matchMedia('(max-width:600px)');
    $$('.docs, .revs, .gd').forEach((c) => {
      const dots = document.createElement('div'); dots.className = 'dots'; dots.setAttribute('aria-hidden', 'true'); c.after(dots);
      const stops = () => { const xs = []; [...c.children].forEach((k) => { const x = Math.round(k.offsetLeft - c.offsetLeft); if (!xs.includes(x)) xs.push(x); }); return xs; };
      const draw = () => {
        const xs = stops(); if (dots.childElementCount !== xs.length) dots.innerHTML = xs.map(() => '<i></i>').join('');
        const max = c.scrollWidth - c.clientWidth; let on = 0;
        xs.forEach((x, i) => { if (Math.abs(x - c.scrollLeft) < Math.abs(xs[on] - c.scrollLeft)) on = i; }); if (c.scrollLeft >= max - 4) on = xs.length - 1;
        [...dots.children].forEach((d, i) => d.classList.toggle('on', i === on));
      };
      c.addEventListener('scroll', draw, { passive: true }); addEventListener('resize', draw); draw();
    });
    const bar = $('.chipbar'); if (!bar) return;
    /* аккордеон цен: до скрипта раздел «Лечение зубов» уже раскрыт CSS-ом, остальные свёрнуты (без скачка вёрстки); заголовок становится кнопкой */
    const secs = $$('main > section.sec[id]').filter((s) => $('.sh', s) && $('.g2 .pr', s));
    const only = (s) => { secs.forEach((o) => o._set(o === s)); };
    secs.forEach((s) => {
      const h = $('.sh h2', s);
      const toggle = () => { const was = s.classList.contains('open'); only(was ? null : s); if (!was) setTimeout(() => s.scrollIntoView({ block: 'start', behavior: 'smooth' }), 30); };
      s._set = (on) => { s.classList.toggle('open', on); s.classList.toggle('shut', !on); const b = $('.acc-b', h); if (b) b.setAttribute('aria-expanded', on); };
      s._sync = () => {
        const b = $('.acc-b', h);
        if (mq.matches && !b) {
          const nb = document.createElement('button'); nb.type = 'button'; nb.className = 'acc-b'; nb.setAttribute('aria-expanded', s.classList.contains('open'));
          while (h.firstChild) nb.appendChild(h.firstChild);
          h.appendChild(nb); nb.addEventListener('click', toggle);
        } else if (!mq.matches && b) { while (b.firstChild) h.insertBefore(b.firstChild, b); b.remove(); }
      };
    });
    const target = () => secs.find((x) => '#' + x.id === location.hash);
    const init = () => { if (mq.matches && !secs.some((x) => x.classList.contains('open'))) only(target() || secs[0]); secs.forEach((x) => x._sync()); };
    addEventListener('hashchange', () => { const s = target(); if (s && mq.matches) { only(s); setTimeout(() => s.scrollIntoView({ block: 'start' }), 30); } });
    $$('a[href^="#"]', bar).forEach((a) => a.addEventListener('click', () => { const s = secs.find((x) => '#' + x.id === a.getAttribute('href')); if (s && mq.matches) { only(s); setTimeout(() => s.scrollIntoView({ block: 'start' }), 30); } }));
    init(); mq.addEventListener('change', init);
  })();
  /* «Ответ клиники» в отзывах: на телефоне свёрнут (короткая лента), на ПК и планшете раскрыт */
  (() => {
    const mq = matchMedia('(max-width:600px)'), rs = $$('.rev details.reply'); if (!rs.length) return;
    const sync = () => rs.forEach((d) => { d.open = !mq.matches; });
    sync(); mq.addEventListener('change', sync);
    rs.forEach((d) => $('summary', d).addEventListener('click', (e) => { if (!mq.matches) e.preventDefault(); }));
  })();
  /* ленты и ряды чипов на телефоне листаются только вправо-влево (MX-12): если жест начался горизонтальным (первые ~8 px), страница в этом жесте не едет,
     лента двигается сама; вертикальный жест, начатый на ленте, листает страницу как обычно (touch-action не ограничиваем). */
  (() => {
    const LANES = '.docs, .revs, .gd, .opts, .chipbar .chips';
    $$(LANES).forEach((lane) => {
      let x0 = 0, y0 = 0, lx = 0, lt = 0, v = 0, axis = '', sl0 = 0;
      lane.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1 || lane.scrollWidth <= lane.clientWidth + 1) { axis = 'skip'; return; }
        const t = e.touches[0]; x0 = lx = t.clientX; y0 = t.clientY; lt = e.timeStamp; v = 0; axis = ''; sl0 = lane.scrollLeft;
      }, { passive: true });
      lane.addEventListener('touchmove', (e) => {
        if (axis === 'skip' || axis === 'y' || e.touches.length !== 1) return;
        const t = e.touches[0], dx = t.clientX - x0, dy = t.clientY - y0;
        if (!axis) {
          if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
          axis = Math.abs(dx) >= Math.abs(dy) * .6 ? 'x' : 'y';     // диагональ, где вправо-влево не меньше ~60 % движения вниз, считаем горизонтальной
          if (axis === 'y') return;
          lane.style.scrollSnapType = 'none';                      // пока ведём ленту сами, прилипание выключено
        }
        if (e.cancelable) e.preventDefault();                      // страница в этом жесте не прокручивается
        const dt = Math.max(1, e.timeStamp - lt); v = (lx - t.clientX) / dt; lx = t.clientX; lt = e.timeStamp;
        lane.scrollLeft = sl0 - dx;
      }, { passive: false });
      const end = () => {
        if (axis === 'x') {
          lane.style.scrollSnapType = '';
          const max = lane.scrollWidth - lane.clientWidth, pad = parseFloat(getComputedStyle(lane).scrollPaddingLeft) || 0;
          if (lane.matches('.docs, .revs, .gd')) {                  // прилипание к карточке: достаточно протянуть ~18 % ширины карточки или сделать рывок
            const stops = [...new Set([...lane.children].filter((k) => k.offsetParent).map((k) => Math.max(0, Math.min(Math.round(k.offsetLeft - lane.offsetLeft - pad), max))))].sort((u, w) => u - w);
            let i0 = 0; stops.forEach((x, i) => { if (Math.abs(x - sl0) < Math.abs(stops[i0] - sl0)) i0 = i; });
            const moved = lane.scrollLeft - sl0, w = (stops[1] || 300) - stops[0] || 300; let i1 = i0;
            if (moved > w * .18 || v > .5) i1 = Math.min(stops.length - 1, i0 + 1); else if (moved < -w * .18 || v < -.5) i1 = Math.max(0, i0 - 1);
            lane.scrollTo({ left: stops[i1], behavior: 'smooth' });
          } else lane.scrollTo({ left: Math.max(0, Math.min(lane.scrollLeft + v * 260, max)), behavior: 'smooth' });
        }
        axis = '';
      };
      lane.addEventListener('touchend', end, { passive: true }); lane.addEventListener('touchcancel', end, { passive: true });
    });
  })();
})();
