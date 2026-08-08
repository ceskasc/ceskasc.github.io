const qs = (selector, scope = document) => scope.querySelector(selector);
const qsa = (selector, scope = document) => [...scope.querySelectorAll(selector)];

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const header = qs('.site-header');
const menuToggle = qs('.menu-toggle');
const mobileMenu = qs('.mobile-menu');
const progress = qs('#scroll-progress');
const repoCount = qs('#repo-count');

qsa('.current-year').forEach((node) => {
  node.textContent = new Date().getFullYear();
});

let scrollFrame = 0;
function syncScrollUI() {
  scrollFrame = 0;
  const y = window.scrollY;
  const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  header?.classList.toggle('is-scrolled', y > 24);
  if (progress) progress.style.transform = `scaleX(${Math.min(1, Math.max(0, y / max))})`;
}

window.addEventListener('scroll', () => {
  if (scrollFrame) return;
  scrollFrame = requestAnimationFrame(syncScrollUI);
}, { passive: true });
window.addEventListener('resize', syncScrollUI, { passive: true });
syncScrollUI();

function updateClock() {
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Istanbul',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date());

  const heroClock = qs('#istanbul-time');
  const contactClock = qs('#contact-time');
  if (heroClock) heroClock.textContent = `Local time · ${time}`;
  if (contactClock) contactClock.textContent = `Türkiye · ${time}`;
}
updateClock();
setInterval(updateClock, 30000);

function setMenu(open, { restoreFocus = false } = {}) {
  document.body.classList.toggle('menu-open', open);
  mobileMenu?.classList.toggle('is-open', open);
  mobileMenu?.setAttribute('aria-hidden', String(!open));
  menuToggle?.setAttribute('aria-expanded', String(open));
  menuToggle?.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');

  if (mobileMenu) mobileMenu.inert = !open;
  if (open) requestAnimationFrame(() => qs('a', mobileMenu)?.focus());
  if (!open && restoreFocus) menuToggle?.focus();
}

menuToggle?.addEventListener('click', () => {
  setMenu(menuToggle.getAttribute('aria-expanded') !== 'true');
});

qsa('.mobile-menu a').forEach((link) => {
  link.addEventListener('click', () => setMenu(false));
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && document.body.classList.contains('menu-open')) {
    setMenu(false, { restoreFocus: true });
  }

  if (event.key !== 'Tab' || !document.body.classList.contains('menu-open') || !mobileMenu) return;
  const focusable = qsa('a[href], button:not([disabled])', mobileMenu);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});

window.addEventListener('resize', () => {
  if (window.innerWidth > 900 && document.body.classList.contains('menu-open')) setMenu(false);
}, { passive: true });

let revealObserver = null;
if ('IntersectionObserver' in window && !reducedMotion.matches) {
  revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -6%' });

  qsa('.reveal').forEach((node) => revealObserver.observe(node));
} else {
  qsa('.reveal').forEach((node) => node.classList.add('is-visible'));
}

const sectionLinks = new Map(qsa('.desktop-nav [data-nav]').map((link) => [link.dataset.nav, link]));
if ('IntersectionObserver' in window) {
  const sectionObserver = new IntersectionObserver((entries) => {
    const active = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!active) return;
    sectionLinks.forEach((link, id) => link.classList.toggle('is-active', id === active.target.id));
  }, { rootMargin: '-30% 0px -58%', threshold: [0.01, 0.2, 0.5] });

  ['work', 'experience', 'practice', 'about', 'contact'].forEach((id) => {
    const section = document.getElementById(id);
    if (section) sectionObserver.observe(section);
  });
}

function formatMonthYear(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function enhanceProjectCard(repo) {
  const card = qs(`[data-repo="${CSS.escape(repo.name)}"]`);
  if (!card) return;

  const language = qs('[data-project-language]', card);
  const date = qs('[data-project-date]', card);
  const stars = qs('[data-project-stars]', card);
  const link = qs('[data-project-link]', card);

  if (language && repo.language) language.textContent = repo.language;
  const formattedDate = formatMonthYear(repo.updated_at || repo.pushed_at);
  if (date && formattedDate) date.textContent = `Updated ${formattedDate}`;
  if (stars) stars.textContent = Number(repo.stargazers_count) > 0 ? `${repo.stargazers_count} star${repo.stargazers_count === 1 ? '' : 's'}` : 'Public source';

  const homepage = typeof repo.homepage === 'string' && /^https?:\/\//i.test(repo.homepage) ? repo.homepage : null;
  if (link) {
    link.href = homepage || repo.html_url || link.href;
    if (homepage) link.firstChild.textContent = 'Open live project ';
  }
}

async function enhanceFromSnapshot() {
  try {
    const response = await fetch('./data/github.json', { cache: 'no-cache' });
    if (!response.ok) throw new Error(`Snapshot returned ${response.status}`);
    const snapshot = await response.json();

    if (repoCount && Number.isFinite(Number(snapshot.profile?.public_repos))) {
      repoCount.textContent = `${snapshot.profile.public_repos} public repos`;
    }

    (snapshot.repos || []).forEach(enhanceProjectCard);
  } catch (error) {
    console.info('GitHub snapshot unavailable; static portfolio content remains active.', error);
  }
}

enhanceFromSnapshot();