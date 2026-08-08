const qs = (selector, scope = document) => scope.querySelector(selector);
const qsa = (selector, scope = document) => [...scope.querySelectorAll(selector)];

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

/* ---------- base UI ---------- */
const header = qs('.site-header');
const menuToggle = qs('.menu-toggle');
const mobileMenu = qs('.mobile-menu');
const progress = qs('#page-progress');
const profileAvatar = qs('#profile-avatar');
const cursor = qs('.cursor-orbit');
const repoCount = qs('#repo-count');

qsa('.current-year').forEach((node) => { node.textContent = new Date().getFullYear(); });

let scrollFrame = null;
function syncScrollUI() {
  scrollFrame = null;
  const y = window.scrollY;
  const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  header?.classList.toggle('is-scrolled', y > 18);
  if (progress) progress.style.transform = `scaleX(${Math.min(1, Math.max(0, y / max))})`;
}

window.addEventListener('scroll', () => {
  if (scrollFrame) return;
  scrollFrame = requestAnimationFrame(syncScrollUI);
}, { passive: true });
window.addEventListener('resize', syncScrollUI, { passive: true });
syncScrollUI();

/* ---------- Türkiye clock ---------- */
const timeNode = qs('#istanbul-time');
function updateTürkiyeClock() {
  if (!timeNode) return;
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Istanbul',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date());
  timeNode.textContent = `Türkiye · ${time}`;
}
updateTürkiyeClock();
setInterval(updateTürkiyeClock, 30000);

/* ---------- mobile navigation ---------- */
function setMenu(open, { restoreFocus = false } = {}) {
  document.body.classList.toggle('menu-open', open);
  mobileMenu?.classList.toggle('is-open', open);
  mobileMenu?.setAttribute('aria-hidden', String(!open));
  menuToggle?.setAttribute('aria-expanded', String(open));
  menuToggle?.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');

  if (open) requestAnimationFrame(() => qs('a', mobileMenu)?.focus());
  if (!open && restoreFocus) menuToggle?.focus();
}

menuToggle?.addEventListener('click', () => {
  setMenu(menuToggle.getAttribute('aria-expanded') !== 'true');
});
qsa('.mobile-menu a').forEach((link) => link.addEventListener('click', () => setMenu(false)));
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && document.body.classList.contains('menu-open')) setMenu(false, { restoreFocus: true });
});
window.addEventListener('resize', () => {
  if (window.innerWidth > 900 && document.body.classList.contains('menu-open')) setMenu(false);
}, { passive: true });

/* ---------- reveal system ---------- */
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

function observeReveals(scope) {
  qsa('.reveal', scope).forEach((node, index) => {
    node.style.transitionDelay = `${Math.min(index * 55, 220)}ms`;
    if (revealObserver) revealObserver.observe(node);
    else node.classList.add('is-visible');
  });
}

/* ---------- active navigation ---------- */
const sectionLinks = new Map(
  qsa('.desktop-nav [data-nav]').map((link) => [link.dataset.nav, link])
);

if ('IntersectionObserver' in window) {
  const sectionObserver = new IntersectionObserver((entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible) return;
    sectionLinks.forEach((link, id) => link.classList.toggle('is-active', id === visible.target.id));
  }, { rootMargin: '-28% 0px -58%', threshold: [0.01, 0.2, 0.5] });

  ['work', 'practice', 'about', 'contact'].forEach((id) => {
    const section = document.getElementById(id);
    if (section) sectionObserver.observe(section);
  });
}

/* ---------- pointer detail + magnetic controls ---------- */
function initPointerDetails() {
  if (!cursor || !finePointer.matches || reducedMotion.matches) return;

  let x = -100;
  let y = -100;
  let currentX = x;
  let currentY = y;
  let raf = null;

  const render = () => {
    currentX += (x - currentX) * 0.2;
    currentY += (y - currentY) * 0.2;
    cursor.style.left = `${currentX}px`;
    cursor.style.top = `${currentY}px`;
    if (Math.abs(x - currentX) > .1 || Math.abs(y - currentY) > .1) raf = requestAnimationFrame(render);
    else raf = null;
  };

  window.addEventListener('pointermove', (event) => {
    x = event.clientX;
    y = event.clientY;
    cursor.classList.add('is-visible');
    if (!raf) raf = requestAnimationFrame(render);
  }, { passive: true });
  document.addEventListener('mouseleave', () => cursor.classList.remove('is-visible'));

  const hoverTargets = 'a, button, .project-card, .capability';
  document.addEventListener('pointerover', (event) => {
    if (event.target.closest(hoverTargets)) cursor.classList.add('is-hovering');
  });
  document.addEventListener('pointerout', (event) => {
    if (event.target.closest(hoverTargets)) cursor.classList.remove('is-hovering');
  });

  qsa('.magnetic').forEach((node) => {
    node.addEventListener('pointermove', (event) => {
      const rect = node.getBoundingClientRect();
      const dx = (event.clientX - rect.left - rect.width / 2) * .08;
      const dy = (event.clientY - rect.top - rect.height / 2) * .1;
      node.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
    });
    node.addEventListener('pointerleave', () => { node.style.transform = ''; });
  });
}
initPointerDetails();

/* ---------- GitHub-backed work ---------- */
const repoPriority = ['appanvil', 'NoirWave', 'norform', 'tetris', 'qr-generator', 'architect-portfolio', 'portfolio-2026'];
const displayNames = {
  appanvil: 'AppAnvil',
  NoirWave: 'NoirWave',
  norform: 'Norform',
  tetris: 'Tetris',
  'qr-generator': 'QR Generator',
  'architect-portfolio': 'Architect Portfolio',
  'portfolio-2026': 'Portfolio 2026'
};
const descriptions = {
  appanvil: 'A TypeScript product build focused on practical full-stack execution, clear structure, and maintainable implementation.',
  NoirWave: 'A visually driven TypeScript web experience exploring strong art direction, responsive composition, and interface craft.',
  norform: 'A compact TypeScript project centered on structured form experiences, dependable states, and low-friction user flows.',
  tetris: 'A browser implementation of the classic game with TypeScript game logic, responsive controls, and focused interaction design.',
  'qr-generator': 'A direct QR utility designed around speed, clarity, and a deliberately low-friction web experience.',
  'architect-portfolio': 'A presentation-focused portfolio experiment exploring visual hierarchy, responsive editorial composition, and polish.',
  'portfolio-2026': 'An earlier portfolio iteration exploring personal brand systems, layout, and digital presentation.'
};
const projectTones = ['#c9ff3b', '#8fc7ff', '#ff9c78', '#d8c7ff', '#ffd66f', '#9be6c2'];

const staticRepos = repoPriority.map((name) => ({
  name,
  description: null,
  language: ['appanvil', 'NoirWave', 'norform', 'tetris'].includes(name) ? 'TypeScript' : name === 'portfolio-2026' ? 'HTML' : 'CSS',
  html_url: `https://github.com/ceskasc/${name}`,
  homepage: null,
  stargazers_count: 0,
  fork: false,
  archived: false,
  pushed_at: null
}));

function escapeHTML(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function nameFor(repo) {
  return displayNames[repo.name] || repo.name.replaceAll('-', ' ');
}

function descriptionFor(repo) {
  return repo.description?.trim() || descriptions[repo.name] || 'A public software project built with a product-minded engineering approach.';
}

function validHomepage(repo) {
  return Boolean(repo.homepage && /^https?:\/\//i.test(repo.homepage));
}

function repoDate(repo) {
  return repo.updated_at || repo.pushed_at || null;
}

function metaFor(repo) {
  const values = [];
  if (repo.language) values.push(repo.language);
  if (Number(repo.stargazers_count) > 0) values.push(`${repo.stargazers_count}★`);
  const raw = repoDate(repo);
  if (raw) {
    const date = new Date(raw);
    if (!Number.isNaN(date.getTime())) values.push(date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
  }
  return values;
}

function sortedRepos(repos) {
  return repos
    .filter((repo) => !repo.fork && !repo.archived && !['ceskasc.github.io', 'ceskasc', 'Canceska'].includes(repo.name))
    .sort((a, b) => {
      const ai = repoPriority.indexOf(a.name);
      const bi = repoPriority.indexOf(b.name);
      if (ai !== -1 || bi !== -1) {
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      }
      return new Date(repoDate(b) || 0) - new Date(repoDate(a) || 0);
    });
}

function glyphFor(repo) {
  return nameFor(repo)
    .split(/\s|-/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function featuredMarkup(repo) {
  const meta = metaFor(repo);
  const live = validHomepage(repo);
  return `
    <div class="project-visual" style="--tone:${projectTones[0]}">
      <div class="project-visual-meta"><span>Featured / 01</span><span>${escapeHTML(repo.language || 'Software')}</span></div>
      <span class="project-glyph" aria-hidden="true">${escapeHTML(glyphFor(repo))}</span>
    </div>
    <div class="project-feature-copy">
      <span class="project-label">Selected project</span>
      <h3>${escapeHTML(nameFor(repo))}</h3>
      <p>${escapeHTML(descriptionFor(repo))}</p>
      <div class="project-tags">${meta.map((item) => `<span>${escapeHTML(item)}</span>`).join('')}</div>
      <div class="project-actions">
        ${live ? `<a href="${escapeHTML(repo.homepage)}" target="_blank" rel="noreferrer">Open live project <span>↗</span></a>` : ''}
        <a class="${live ? 'secondary' : ''}" href="${escapeHTML(repo.html_url)}" target="_blank" rel="noreferrer">View repository <span>↗</span></a>
      </div>
    </div>
  `;
}

function miniMarkup(repo, index) {
  const destination = validHomepage(repo) ? repo.homepage : repo.html_url;
  const meta = metaFor(repo);
  return `
    <a class="mini-project project-card reveal" href="${escapeHTML(destination)}" target="_blank" rel="noreferrer" aria-label="Open ${escapeHTML(nameFor(repo))}" style="--tone:${projectTones[(index + 1) % projectTones.length]}">
      <div class="mini-project-top"><span>${String(index + 2).padStart(2, '0')}</span><span>${escapeHTML(repo.language || 'Project')}</span></div>
      <div class="mini-project-art" aria-hidden="true"></div>
      <h3>${escapeHTML(nameFor(repo))}</h3>
      <p>${escapeHTML(descriptionFor(repo))}</p>
      <div class="mini-project-meta">${meta.map((item) => `<span>${escapeHTML(item)}</span>`).join('')}</div>
    </a>
  `;
}

function renderProjects(repos) {
  const sorted = sortedRepos(repos);
  if (!sorted.length) return false;

  const featured = qs('#featured-project');
  const grid = qs('#project-grid');
  if (featured) featured.innerHTML = featuredMarkup(sorted[0]);
  if (grid) {
    grid.innerHTML = sorted.slice(1, 7).map(miniMarkup).join('');
    observeReveals(grid);
  }
  return true;
}

function updateProfile(profile) {
  if (repoCount && Number(profile?.public_repos) >= 0) repoCount.textContent = `${profile.public_repos} public repos`;
  if (profileAvatar && profile?.avatar_url) {
    profileAvatar.src = `${profile.avatar_url}${profile.avatar_url.includes('?') ? '&' : '?'}size=960`;
  }
}

async function fetchSnapshot() {
  const response = await fetch('./data/github.json', { cache: 'no-cache' });
  if (!response.ok) throw new Error(`Snapshot returned ${response.status}`);
  return response.json();
}

async function fetchLiveRepos() {
  const response = await fetch('https://api.github.com/users/ceskasc/repos?sort=updated&per_page=100', {
    cache: 'no-store',
    headers: { Accept: 'application/vnd.github+json' }
  });
  if (!response.ok) throw new Error(`GitHub API returned ${response.status}`);
  return response.json();
}

async function loadPortfolioData() {
  let rendered = false;
  try {
    const snapshot = await fetchSnapshot();
    updateProfile(snapshot.profile);
    rendered = renderProjects(snapshot.repos || []);
  } catch (error) {
    console.info('Portfolio snapshot unavailable:', error);
  }

  try {
    const liveRepos = await fetchLiveRepos();
    rendered = renderProjects(liveRepos) || rendered;
  } catch (error) {
    console.info('Live GitHub refresh unavailable; keeping cached portfolio data:', error);
  }

  if (!rendered) renderProjects(staticRepos);
}

profileAvatar?.addEventListener('error', () => {
  if (!profileAvatar.src.includes('avatars.githubusercontent.com')) {
    profileAvatar.src = 'https://avatars.githubusercontent.com/u/152553355?v=4&size=960';
  }
}, { once: true });

loadPortfolioData();
