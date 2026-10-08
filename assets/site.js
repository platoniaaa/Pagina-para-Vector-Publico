/* Vector Público · comportamiento del sitio (v2)
   Menú, submenú de servicios, entradas al hacer scroll, preguntas, pasos interactivos y formulario a WhatsApp. */
(function () {
  'use strict';

  var d = document;
  var WHATSAPP = '56964261751';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  /* iPhone con iOS 13 o anterior solo conoce addListener en las consultas de medios */
  function onMedia(mql, fn) {
    if (mql.addEventListener) mql.addEventListener('change', fn);
    else if (mql.addListener) mql.addListener(fn);
  }

  /* ---------- Encabezado con sombra al bajar ---------- */
  var header = d.querySelector('.site-header');
  var scrolled = false;
  function onScroll() {
    var s = window.scrollY > 8;
    if (header && s !== scrolled) { scrolled = s; header.classList.toggle('scrolled', s); }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Submenú de servicios ---------- */
  var dds = [].slice.call(d.querySelectorAll('.dd'));
  function closeDropdowns(except) {
    dds.forEach(function (dd) {
      if (dd === except) return;
      dd.classList.remove('open');
      var b = dd.querySelector('.dd-btn');
      if (b) b.setAttribute('aria-expanded', 'false');
    });
  }
  var hoverable = window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 1101px)');
  dds.forEach(function (dd) {
    var btn = dd.querySelector('.dd-btn');
    var timer = null;
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = !dd.classList.contains('open');
      closeDropdowns(dd);
      dd.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', String(open));
    });
    dd.addEventListener('mouseenter', function () {
      if (!hoverable.matches) return;
      clearTimeout(timer);
      closeDropdowns(dd);
      dd.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
    });
    dd.addEventListener('mouseleave', function () {
      if (!hoverable.matches) return;
      timer = setTimeout(function () {
        dd.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
      }, 180);
    });
  });
  d.addEventListener('click', function (e) {
    if (!e.target.closest || !e.target.closest('.dd')) closeDropdowns(null);
  });

  /* ---------- Menú móvil ---------- */
  var nav = d.querySelector('.nav');
  var menuBtn = d.querySelector('.menu-btn');
  function setNavTop() {
    if (!header) return;
    var r = header.getBoundingClientRect();
    d.documentElement.style.setProperty('--nav-top', Math.max(0, Math.round(r.bottom)) + 'px');
  }
  function closeMenu() {
    if (!nav || !nav.classList.contains('open')) return;
    nav.classList.remove('open');
    d.body.classList.remove('menu-open');
    if (menuBtn) {
      menuBtn.setAttribute('aria-expanded', 'false');
      menuBtn.setAttribute('aria-label', 'Abrir menú');
    }
  }
  if (menuBtn && nav) {
    menuBtn.addEventListener('click', function () {
      var open = !nav.classList.contains('open');
      setNavTop();
      nav.classList.toggle('open', open);
      d.body.classList.toggle('menu-open', open);
      menuBtn.setAttribute('aria-expanded', String(open));
      menuBtn.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    });
    nav.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', closeMenu); });
    window.addEventListener('resize', function () { if (window.innerWidth > 1100) closeMenu(); });
  }
  d.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeDropdowns(null); closeMenu(); }
  });

  /* ---------- Entradas al hacer scroll ---------- */
  var animated = [].slice.call(d.querySelectorAll('.reveal, .stagger, .index-rows'));
  function finish(el) {
    /* al terminar, se quitan las clases para que cada elemento recupere sus propias transiciones */
    el.classList.remove('reveal', 'stagger');
  }
  if (reduce || !('IntersectionObserver' in window)) {
    animated.forEach(function (el) { el.classList.add('in'); finish(el); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        el.classList.add('in');
        io.unobserve(el);
        setTimeout(function () { finish(el); }, 1500);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    animated.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Preguntas ---------- */
  d.querySelectorAll('.faq-item').forEach(function (item) {
    var q = item.querySelector('.faq-q');
    var a = item.querySelector('.faq-a');
    q.addEventListener('click', function () {
      var open = item.classList.toggle('open');
      q.setAttribute('aria-expanded', String(open));
      a.setAttribute('aria-hidden', String(!open));
    });
  });

  /* ---------- Formulario que abre WhatsApp ---------- */
  var form = d.getElementById('wa-form');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var val = function (id) { var el = d.getElementById(id); return el ? (el.value || '').trim() : ''; };
      var muni = val('f-muni'), cargo = val('f-cargo'), tema = val('f-tema'), msg = val('f-msg');
      var text = 'Hola, quiero agendar un diagnóstico inicial.';
      if (muni) text += ' Municipio: ' + muni + '.';
      if (cargo) text += ' Cargo: ' + cargo + '.';
      if (tema) text += ' Tema: ' + tema + '.';
      if (msg) text += ' ' + msg;
      var url = 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(text);
      var status = form.querySelector('.status');
      /* con 'noopener' window.open siempre devuelve null, así que se corta el vínculo a mano */
      var win = window.open(url, '_blank');
      if (win) { win.opener = null; } else { window.location.href = url; }
      if (status) status.textContent = 'Listo, se abrió WhatsApp con tu mensaje.';
    });
  }

  /* ---------- Botón flotante: se esconde mientras el botón principal está a la vista ---------- */
  var heroCta = d.querySelector('.hero .actions .btn, .page-hero .actions .btn');
  if (heroCta && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      d.body.classList.toggle('cta-on-screen', entries[0].isIntersecting);
    }, { threshold: 0.5 }).observe(heroCta);
  }

  /* ---------- Video del héroe controlado por el scroll ----------
     Se descarga como Blob después de cargar la página, avanza con el scroll y retrocede al subir.
     Hasta 900 px usa la versión liviana recortada a la franja de foto del celular (data-video-movil).
     No se activa con movimiento reducido (igual que site.css) ni con ahorro de datos. */
  (function heroVideo() {
    var media = d.querySelector('.hero-media[data-video]');
    if (!media) return;
    var video = media.querySelector('video');
    var hero = media.closest('.hero') || media;
    var reducida = window.matchMedia('(prefers-reduced-motion: reduce)');
    var franja = window.matchMedia('(max-width: 900px)');
    var saveData = !!(navigator.connection && navigator.connection.saveData);
    var started = false, ready = false, active = false, firstFrame = false, blobUrl = null, loadedSrc = '';
    var target = 0, shown = 0, rafId = null, lastTick = 0;
    var seekBusy = false, pendingTime = null, lastOp = -1;
    var fijo = false, pin = 0;
    var clip = !!(window.CSS && CSS.supports && CSS.supports('overflow', 'clip'));

    function gated() { return saveData || reducida.matches; }
    /* celular: el héroe queda fijo mientras avanza el video (ver .video-fijo en site.css) */
    function fijar(on) {
      if (on === fijo) return;
      fijo = on;
      if (on) {
        pin = Math.round(Math.min(320, Math.max(220, window.innerHeight * 0.34)));
        hero.style.setProperty('--pin', pin + 'px');
      }
      hero.classList.toggle('video-fijo', on);
    }
    function wantedSrc() { return (franja.matches && media.getAttribute('data-video-movil')) || media.getAttribute('data-video'); }
    function progress() {
      var span;
      if (franja.matches && fijo) {
        /* celular con el héroe fijo: el video termina justo cuando el héroe se suelta */
        span = pin;
      } else if (franja.matches) {
        /* celular sin fijar (el video llegó con la página ya desplazada): la franja de foto se va bajo
           el encabezado al bajar; el acercamiento termina cuando todavía se ve un 15 % de ella */
        var hb = header ? header.offsetHeight : 0;
        span = (media.getBoundingClientRect().bottom + window.scrollY - hb) * 0.85;
      } else {
        /* escritorio: el acercamiento ocurre mientras se recorre el 70 % del alto del héroe */
        span = hero.offsetHeight * 0.7;
      }
      return Math.min(1, Math.max(0, window.scrollY / Math.max(1, span)));
    }
    function requestSeek(t) {
      if (!video.duration) return;
      if (seekBusy) { pendingTime = t; return; }
      seekBusy = true;
      video.currentTime = t;
    }
    video.addEventListener('seeked', function () {
      seekBusy = false;
      /* el video se deja ver solo cuando ya dibujó un cuadro; antes se ve la foto */
      if (ready && !firstFrame) {
        firstFrame = true;
        /* solo se fija si la persona sigue arriba de la página: así no se mueve nada de lo que ya está viendo */
        if (franja.matches && clip && window.scrollY < 5) { fijar(true); shown = target = progress(); }
        lastOp = -1;
        setOpacity(shown);
      }
      if (pendingTime !== null) { var t = pendingTime; pendingTime = null; requestSeek(t); }
    });
    video.addEventListener('error', function () { seekBusy = false; pendingTime = null; ready = false; firstFrame = false; video.style.opacity = '0'; });

    function setOpacity(p) {
      /* en reposo se ve la foto nítida; el video aparece en el primer 4 % del recorrido */
      var t = Math.min(1, Math.max(0, p / 0.04));
      var op = firstFrame ? t * t * (3 - 2 * t) : 0;
      if (Math.abs(op - lastOp) < 0.01 && !(op === 0 && lastOp !== 0) && !(op === 1 && lastOp !== 1)) return;
      lastOp = op;
      video.style.opacity = op.toFixed(3);
    }
    function tick(now) {
      var dt = Math.min(100, now - (lastTick || now));
      lastTick = now;
      shown += (target - shown) * (1 - Math.pow(1 - 0.16, dt / 16.667));
      if (Math.abs(target - shown) < 0.0005) { shown = target; rafId = null; lastTick = 0; }
      else rafId = requestAnimationFrame(tick);
      if (ready) { requestSeek(shown * video.duration); setOpacity(shown); }
    }
    function onScroll() {
      if (!active) return;
      target = progress();
      if (rafId === null) rafId = requestAnimationFrame(tick);
    }
    function reset() {
      fijar(false);
      ready = false; firstFrame = false; started = false; seekBusy = false; pendingTime = null;
      video.style.opacity = '0'; lastOp = 0;
      if (blobUrl) { video.removeAttribute('src'); video.load(); URL.revokeObjectURL(blobUrl); blobUrl = null; }
      loadedSrc = '';
    }
    function load() {
      if (started || !active) return;
      started = true;
      var src = wantedSrc();
      var ctrl = new AbortController();
      var watchdog = setTimeout(function () { ctrl.abort(); }, 20000);
      fetch(src, { signal: ctrl.signal, priority: 'low' })
        .then(function (res) { if (!res.ok) throw new Error('video ' + res.status); return res.blob(); })
        .then(function (blob) {
          clearTimeout(watchdog);
          /* si mientras bajaba se cambió entre celular y escritorio, se descarta */
          if (src !== wantedSrc() || !active) { started = false; return; }
          blobUrl = URL.createObjectURL(blob);
          loadedSrc = src;
          video.muted = true;
          video.preload = 'auto';
          video.src = blobUrl;
          video.load();
          /* si el navegador no avisa que puede reproducir, una reproducción muda lo empuja a cargar */
          var kick = setTimeout(function () { var q = video.play(); if (q && q.catch) q.catch(function () {}); }, 4000);
          video.addEventListener('canplay', function () {
            clearTimeout(kick);
            var go = function () {
              ready = true;
              shown = target = progress();
              requestSeek(shown * video.duration);
            };
            /* iPhone: una reproducción mínima y sin sonido asegura que los cuadros se dibujen al buscar */
            var pl = video.play();
            if (pl && pl.then) pl.then(function () { video.pause(); go(); }, go);
            else { video.pause(); go(); }
          }, { once: true });
        })
        .catch(function () { clearTimeout(watchdog); started = false; });
    }
    function schedule() {
      /* la descarga espera a que la página termine de cargar, para no competir con la foto */
      var go = function () { (window.requestIdleCallback || function (f) { setTimeout(f, 600); })(load); };
      if (d.readyState === 'complete') go(); else window.addEventListener('load', go, { once: true });
    }
    function apply() {
      var on = !gated();
      /* al pasar entre celular y escritorio (por ejemplo, al girar una tablet) se cambia de video */
      if (loadedSrc && loadedSrc !== wantedSrc()) reset();
      if (on && !active) window.addEventListener('scroll', onScroll, { passive: true });
      if (!on && active) {
        fijar(false);
        window.removeEventListener('scroll', onScroll);
        if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
        video.style.opacity = '0';
        lastOp = 0;
      }
      active = on;
      if (on) { if (!started) schedule(); onScroll(); }
    }
    onMedia(reducida, apply);
    onMedia(franja, apply);
    apply();
  })();

  /* ---------- Pasos interactivos (chevrones de Metodología y recorrido del inicio) ----------
     En fila: el cursor (con una pausa corta), un clic o las flechas del teclado abren un paso.
     Apilados: un toque abre o cierra el paso, y el paso tocado no se mueve de la pantalla. */
  /* se abre al mover el mouse sobre un paso, no al entrar: si la página se desplaza bajo un mouse quieto
     (rueda o teclado), el paso que pasa debajo no se abre; un movimiento en la misma posición tampoco cuenta */
  var mouseX = -1, mouseY = -1;
  window.addEventListener('mousemove', function (e) { mouseX = e.clientX; mouseY = e.clientY; }, { passive: true });
  function stepper(root, stepSel, btnSel, stackQuery, onOpen) {
    /* si este archivo llegó tarde y el head ya mostró todo el contenido, los pasos quedan como están */
    if (!d.documentElement.classList.contains('js')) return;
    var steps = [].slice.call(root.querySelectorAll(stepSel));
    var btns = steps.map(function (s) { return s.querySelector(btnSel); });
    var stack = window.matchMedia(stackQuery);
    function isRow() { return !stack.matches; }
    var fine = window.matchMedia('(hover: hover) and (pointer: fine)');
    var timer = null, pending = -1;
    function current() {
      for (var k = 0; k < steps.length; k++) if (steps[k].classList.contains('is-open')) return k;
      return -1;
    }
    function open(i) {
      steps.forEach(function (s, k) {
        s.classList.toggle('is-open', k === i);
        btns[k].setAttribute('aria-expanded', k === i ? 'true' : 'false');
      });
      if (onOpen) onOpen(i, steps);
    }
    /* apilados: si se cierra un paso más arriba, se compensa el desplazamiento (Safari en iPhone no lo hace solo) */
    function openInPlace(i, b) {
      var before = b.getBoundingClientRect().top;
      open(i);
      var delta = b.getBoundingClientRect().top - before;
      if (Math.abs(delta) > 1) {
        /* compensación inmediata: con el desplazamiento suave de la página se vería un rebote */
        var html = d.documentElement, prev = html.style.scrollBehavior;
        html.style.scrollBehavior = 'auto';
        window.scrollBy(0, delta);
        html.style.scrollBehavior = prev;
      }
      /* después, la página se mueve suave lo justo para que el paso se vea bajo el encabezado
         y, si se abrió, también su detalle (sin esconder el paso arriba) */
      var top = (header ? header.getBoundingClientRect().bottom : 0) + 12;
      var r = b.getBoundingClientRect(), by = 0;
      var panel = i >= 0 ? d.getElementById(b.getAttribute('aria-controls')) : null;
      if (r.top < top) by = r.top - top;
      else if (panel) by = Math.min(panel.getBoundingClientRect().bottom + 16 - window.innerHeight, r.top - top);
      else if (r.bottom > window.innerHeight) by = r.bottom + 16 - window.innerHeight;
      if (Math.abs(by) > 1) window.scrollBy(0, by);
    }
    btns.forEach(function (b, i) {
      b.addEventListener('click', function () {
        clearTimeout(timer);
        pending = -1;
        if (isRow()) open(i);
        else openInPlace(current() === i ? -1 : i, b);
      });
      /* una pausa corta evita que cruzar en diagonal hacia el panel cambie de paso */
      b.addEventListener('mousemove', function (e) {
        if (e.clientX === mouseX && e.clientY === mouseY) return;
        if (!isRow() || !fine.matches || current() === i || pending === i) return;
        clearTimeout(timer);
        pending = i;
        timer = setTimeout(function () { pending = -1; open(i); }, 110);
      });
      b.addEventListener('mouseleave', function () { clearTimeout(timer); pending = -1; });
      b.addEventListener('keydown', function (e) {
        /* con Alt, Ctrl, Cmd o Mayúsculas la tecla es un atajo del navegador: no se toca */
        if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
        var k = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: btns.length - 1 }[e.key];
        if (k === undefined) return;
        e.preventDefault();
        k = (k + btns.length) % btns.length;
        if (isRow()) { btns[k].focus(); open(k); return; }
        /* apilados: sin el desplazamiento propio del foco, que se cruzaba con el de openInPlace */
        btns[k].focus({ preventScroll: true });
        openInPlace(k, btns[k]);
      });
    });
    /* en fila siempre hay un paso abierto, también si se cerraron todos en la vista apilada */
    onMedia(stack, function () { if (isRow() && current() < 0) open(0); });
    open(Math.max(0, current()));
  }
  /* las consultas de vista apilada son las mismas de los @media de site.css */
  [].forEach.call(d.querySelectorAll('[data-flow]'), function (root) {
    stepper(root, '.flow-step', '.flow-chev', '(max-width: 1099px)');
  });
  [].forEach.call(d.querySelectorAll('[data-journey]'), function (root) {
    stepper(root, '.journey-step', '.journey-btn', '(max-width: 900px), (max-height: 500px) and (pointer: coarse)', function (i, steps) {
      /* la línea se llena hasta el paso abierto y los anteriores quedan marcados */
      root.style.setProperty('--p', String(Math.max(0, i) / Math.max(1, steps.length - 1)));
      steps.forEach(function (s, k) { s.classList.toggle('is-done', k < i); });
    });
  });

  /* ---------- Pausar animaciones con la pestaña oculta ---------- */
  d.addEventListener('visibilitychange', function () {
    d.body.classList.toggle('paused', d.hidden);
  });

  /* al final: si algo falla antes de esta línea o el archivo no carga, el head muestra todo el contenido a los 3 segundos */
  window.VP_READY = true;
})();
