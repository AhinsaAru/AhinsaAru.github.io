// ============ Theme toggle ============
const root = document.documentElement;
const themeToggle = document.getElementById('themeToggle');

function currentTheme() {
  const set = root.getAttribute('data-theme');
  if (set) return set;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

themeToggle.addEventListener('click', () => {
  const next = currentTheme() === 'dark' ? 'light' : 'dark';
  root.setAttribute('data-theme', next);
  try { localStorage.setItem('theme', next); } catch (e) {}
});

// ============ Mobile menu ============
const menuBtn = document.getElementById('menuBtn');
const navLinks = document.getElementById('navLinks');
menuBtn.addEventListener('click', () => {
  const open = navLinks.classList.toggle('open');
  menuBtn.setAttribute('aria-expanded', String(open));
});
navLinks.querySelectorAll('a').forEach(a =>
  a.addEventListener('click', () => {
    navLinks.classList.remove('open');
    menuBtn.setAttribute('aria-expanded', 'false');
  })
);

// ============ Nav shadow, back-to-top, active link ============
const nav = document.getElementById('nav');
const toTop = document.getElementById('toTop');
const sections = [...document.querySelectorAll('main section[id]')];
const links = [...navLinks.querySelectorAll('a')];

function onScroll() {
  const y = window.scrollY;
  nav.classList.toggle('scrolled', y > 10);
  toTop.classList.toggle('show', y > 600);

  let current = '';
  for (const s of sections) {
    if (y >= s.offsetTop - 120) current = s.id;
  }
  links.forEach(l => l.classList.toggle('active', l.getAttribute('href') === '#' + current));
}
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();
toTop.addEventListener('click', () => window.scrollTo({ top: 0 }));

// ============ Reveal on scroll ============
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      revealObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

// ============ Animated counters ============
const counterObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target;
    const target = parseFloat(el.dataset.count);
    const decimals = parseInt(el.dataset.decimals || '0', 10);
    const duration = 1400;
    const start = performance.now();
    function tick(now) {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = (target * eased).toFixed(decimals);
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    counterObserver.unobserve(el);
  });
}, { threshold: 0.5 });
document.querySelectorAll('.stat-num').forEach(el => counterObserver.observe(el));

// ============ Project filters ============
const filters = document.querySelectorAll('.filter');
const projects = document.querySelectorAll('.project');
filters.forEach(btn => {
  btn.addEventListener('click', () => {
    filters.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const f = btn.dataset.filter;
    projects.forEach(p => {
      const show = f === 'all' || p.dataset.cat.split(' ').includes(f);
      p.classList.toggle('hidden', !show);
      if (show) p.classList.add('visible');
    });
  });
});

// ============ Terminal typing animation ============
const terminal = document.getElementById('terminal');
const lines = [
  { t: '', d: 300 },
  { t: '<span class="t-dim">Running 8 tests using 3 workers</span>', d: 500 },
  { t: '', d: 150 },
  { t: '  <span class="t-pass">✓</span> ISTQB CTFL v4.0 certified <span class="t-dim">(12ms)</span>', d: 300 },
  { t: '  <span class="t-pass">✓</span> Manual &amp; functional testing <span class="t-dim">(18ms)</span>', d: 300 },
  { t: '  <span class="t-pass">✓</span> Selenium WebDriver + Java <span class="t-dim">(21ms)</span>', d: 300 },
  { t: '  <span class="t-pass">✓</span> Playwright + TypeScript <span class="t-dim">(16ms)</span>', d: 300 },
  { t: '  <span class="t-pass">✓</span> API testing: Postman / Rest Assured <span class="t-dim">(19ms)</span>', d: 300 },
  { t: '  <span class="t-pass">✓</span> Mobile: Appium 2 <span class="t-dim">(23ms)</span>', d: 300 },
  { t: '  <span class="t-pass">✓</span> CI/CD with GitHub Actions <span class="t-dim">(14ms)</span>', d: 300 },
  { t: '  <span class="t-pass">✓</span> Bug reports devs actually like <span class="t-dim">(9ms)</span>', d: 400 },
  { t: '', d: 150 },
  { t: '  <span class="t-pass t-bold">8 passed</span> <span class="t-dim">(1.2s)</span>', d: 400 },
  { t: '  <span class="t-info">Status:</span> <span class="t-warn">open to QA opportunities</span>', d: 400 },
  { t: '', d: 100 },
  { t: '<span class="t-prompt">$</span> <span class="cursor"></span>', d: 0 },
];

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (reduceMotion) {
  terminal.innerHTML += lines.map(l => l.t).join('\n');
} else {
  let i = 0;
  (function next() {
    if (i >= lines.length) return;
    terminal.innerHTML += lines[i].t + (i < lines.length - 1 ? '\n' : '');
    const delay = lines[i].d;
    i++;
    setTimeout(next, delay);
  })();
}

// ============ Footer year ============
document.getElementById('year').textContent = new Date().getFullYear();
