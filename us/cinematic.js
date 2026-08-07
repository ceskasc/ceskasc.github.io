(() => {
  const qs = (selector, scope = document) => scope.querySelector(selector);
  const qsa = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const intro = qs('#intro');
  const introSkip = qs('.intro-skip');
  const header = qs('#site-header');
  const menuToggle = qs('.menu-toggle');
  const mobileNav = qs('#mobile-nav');
  const progressFill = qs('#progress-fill');
  const timecode = qs('#timecode');
  const hero = qs('.hero');
  const heroObject = qs('#hero-object');
  const dialog = qs('#letter-dialog');
  const dialogTitle = qs('#dialog-title');
  const dialogNumber = qs('#dialog-number');
  const dialogCopy = qs('#dialog-copy');
  const dialogClose = qs('.dialog-close');

  const letters = {
    miss: {
      number: '01',
      title: 'When you miss me',
      paragraphs: [
        'If the distance feels louder than usual today, remember that missing someone is love noticing the empty space where they normally belong.',
        'There are already pieces of you inside my ordinary day — in songs, in thoughts I save to tell you later, in the reflex of wanting to turn toward you when something happens.',
        'The distance is temporary. The instinct to choose you when it closes again is the part I care about.'
      ]
    },
    heavy: {
      number: '02',
      title: 'When the day feels heavy',
      paragraphs: [
        'You do not have to be impressive today. You do not have to solve every unfinished thing before you are allowed to rest.',
        'Some days are meant to be carried gently. Eat something. Be quiet if you need to be. Tell me less, not more, if words are expensive today.',
        'I would rather have the real version of you than a strong version you had to perform.'
      ]
    },
    angry: {
      number: '03',
      title: 'When you are angry with me',
      paragraphs: [
        'There is a fair chance I have done something irritating. You are allowed to be angry about it.',
        'But underneath the bad timing, the wrong sentence or whatever ridiculous thing happened, I hope we remember that it is still us versus the problem — not me versus you.',
        'Say what matters. Make me understand. I want the conversation more than I want to win it.'
      ]
    },
    future: {
      number: '04',
      title: 'When you think about our future',
      paragraphs: [
        'I do not need every detail of the future to be certain before I can be excited about it.',
        'I like imagining older versions of us remembering who we are right now: still figuring things out, still changing, still making room for another person inside plans that once belonged to only one.',
        'Whatever the scenery looks like later, I hope the feeling is familiar — you, me, and a life that learned how to hold both.'
      ]
    }
  };

  function hideIntro() {
    if (!intro || intro.classList.contains('is-hidden')) return;
    intro.classList.add('is-hidden');
    window.setTimeout(() => intro.remove(), 900);
  }

  if (intro) {
    const seen = sessionStorage.getItem('ours-intro-seen');
    if (reduceMotion || seen) {
      intro.remove();
    } else {
      sessionStorage.setItem('ours-intro-seen', '1');
      window.setTimeout(hideIntro, 2350);
      introSkip?.addEventListener('click', hideIntro);
    }
  }

  function updateHeader() {
    header?.classList.toggle('is-scrolled', window.scrollY > 24);
  }

  let scrollTicking = false;
  function updateScrollUI() {
    const max = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
    const progress = Math.min(Math.max(window.scrollY / max, 0), 1);
    if (progressFill) progressFill.style.transform = `scaleY(${progress})`;
    updateHeader();
    scrollTicking = false;
  }

  window.addEventListener('scroll', () => {
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(updateScrollUI);
  }, { passive: true });
  updateScrollUI();

  function closeMenu({ restoreFocus = true } = {}) {
    document.body.classList.remove('menu-open');
    mobileNav?.classList.remove('is-open');
    mobileNav?.setAttribute('aria-hidden', 'true');
    menuToggle?.setAttribute('aria-expanded', 'false');
    menuToggle?.setAttribute('aria-label', 'Open navigation');
    if (restoreFocus) menuToggle?.focus({ preventScroll: true });
  }

  function openMenu() {
    document.body.classList.add('menu-open');
    mobileNav?.classList.add('is-open');
    mobileNav?.setAttribute('aria-hidden', 'false');
    menuToggle?.setAttribute('aria-expanded', 'true');
    menuToggle?.setAttribute('aria-label', 'Close navigation');
    qs('a', mobileNav)?.focus({ preventScroll: true });
  }

  menuToggle?.addEventListener('click', () => {
    const open = menuToggle.getAttribute('aria-expanded') === 'true';
    open ? closeMenu({ restoreFocus: false }) : openMenu();
  });
  qsa('a', mobileNav).forEach(link => link.addEventListener('click', () => closeMenu({ restoreFocus: false })));

  const revealNodes = qsa('[data-reveal]');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealNodes.forEach(node => node.classList.add('is-visible'));
  } else {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -7% 0px' });
    revealNodes.forEach(node => revealObserver.observe(node));
  }

  const startedAt = performance.now();
  function renderTimecode(now) {
    if (!timecode) return;
    const elapsed = Math.max(now - startedAt, 0);
    const totalSeconds = Math.floor(elapsed / 1000);
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    const frames = Math.floor((elapsed % 1000) / (1000 / 24)).toString().padStart(2, '0');
    timecode.textContent = `${minutes}:${seconds}:${frames}`;
    requestAnimationFrame(renderTimecode);
  }
  requestAnimationFrame(renderTimecode);

  if (!reduceMotion) {
    window.addEventListener('pointermove', event => {
      if (event.pointerType === 'touch') return;
      const nx = event.clientX / window.innerWidth - .5;
      const ny = event.clientY / window.innerHeight - .5;
      document.documentElement.style.setProperty('--mx', (nx * 18).toFixed(2));
      document.documentElement.style.setProperty('--my', (ny * 14).toFixed(2));
    }, { passive: true });

    hero?.addEventListener('pointermove', event => {
      if (!heroObject || event.pointerType === 'touch') return;
      const rect = hero.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width - .5) * 12;
      const y = ((event.clientY - rect.top) / rect.height - .5) * 12;
      heroObject.style.transform = `perspective(900px) rotateX(${-y * .28}deg) rotateY(${x * .28}deg) translate3d(${x}px, ${y}px, 0)`;
    });
    hero?.addEventListener('pointerleave', () => {
      if (heroObject) heroObject.style.transform = '';
    });
  }

  function openLetter(key) {
    const letter = letters[key];
    if (!letter || !dialog || !dialogTitle || !dialogCopy || !dialogNumber) return;
    dialogNumber.textContent = letter.number;
    dialogTitle.textContent = letter.title;
    dialogCopy.replaceChildren(...letter.paragraphs.map(text => {
      const p = document.createElement('p');
      p.textContent = text;
      return p;
    }));
    document.body.classList.add('dialog-open');
    dialog.showModal();
    dialogClose?.focus();
  }

  function closeDialog() {
    if (!dialog?.open) return;
    dialog.close();
    document.body.classList.remove('dialog-open');
  }

  qsa('.letter').forEach(letter => letter.addEventListener('click', () => openLetter(letter.dataset.letter)));
  dialogClose?.addEventListener('click', closeDialog);
  dialog?.addEventListener('click', event => {
    const rect = dialog.getBoundingClientRect();
    const outside = event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
    if (outside) closeDialog();
  });
  dialog?.addEventListener('close', () => document.body.classList.remove('dialog-open'));

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    if (dialog?.open) closeDialog();
    else if (menuToggle?.getAttribute('aria-expanded') === 'true') closeMenu();
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 1100 && menuToggle?.getAttribute('aria-expanded') === 'true') {
      closeMenu({ restoreFocus: false });
    }
  }, { passive: true });
})();
