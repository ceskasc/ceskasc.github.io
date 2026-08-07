const qs = (selector, scope = document) => scope.querySelector(selector);
const qsa = (selector, scope = document) => [...scope.querySelectorAll(selector)];

const header = qs('.site-header');
const menuToggle = qs('.menu-toggle');
const mobileMenu = qs('.mobile-menu');
const year = qs('#year');

if (year) year.textContent = new Date().getFullYear();

function updateHeader() {
  header?.classList.toggle('is-scrolled', window.scrollY > 18);
}

window.addEventListener('scroll', updateHeader, { passive: true });
updateHeader();

function closeMenu() {
  document.body.classList.remove('menu-open');
  mobileMenu?.classList.remove('is-open');
  mobileMenu?.setAttribute('aria-hidden', 'true');
  menuToggle?.setAttribute('aria-expanded', 'false');
  menuToggle?.setAttribute('aria-label', 'Open navigation');
}

menuToggle?.addEventListener('click', () => {
  const isOpen = menuToggle.getAttribute('aria-expanded') === 'true';
  if (isOpen) {
    closeMenu();
    return;
  }

  document.body.classList.add('menu-open');
  mobileMenu?.classList.add('is-open');
  mobileMenu?.setAttribute('aria-hidden', 'false');
  menuToggle.setAttribute('aria-expanded', 'true');
  menuToggle.setAttribute('aria-label', 'Close navigation');
});

qsa('.mobile-menu a').forEach((link) => link.addEventListener('click', closeMenu));

const observer = new IntersectionObserver(
  (entries, instance) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      instance.unobserve(entry.target);
    });
  },
  { threshold: 0.12, rootMargin: '0px 0px -40px' }
);

qsa('.reveal').forEach((element) => observer.observe(element));

const repoPriority = ['appanvil', 'NoirWave', 'norform', 'tetris', 'qr-generator', 'architect-portfolio', 'portfolio-2026'];
const repoFallbackDescriptions = {
  appanvil: 'A focused software project exploring practical product engineering and modern implementation patterns.',
  NoirWave: 'A visually driven web project balancing product presentation, interaction, and frontend execution.',
  norform: 'A compact web product centered on form experiences, structure, and reliable user flows.',
  tetris: 'A browser-based implementation of the classic game, focused on responsive interaction and core game logic.',
  'qr-generator': 'A lightweight utility for generating QR codes through a simple, direct web experience.',
  'architect-portfolio': 'A portfolio experience designed around visual hierarchy, responsive presentation, and polished frontend craft.',
  'portfolio-2026': 'An earlier portfolio iteration exploring personal brand, visual systems, and web presentation.'
};

function cleanDescription(repo) {
  return repo.description?.trim() || repoFallbackDescriptions[repo.name] || 'A public software project built with a product-focused engineering approach.';
}

function projectMeta(repo) {
  const parts = [];
  if (repo.language) parts.push(repo.language);
  if (repo.stargazers_count) parts.push(`${repo.stargazers_count} star${repo.stargazers_count === 1 ? '' : 's'}`);
  if (repo.updated_at) {
    const date = new Date(repo.updated_at);
    parts.push(`Updated ${date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`);
  }
  return parts;
}

function repoLink(repo) {
  return repo.homepage || repo.html_url;
}

function sortRepos(repos) {
  return repos
    .filter((repo) => !repo.fork && repo.name !== 'ceskasc.github.io')
    .sort((a, b) => {
      const aPriority = repoPriority.indexOf(a.name);
      const bPriority = repoPriority.indexOf(b.name);
      if (aPriority !== -1 || bPriority !== -1) {
        if (aPriority === -1) return 1;
        if (bPriority === -1) return -1;
        return aPriority - bPriority;
      }
      return new Date(b.updated_at) - new Date(a.updated_at);
    });
}

function renderFeatured(repo) {
  const container = qs('#featured-project');
  if (!container || !repo) return;

  const meta = projectMeta(repo);
  container.innerHTML = `
    <div class="project-feature-index">01</div>
    <div class="project-feature-copy">
      <span class="project-label">Featured project</span>
      <h3>${repo.name}</h3>
      <p>${cleanDescription(repo)}</p>
      <div class="project-meta">${meta.map((item) => `<span>${item}</span>`).join('')}</div>
      <div class="project-feature-links">
        <a class="button button-light" href="${repoLink(repo)}" target="_blank" rel="noreferrer">Open project ↗</a>
        <a class="button button-outline-light" href="${repo.html_url}" target="_blank" rel="noreferrer">Source code ↗</a>
      </div>
    </div>
  `;
}

function renderProjectRows(repos) {
  const container = qs('#project-list');
  if (!container) return;

  container.innerHTML = repos
    .map((repo, index) => {
      const meta = projectMeta(repo);
      return `
        <a class="project-row reveal" href="${repoLink(repo)}" target="_blank" rel="noreferrer">
          <span class="project-row-index">${String(index + 2).padStart(2, '0')}</span>
          <div>
            <h3>${repo.name}</h3>
            <p>${cleanDescription(repo)}</p>
          </div>
          <div class="project-row-meta">${meta.map((item) => `<span>${item}</span>`).join('')}</div>
          <span class="project-row-arrow" aria-hidden="true">↗</span>
        </a>
      `;
    })
    .join('');

  qsa('.reveal', container).forEach((element) => observer.observe(element));
}

function renderProjectFallback() {
  const featured = qs('#featured-project');
  const list = qs('#project-list');

  if (featured) {
    featured.innerHTML = `
      <div class="project-feature-index">01</div>
      <div class="project-feature-copy">
        <span class="project-label">Engineering work</span>
        <h3>Public projects on GitHub</h3>
        <p>GitHub project data is temporarily unavailable. You can still browse the complete public repository history directly.</p>
        <div class="project-feature-links">
          <a class="button button-light" href="https://github.com/ceskasc?tab=repositories" target="_blank" rel="noreferrer">Browse repositories ↗</a>
        </div>
      </div>
    `;
  }

  if (list) list.innerHTML = '';
}

async function loadProjects() {
  try {
    const response = await fetch('https://api.github.com/users/ceskasc/repos?sort=updated&per_page=100', {
      headers: { Accept: 'application/vnd.github+json' }
    });

    if (!response.ok) throw new Error(`GitHub API returned ${response.status}`);

    const repos = sortRepos(await response.json());
    if (!repos.length) throw new Error('No repositories found');

    renderFeatured(repos[0]);
    renderProjectRows(repos.slice(1, 6));
  } catch (error) {
    console.warn('Portfolio project feed could not be loaded:', error);
    renderProjectFallback();
  }
}

loadProjects();
