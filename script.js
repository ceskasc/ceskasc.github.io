(() => {
  'use strict';
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const menu = $('#mobile-menu');
  const menuToggle = $('.menu-toggle');
  const motionToggle = $('.motion-toggle');
  const html = document.documentElement;
  let manuallyPaused = false;
  try { manuallyPaused = localStorage.getItem('portfolio.motion') === 'paused'; } catch { /* Private browsing can restrict storage. */ }

  function syncMotion() {
    const paused = reducedMotion.matches || manuallyPaused;
    html.classList.toggle('motion-paused', paused);
    html.dataset.motion = paused ? 'paused' : 'playing';
    motionToggle?.setAttribute('aria-pressed', String(paused));
    if (motionToggle) {
      motionToggle.disabled = reducedMotion.matches;
      $('[data-motion-label]', motionToggle).textContent = reducedMotion.matches ? 'Motion reduced' : paused ? 'Resume motion' : 'Pause motion';
    }
    document.dispatchEvent(new CustomEvent('portfolio:motion', { detail: { paused } }));
  }
  motionToggle?.addEventListener('click', () => {
    manuallyPaused = !manuallyPaused;
    try { localStorage.setItem('portfolio.motion', manuallyPaused ? 'paused' : 'playing'); } catch { /* Preference still applies for this page. */ }
    syncMotion();
  });
  reducedMotion.addEventListener('change', syncMotion);
  syncMotion();

  function closeMenu() {
    if (menu?.open) menu.close();
  }
  menuToggle?.addEventListener('click', () => {
    if (menu.open) return closeMenu();
    menu.showModal();
    menuToggle.setAttribute('aria-expanded', 'true');
    document.body.classList.add('menu-open');
  });
  $('.menu-close')?.addEventListener('click', closeMenu);
  menu?.addEventListener('close', () => {
    menuToggle.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('menu-open');
  });
  $$('.mobile-menu nav a').forEach(link => link.addEventListener('click', () => {
    const target = $(link.getAttribute('href'));
    closeMenu();
    // Restore focus to the destination, not to a control in the closed dialog.
    if (target) {
      target.tabIndex = -1;
      requestAnimationFrame(() => target.focus({ preventScroll: true }));
      target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true });
    }
  }));
  const desktop = matchMedia('(min-width: 761px)');
  desktop.addEventListener('change', event => { if (event.matches) closeMenu(); });

  let scrollFrame = 0;
  const progress = $('#scroll-progress');
  const header = $('.site-header');
  function syncScroll() {
    scrollFrame = 0;
    const range = Math.max(1, html.scrollHeight - innerHeight);
    if (progress) progress.style.transform = `scaleX(${Math.min(1, Math.max(0, scrollY / range))})`;
    header?.classList.toggle('is-scrolled', scrollY > 70);
  }
  addEventListener('scroll', () => {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(syncScroll);
  }, { passive: true });
  addEventListener('resize', syncScroll, { passive: true });
  syncScroll();

  if ('IntersectionObserver' in window && !reducedMotion.matches) {
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.06, rootMargin: '0px 0px 30px' });
    $$('.reveal').forEach(element => {
      // Do not hide content already visible at load or at a deep link.
      if (element.getBoundingClientRect().top < innerHeight) return;
      element.classList.add('js-reveal');
      revealObserver.observe(element);
    });
  }
  if ('IntersectionObserver' in window) {
    const navLinks = $$('.desktop-nav [data-nav]');
    const sectionObserver = new IntersectionObserver(entries => {
      const visible = entries.find(entry => entry.isIntersecting);
      if (!visible) return;
      navLinks.forEach(link => {
        const active = link.dataset.nav === visible.target.id;
        link.classList.toggle('is-active', active);
        if (active) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    }, { rootMargin: '-18% 0px -65%', threshold: 0 });
    ['work', 'about', 'experience', 'contact'].forEach(id => {
      const section = document.getElementById(id);
      if (section) sectionObserver.observe(section);
    });
  }

  function updateClock() {
    const time = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Istanbul', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
    const heroClock = $('#istanbul-time');
    const footerClock = $('#contact-time');
    if (heroClock) heroClock.textContent = `${time} / UTC +03:00`;
    if (footerClock) footerClock.textContent = `Türkiye / ${time}`;
    $$('.current-year').forEach(node => { node.textContent = new Date().getFullYear(); });
  }
  updateClock();
  setInterval(() => { if (!document.hidden) updateClock(); }, 30000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) updateClock(); });

  let toastTimer;
  function announce(message) {
    const toast = $('#toast');
    toast.textContent = message;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 3500);
  }
  $('.copy-email')?.addEventListener('click', async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText('cnceska@gmail.com');
      announce('Email address copied.');
    } catch {
      announce('Email: cnceska@gmail.com');
    }
  });

  // Enhance existing content only. No API dependency for rendering or navigation.
  fetch('./data/github.json', { cache: 'no-cache' })
    .then(response => { if (!response.ok) throw new Error('Snapshot unavailable'); return response.json(); })
    .then(snapshot => {
      const count = Number(snapshot.profile?.public_repos);
      if (Number.isFinite(count) && count >= 0) $('#repo-count').textContent = `${count} public repositories`;
      const entries = new Map($$('[data-repo]').map(element => [element.dataset.repo, element]));
      if (!Array.isArray(snapshot.repos)) return;
      snapshot.repos.forEach(repo => {
        const entry = entries.get(repo.name);
        const language = entry && $('[data-project-language]', entry);
        if (language && typeof repo.language === 'string') language.textContent = repo.language;
      });
    })
    .catch(() => { /* Static project content is complete without the snapshot. */ });
})();
