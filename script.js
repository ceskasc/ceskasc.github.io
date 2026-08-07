const qs = (selector, scope = document) => scope.querySelector(selector);
const qsa = (selector, scope = document) => [...scope.querySelectorAll(selector)];

const header = qs('.site-header');
const menuToggle = qs('.menu-toggle');
const mobileMenu = qs('.mobile-menu');
const year = qs('#year');
const profileAvatar = qs('#profile-avatar');

if (year) year.textContent = new Date().getFullYear();

/* ---------- Header + mobile navigation ---------- */
function updateHeader() {
  header?.classList.toggle('is-scrolled', window.scrollY > 18);
}

window.addEventListener('scroll', updateHeader, { passive: true });
updateHeader();

function closeMenu({ restoreFocus = false } = {}) {
  document.body.classList.remove('menu-open');
  mobileMenu?.classList.remove('is-open');
  mobileMenu?.setAttribute('aria-hidden', 'true');
  menuToggle?.setAttribute('aria-expanded', 'false');
  menuToggle?.setAttribute('aria-label', 'Open navigation');
  if (restoreFocus) menuToggle?.focus();
}

function openMenu() {
  document.body.classList.add('menu-open');
  mobileMenu?.classList.add('is-open');
  mobileMenu?.setAttribute('aria-hidden', 'false');
  menuToggle?.setAttribute('aria-expanded', 'true');
  menuToggle?.setAttribute('aria-label', 'Close navigation');
  requestAnimationFrame(() => qs('a', mobileMenu)?.focus());
}

menuToggle?.addEventListener('click', () => {
  const isOpen = menuToggle.getAttribute('aria-expanded') === 'true';
  isOpen ? closeMenu() : openMenu();
});

qsa('.mobile-menu a').forEach((link) => link.addEventListener('click', () => closeMenu()));

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && document.body.classList.contains('menu-open')) {
    closeMenu({ restoreFocus: true });
  }
});

window.addEventListener('resize', () => {
  if (window.innerWidth > 760 && document.body.classList.contains('menu-open')) closeMenu();
}, { passive: true });

/* ---------- Reveal motion ---------- */
let revealObserver = null;

if ('IntersectionObserver' in window) {
  revealObserver = new IntersectionObserver(
    (entries, instance) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        instance.unobserve(entry.target);
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -36px' }
  );
  qsa('.reveal').forEach((element) => revealObserver.observe(element));
} else {
  qsa('.reveal').forEach((element) => element.classList.add('is-visible'));
}

function observeNewReveals(scope) {
  qsa('.reveal', scope).forEach((element) => {
    if (revealObserver) revealObserver.observe(element);
    else element.classList.add('is-visible');
  });
}

/* ---------- GitHub-backed portfolio data ---------- */
const repoPriority = ['appanvil', 'NoirWave', 'norform', 'tetris', 'qr-generator', 'architect-portfolio', 'portfolio-2026'];

const repoDisplayNames = {
  appanvil: 'AppAnvil',
  NoirWave: 'NoirWave',
  norform: 'Norform',
  tetris: 'Tetris',
  'qr-generator': 'QR Generator',
  'architect-portfolio': 'Architect Portfolio',
  'portfolio-2026': 'Portfolio 2026'
};

const repoFallbackDescriptions = {
  appanvil: 'A product-focused software project exploring practical full-stack engineering and clean implementation patterns.',
  NoirWave: 'A visually driven web project balancing interface craft, responsive behavior, and frontend execution.',
  norform: 'A compact TypeScript project centered on structured form experiences and dependable user flows.',
  tetris: 'A browser-based implementation of the classic game with responsive controls and TypeScript game logic.',
  'qr-generator': 'A lightweight QR utility designed around a direct, low-friction web experience.',
  'architect-portfolio': 'A visual portfolio experiment focused on hierarchy, responsive composition, and presentation quality.',
  'portfolio-2026': 'An earlier portfolio iteration exploring personal brand, layout systems, and web presentation.'
};

const staticFallbackRepos = repoPriority.map((name) => ({
  name,
  description: null,
  language: ['appanvil', 'NoirWave', 'norform', 'tetris'].includes(name) ? 'TypeScript' : name === 'portfolio-2026' ? 'HTML' : 'CSS',
  html_url: `https://github.com/ceskasc/${name}`,
  homepage: null,
  stargazers_count: 0,
  fork: false,
  archived: false
}));

function escapeHTML(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function displayName(repo) {
  return repoDisplayNames[repo.name] || repo.name.replaceAll('-', ' ');
}

function cleanDescription(repo) {
  return repo.description?.trim() || repoFallbackDescriptions[repo.name] || 'A public software project built with a product-focused engineering approach.';
}

function repoDate(repo) {
  return repo.updated_at || repo.pushed_at || null;
}

function projectMeta(repo) {
  const parts = [];
  if (repo.language) parts.push(repo.language);
  if (Number(repo.stargazers_count) > 0) parts.push(`${repo.stargazers_count} star${repo.stargazers_count === 1 ? '' : 's'}`);

  const rawDate = repoDate(repo);
  if (rawDate) {
    const date = new Date(rawDate);
    if (!Number.isNaN(date.getTime())) {
      parts.push(`Updated ${date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`);
    }
  }
  return parts;
}

function hasLiveProject(repo) {
  return Boolean(repo.homepage && /^https?:\/\//i.test(repo.homepage));
}

function primaryRepoLink(repo) {
  return hasLiveProject(repo) ? repo.homepage : repo.html_url;
}

function sortRepos(repos) {
  return repos
    .filter((repo) => !repo.fork && !repo.archived && repo.name !== 'ceskasc.github.io' && repo.name !== 'ceskasc')
    .sort((a, b) => {
      const aPriority = repoPriority.indexOf(a.name);
      const bPriority = repoPriority.indexOf(b.name);

      if (aPriority !== -1 || bPriority !== -1) {
        if (aPriority === -1) return 1;
        if (bPriority === -1) return -1;
        return aPriority - bPriority;
      }

      return new Date(repoDate(b) || 0) - new Date(repoDate(a) || 0);
    });
}

function buttonMarkup({ href, label, type = 'light' }) {
  const buttonClass = type === 'outline' ? 'button button-outline-light' : 'button button-light';
  return `<a class="${buttonClass}" href="${escapeHTML(href)}" target="_blank" rel="noreferrer"><span class="button-label">${escapeHTML(label)}</span><span class="button-icon" aria-hidden="true">↗</span></a>`;
}

function renderFeatured(repo) {
  const container = qs('#featured-project');
  if (!container || !repo) return;

  const meta = projectMeta(repo);
  const live = hasLiveProject(repo);
  const actions = live
    ? `${buttonMarkup({ href: repo.homepage, label: 'Open live project' })}${buttonMarkup({ href: repo.html_url, label: 'View repository', type: 'outline' })}`
    : buttonMarkup({ href: repo.html_url, label: 'View repository' });

  container.innerHTML = `
    <div class="project-feature-index">01</div>
    <div class="project-feature-copy">
      <span class="project-label">Featured project</span>
      <h3>${escapeHTML(displayName(repo))}</h3>
      <p>${escapeHTML(cleanDescription(repo))}</p>
      ${meta.length ? `<div class="project-meta">${meta.map((item) => `<span>${escapeHTML(item)}</span>`).join('')}</div>` : ''}
      <div class="project-feature-links">${actions}</div>
    </div>
  `;
}

function renderProjectRows(repos) {
  const container = qs('#project-list');
  if (!container) return;

  container.innerHTML = repos
    .map((repo, index) => {
      const meta = projectMeta(repo);
      const destination = primaryRepoLink(repo);
      const destinationLabel = hasLiveProject(repo) ? 'Open live project' : 'Open GitHub repository';

      return `
        <a class="project-row reveal" href="${escapeHTML(destination)}" target="_blank" rel="noreferrer" aria-label="${escapeHTML(destinationLabel)}: ${escapeHTML(displayName(repo))}">
          <span class="project-row-index">${String(index + 2).padStart(2, '0')}</span>
          <div>
            <h3>${escapeHTML(displayName(repo))}</h3>
            <p>${escapeHTML(cleanDescription(repo))}</p>
          </div>
          <div class="project-row-meta">${meta.map((item) => `<span>${escapeHTML(item)}</span>`).join('')}</div>
          <span class="project-row-arrow" aria-hidden="true">↗</span>
        </a>
      `;
    })
    .join('');

  observeNewReveals(container);
}

function renderProjects(repos) {
  const sorted = sortRepos(repos);
  if (!sorted.length) return false;
  renderFeatured(sorted[0]);
  renderProjectRows(sorted.slice(1, 6));
  return true;
}

function updateAvatarFromProfile(profile) {
  if (!profileAvatar || !profile?.avatar_url) return;
  // Keep the image GitHub-hosted and use the current profile avatar returned by GitHub.
  profileAvatar.src = `${profile.avatar_url}${profile.avatar_url.includes('?') ? '&' : '?'}size=480`;
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

async function loadProjects() {
  let rendered = false;

  try {
    const snapshot = await fetchSnapshot();
    updateAvatarFromProfile(snapshot.profile);
    rendered = renderProjects(snapshot.repos || []);
  } catch (error) {
    console.info('Local GitHub snapshot unavailable:', error);
  }

  try {
    const liveRepos = await fetchLiveRepos();
    rendered = renderProjects(liveRepos) || rendered;
  } catch (error) {
    console.info('Live GitHub refresh unavailable; using cached portfolio data:', error);
  }

  if (!rendered) renderProjects(staticFallbackRepos);
}

profileAvatar?.addEventListener('error', () => {
  if (!profileAvatar.src.includes('avatars.githubusercontent.com')) {
    profileAvatar.src = 'https://avatars.githubusercontent.com/u/152553355?v=4&size=480';
  }
}, { once: true });

loadProjects();
