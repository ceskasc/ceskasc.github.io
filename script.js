// INITIAL LOAD ANIMATIONS
document.addEventListener('DOMContentLoaded', () => {
    // Reveal elements with delay
    const elementsToReveal = document.querySelectorAll('.hidden-onload');
    elementsToReveal.forEach((el, index) => {
        setTimeout(() => {
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
            el.style.transition = 'all 0.8s cubic-bezier(0.645, 0.045, 0.355, 1)';
        }, 100 * index);
    });

    // Custom Cursor
    const cursorDot = document.querySelector('.cursor-dot');
    const cursorOutline = document.querySelector('.cursor-outline');

    if (window.matchMedia("(pointer: fine)").matches) {
        window.addEventListener('mousemove', (e) => {
            const posX = e.clientX;
            const posY = e.clientY;

            cursorDot.style.left = `${posX}px`;
            cursorDot.style.top = `${posY}px`;

            // Add a slight delay to the outline for physical feel
            cursorOutline.animate({
                left: `${posX}px`,
                top: `${posY}px`
            }, { duration: 500, fill: "forwards" });
        });

        // Add hover effect
        document.body.addEventListener('mouseover', (e) => {
            if (e.target.closest('a') || e.target.closest('button') || e.target.closest('.project-card')) {
                cursorOutline.classList.add('hover');
            }
        });
        document.body.addEventListener('mouseout', (e) => {
            if (e.target.closest('a') || e.target.closest('button') || e.target.closest('.project-card')) {
                cursorOutline.classList.remove('hover');
            }
        });
    } else {
        cursorDot.style.display = 'none';
        cursorOutline.style.display = 'none';
    }

    // Navbar Scroll Effect
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;
        if (currentScroll > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // Scroll Reveal (Intersection Observer)
    const revealElements = document.querySelectorAll('.scroll-reveal');
    const revealOptions = {
        threshold: 0.15,
        rootMargin: "0px 0px -50px 0px"
    };

    const revealObserver = new IntersectionObserver(function(entries, observer) {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
        });
    }, revealOptions);

    revealElements.forEach(el => revealObserver.observe(el));

    // Terminal Typing Effect
    const typingText = document.getElementById('typing-text');
    const commands = [
        { text: "> initializing system...", delay: 50 },
        { text: "> loading dependencies [react, node, typescript]...", delay: 800 },
        { text: "> fetching profile data...", delay: 1500 },
        { text: "> compiling assets...", delay: 2200 },
        { text: "> ✔ system ready.", delay: 3000, color: '#27C93F' },
        { text: "> executing ./launch_portfolio.sh", delay: 3500 },
        { text: "Welcome to my digital workspace.", delay: 4200, color: '#00F0FF' }
    ];
    
    commands.forEach(cmd => {
        setTimeout(() => {
            const line = document.createElement('div');
            line.style.opacity = '0';
            line.style.transform = 'translateY(10px)';
            line.style.transition = 'all 0.3s ease';
            line.style.marginTop = '4px';
            if (cmd.color) line.style.color = cmd.color;
            line.textContent = cmd.text;
            typingText.appendChild(line);
            
            // Reflow
            void line.offsetWidth;
            
            line.style.opacity = '1';
            line.style.transform = 'translateY(0)';
        }, cmd.delay);
    });

    // Background Matrix/Node Canvas
    const canvas = document.getElementById('matrix-canvas');
    if(canvas) {
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        let particlesArray = [];

        class Particle {
            constructor(x, y, directionX, directionY, size, color) {
                this.x = x;
                this.y = y;
                this.directionX = directionX;
                this.directionY = directionY;
                this.size = size;
                this.color = color;
            }
            draw() {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
                ctx.fillStyle = '#00F0FF';
                ctx.fill();
            }
            update() {
                if (this.x > canvas.width || this.x < 0) this.directionX = -this.directionX;
                if (this.y > canvas.height || this.y < 0) this.directionY = -this.directionY;
                this.x += this.directionX;
                this.y += this.directionY;
                this.draw();
            }
        }

        function initParticles() {
            particlesArray = [];
            // reduce dots count
            let numberOfParticles = (canvas.height * canvas.width) / 25000;
            for (let i = 0; i < numberOfParticles; i++) {
                let size = (Math.random() * 2) + 1;
                let x = (Math.random() * ((innerWidth - size * 2) - (size * 2)) + size * 2);
                let y = (Math.random() * ((innerHeight - size * 2) - (size * 2)) + size * 2);
                let directionX = (Math.random() * 1) - 0.5;
                let directionY = (Math.random() * 1) - 0.5;
                let color = '#00F0FF';
                particlesArray.push(new Particle(x, y, directionX, directionY, size, color));
            }
        }

        function connect() {
            let opacityValue = 1;
            for (let a = 0; a < particlesArray.length; a++) {
                for (let b = a; b < particlesArray.length; b++) {
                    let distance = ((particlesArray[a].x - particlesArray[b].x) * (particlesArray[a].x - particlesArray[b].x))
                        + ((particlesArray[a].y - particlesArray[b].y) * (particlesArray[a].y - particlesArray[b].y));
                    if (distance < (canvas.width / 7) * (canvas.height / 7)) {
                        opacityValue = 1 - (distance / 20000);
                        ctx.strokeStyle = 'rgba(0, 240, 255,' + opacityValue + ')';
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(particlesArray[a].x, particlesArray[a].y);
                        ctx.lineTo(particlesArray[b].x, particlesArray[b].y);
                        ctx.stroke();
                    }
                }
            }
        }

        function animateParticles() {
            requestAnimationFrame(animateParticles);
            ctx.clearRect(0, 0, innerWidth, innerHeight);
            for (let i = 0; i < particlesArray.length; i++) {
                particlesArray[i].update();
            }
            connect();
        }

        window.addEventListener('resize', () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            initParticles();
        });

        initParticles();
        animateParticles();
    }

    // Fetch GitHub Projects
    async function fetchGithubProjects() {
        const repoContainer = document.getElementById('github-projects');
        try {
            const response = await fetch('https://api.github.com/users/ceskasc/repos?sort=updated&per_page=7');
            if (response.ok) {
                const repos = await response.json();
                repoContainer.innerHTML = '';
                
                // Filter out the portfolio repo itself
                const filteredRepos = repos.filter(repo => repo.name !== 'ceskasc.github.io').slice(0, 6);
                
                filteredRepos.forEach(repo => {
                    const card = document.createElement('div');
                    card.className = 'project-card';
                    
                    const desc = repo.description || 'A software engineering component developed with modern standards.';
                    
                    card.innerHTML = `
                        <div class="project-header">
                            <div class="folder-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" role="img" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                            </div>
                            <div class="project-links">
                                <a href="${repo.html_url}" target="_blank" rel="noreferrer" aria-label="GitHub Link">
                                    <svg xmlns="http://www.w3.org/2000/svg" role="img" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
                                </a>
                                ${repo.homepage ? `
                                <a href="${repo.homepage}" target="_blank" rel="noreferrer" aria-label="External Link">
                                    <svg xmlns="http://www.w3.org/2000/svg" role="img" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                                </a>` : ''}
                            </div>
                        </div>
                        <h3 class="project-title"><a href="${repo.html_url}" target="_blank">${repo.name}</a></h3>
                        <div class="project-desc">
                            <p>${desc}</p>
                        </div>
                        <ul class="project-tech-list">
                            ${repo.language ? `<li>${repo.language}</li>` : ''}
                            <li>REST API</li>
                        </ul>
                    `;
                    repoContainer.appendChild(card);
                });

                if(filteredRepos.length === 0) {
                     repoContainer.innerHTML = '<p class="text-gray">No public repositories found.</p>';
                }
            } else {
                repoContainer.innerHTML = '<p class="text-gray">Failed to load repositories. Please check my GitHub profile directly.</p>';
            }
        } catch (error) {
            repoContainer.innerHTML = '<p class="text-gray">Could not connect to GitHub API.</p>';
        }
    }
    
    // Fetch repos slightly delayed 
    setTimeout(fetchGithubProjects, 1000);
});
