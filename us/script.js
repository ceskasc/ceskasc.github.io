const qs = (selector, scope = document) => scope.querySelector(selector);
const qsa = (selector, scope = document) => [...scope.querySelectorAll(selector)];

const header = qs('.site-header');
const menuButton = qs('.menu-button');
const mobileNav = qs('.mobile-nav');
const dialog = qs('#letter-dialog');
const dialogTitle = qs('#dialog-title');
const dialogCopy = qs('#dialog-copy');
const dialogClose = qs('.dialog-close');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const letters = {
  miss: {
    title: 'When you miss me',
    paragraphs: [
      'If you opened this because distance feels louder than usual, remember that missing someone is just love noticing the empty space.',
      'There are pieces of you in my ordinary day already — in the songs I hear, the things I want to tell you, and the small moments that automatically become stories I save for later.',
      'This feeling passes. The fact that I would still choose you when it does — that part stays.'
    ]
  },
  hard: {
    title: 'When the day feels heavy',
    paragraphs: [
      'You do not have to be impressive today. You do not have to solve everything before you rest.',
      'Some days are meant to be survived gently. Eat something, breathe, be quiet if you need to be. I would rather have the real version of you than a strong version you had to perform.',
      'Tomorrow can ask more from you. Tonight, existing is enough.'
    ]
  },
  angry: {
    title: "When you're annoyed with me",
    paragraphs: [
      'First: yes, there is a very real possibility that I am being annoying.',
      'But underneath whatever stupid thing happened, I hope we always remember that it is us versus the problem — not me versus you.',
      'Be mad. Say what matters. Make me understand. Then come back when you are ready. I still want the conversation more than I want to win it.'
    ]
  },
  future: {
    title: 'When you think about our future',
    paragraphs: [
      'I do not need every detail of the future to be certain before I can be excited about it.',
      'I like the thought of future versions of us remembering who we are right now — still figuring things out, still making plans, still finding new reasons to laugh at the same person.',
      'Whatever the scenery looks like later, I hope the feeling stays familiar: you, me, and a life that slowly learned how to make room for both.'
    ]
  }
};

function updateHeader() {
  header?.classList.toggle('scrolled', window.scrollY > 24);
}

function closeMenu() {
  document.body.classList.remove('menu-open');
  mobileNav?.classList.remove('open');
  mobileNav?.setAttribute('aria-hidden', 'true');
  menuButton?.setAttribute('aria-expanded', 'false');
  menuButton?.setAttribute('aria-label', 'Open navigation');
}

function openMenu() {
  document.body.classList.add('menu-open');
  mobileNav?.classList.add('open');
  mobileNav?.setAttribute('aria-hidden', 'false');
  menuButton?.setAttribute('aria-expanded', 'true');
  menuButton?.setAttribute('aria-label', 'Close navigation');
}

menuButton?.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') === 'true';
  open ? closeMenu() : openMenu();
});

qsa('.mobile-nav a').forEach((link) => link.addEventListener('click', closeMenu));
window.addEventListener('scroll', updateHeader, { passive: true });
updateHeader();

const observer = reduceMotion
  ? null
  : new IntersectionObserver(
      (entries, instance) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('visible');
          instance.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -36px' }
    );

qsa('.reveal').forEach((element) => {
  if (reduceMotion) element.classList.add('visible');
  else observer?.observe(element);
});

function openLetter(key) {
  const letter = letters[key];
  if (!letter || !dialog || !dialogTitle || !dialogCopy) return;

  dialogTitle.textContent = letter.title;
  dialogCopy.innerHTML = letter.paragraphs.map((text) => `<p>${text}</p>`).join('');
  dialog.showModal();
  dialogClose?.focus();
}

qsa('.letter-card').forEach((card) => {
  card.addEventListener('click', () => openLetter(card.dataset.letter));
});

dialogClose?.addEventListener('click', () => dialog?.close());

dialog?.addEventListener('click', (event) => {
  if (event.target === dialog) dialog.close();
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  if (dialog?.open) dialog.close();
  else closeMenu();
});

if (!reduceMotion) {
  const emblem = qs('.hero-emblem');
  const hero = qs('.hero');

  hero?.addEventListener('pointermove', (event) => {
    if (!emblem || event.pointerType === 'touch') return;
    const rect = hero.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 10;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 10;
    emblem.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  });

  hero?.addEventListener('pointerleave', () => {
    if (emblem) emblem.style.transform = '';
  });
}
