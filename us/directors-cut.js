(() => {
  const qs = (selector, scope = document) => scope.querySelector(selector);
  const qsa = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const header = qs('.site-header');
  const progressFill = qs('#progress-fill');
  const timecode = qs('#timecode');
  const menuToggle = qs('.menu-toggle');
  const mobileNav = qs('#mobile-nav');
  const dialog = qs('#letter-dialog');
  const dialogTitle = qs('#dialog-title');
  const dialogCopy = qs('#dialog-copy');
  const dialogClose = qs('.dialog-close');
  const heroObject = qs('#hero-object');
  let lastTrigger = null;
  let ticking = false;

  const letters = {
    miss: {
      title: 'When you miss me',
      copy: [
        'If distance feels louder than usual, remember that missing someone is only love noticing the empty space.',
        'There are pieces of you already built into my ordinary day — in the songs I hear, the things I want to tell you, and the moments I automatically save for later.',
        'This feeling passes. The fact that I would still choose you when it does — that part stays.'
      ]
    },
    heavy: {
      title: 'When the day feels heavy',
      copy: [
        'You do not have to be impressive today. You do not have to solve everything before you rest.',
        'Some days are meant to be carried gently. Eat something, be quiet if you need to be, and let the day be smaller than your expectations.',
        'Tomorrow can ask more from you. Tonight, existing is enough.'
      ]
    },
    angry: {
      title: 'When you are angry with me',
      copy: [
        'First: there is a completely realistic chance that I am being annoying.',
        'But underneath whatever happened, I hope we remember that it is us versus the problem — not me versus you.',
        'Be mad. Say what matters. Make me understand. I still want the conversation more than I want to win it.'
      ]
    },
    future: {
      title: 'When you think about our future',
      copy: [
        'I do not need every detail of the future to be certain before I can be excited about it.',
        'I like the thought of future versions of us remembering who we are now — still figuring things out, still making plans, still finding new reasons to laugh at the same person.',
        'Whatever the scenery looks like later, I hope the feeling stays familiar: you, me, and a life that slowly learned how to make room for both.'
      ]
    }
  };

  function setMenu(open) {
    document.body.classList.toggle('nav-open', open);
    mobileNav?.classList.toggle('is-open', open);
    mobileNav?.setAttribute('aria-hidden', String(!open));
    menuToggle?.setAttribute('aria-expanded', String(open));
    menuToggle?.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  }

  menuToggle?.addEventListener('click', () => {
    const open = menuToggle.getAttribute('aria-expanded') === 'true';
    setMenu(!open);
  });

  qsa('.mobile-nav a').forEach((link) => link.addEventListener('click', () => setMenu(false)));

  function updateScrollUI() {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? Math.min(1, Math.max(0, scrollTop / docHeight)) : 0;
    header?.classList.toggle('is-scrolled', scrollTop > 18);
    if (progressFill) progressFill.style.transform = `scaleY(${progress})`;
    if (timecode) {
      const totalSeconds = Math.floor(progress * 312);
      const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
      const seconds = String(totalSeconds % 60).padStart(2, '0');
      timecode.textContent = `00:${minutes}:${seconds}`;
    }
    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(updateScrollUI);
  }, { passive: true });
  updateScrollUI();

  const revealObserver = reduceMotion ? null : new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

  qsa('[data-reveal]').forEach((element) => {
    if (reduceMotion) element.classList.add('is-visible');
    else revealObserver?.observe(element);
  });

  const sceneObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      entry.target.classList.toggle('is-active', entry.isIntersecting && entry.intersectionRatio > 0.4);
    });
  }, { threshold: [0.4, 0.65] });
  qsa('.scene').forEach((scene) => sceneObserver.observe(scene));

  function openLetter(key, trigger) {
    const letter = letters[key];
    if (!letter || !dialog || !dialogTitle || !dialogCopy) return;
    lastTrigger = trigger || document.activeElement;
    dialogTitle.textContent = letter.title;
    dialogCopy.replaceChildren(...letter.copy.map((text) => {
      const p = document.createElement('p');
      p.textContent = text;
      return p;
    }));
    document.body.classList.add('dialog-open');
    dialog.showModal();
    requestAnimationFrame(() => dialogClose?.focus());
  }

  qsa('[data-letter]').forEach((button) => {
    button.addEventListener('click', () => openLetter(button.dataset.letter, button));
  });

  function closeDialog() {
    if (!dialog?.open) return;
    dialog.close();
  }

  dialogClose?.addEventListener('click', closeDialog);
  dialog?.addEventListener('click', (event) => {
    const rect = dialog.getBoundingClientRect();
    const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
    if (!inside) closeDialog();
  });
  dialog?.addEventListener('close', () => {
    document.body.classList.remove('dialog-open');
    if (lastTrigger instanceof HTMLElement) lastTrigger.focus();
    lastTrigger = null;
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (dialog?.open) closeDialog();
    else setMenu(false);
  });

  if (!reduceMotion && heroObject && window.matchMedia('(pointer:fine)').matches) {
    const hero = qs('.hero');
    hero?.addEventListener('pointermove', (event) => {
      const rect = hero.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width - 0.5) * 10;
      const y = ((event.clientY - rect.top) / rect.height - 0.5) * 10;
      heroObject.style.transform = `translate3d(${x}px, ${y}px, 0) rotateX(${-y * 0.35}deg) rotateY(${x * 0.35}deg)`;
    });
    hero?.addEventListener('pointerleave', () => {
      heroObject.style.transform = '';
    });
  }
})();
