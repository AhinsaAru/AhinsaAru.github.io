// =========================================================
// Ahinsa Arunodi – "Release Pipeline" portfolio
// =========================================================
const root = document.documentElement;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ============ Theme toggle ============
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

// ============ Mobile jobs menu ============
const menuBtn = document.getElementById('menuBtn');
const jobsPanel = document.getElementById('jobs');
function setMenu(open) {
  jobsPanel.classList.toggle('open', open);
  menuBtn.setAttribute('aria-expanded', String(open));
}
menuBtn.addEventListener('click', () => setMenu(!jobsPanel.classList.contains('open')));
jobsPanel.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));
document.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

// ============ Pipeline progress (scroll-driven job status) ============
const sections = [...document.querySelectorAll('main section.job[id]')];
const sideItems = new Map([...document.querySelectorAll('#jobList li')].map(li => [li.dataset.target, li]));
const runIcon = document.getElementById('runIcon');
const runText = document.getElementById('runText');
const progressBar = document.getElementById('progressBar');

function setIcon(el, state) {
  if (!el) return;
  el.classList.remove('queued', 'running', 'success');
  el.classList.add(state);
}

let lastKey = '';
function updatePipeline() {
  const vh = window.innerHeight;
  const line = vh * 0.4;
  const maxScroll = document.documentElement.scrollHeight - vh;
  const atEnd = window.scrollY >= maxScroll - 4;
  progressBar.style.width = (maxScroll > 0 ? Math.min(100, (window.scrollY / maxScroll) * 100) : 100) + '%';

  let runningIdx = -1;
  const states = sections.map((s, i) => {
    if (atEnd) return 'success';
    const r = s.getBoundingClientRect();
    if (r.bottom <= line) return 'success';
    if (r.top <= line) { runningIdx = i; return 'running'; }
    return 'queued';
  });
  // Before the first section reaches the line, treat the first job as running
  if (!atEnd && runningIdx === -1 && states.every(s => s === 'queued')) { states[0] = 'running'; runningIdx = 0; }

  const key = states.join();
  if (key === lastKey) return;
  lastKey = key;

  sections.forEach((s, i) => {
    setIcon(s.querySelector('.job-head .ji'), states[i]);
    const li = sideItems.get(s.id);
    if (li) {
      li.classList.remove('queued', 'running', 'success');
      li.classList.add(states[i]);
      setIcon(li.querySelector('.ji'), states[i]);
    }
  });

  if (states.every(s => s === 'success')) {
    setIcon(runIcon, 'success');
    runText.textContent = `Success · ${sections.length}/${sections.length} jobs passed`;
  } else {
    setIcon(runIcon, 'running');
    const done = states.filter(s => s === 'success').length;
    const name = runningIdx >= 0 ? sections[runningIdx].dataset.job : '';
    runText.textContent = `Running · ${name} (${done + 1}/${sections.length})`;
  }
}
let ticking = false;
window.addEventListener('scroll', () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => { updatePipeline(); ticking = false; });
}, { passive: true });
window.addEventListener('resize', updatePipeline);
updatePipeline();

// ============ Reveal on scroll ============
const revealTargets = document.querySelectorAll('.job-head, .about-grid, .exp-card, .yaml, .mx, .soft, .filters, .project, .gate, .artifacts li, .deploy, .summary-row');
revealTargets.forEach(el => el.classList.add('reveal'));
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('visible'); revealObserver.unobserve(e.target); }
  });
}, { threshold: 0.08 });
revealTargets.forEach(el => revealObserver.observe(el));

// ============ Animated counters ============
const counterObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target;
    const target = parseFloat(el.dataset.count);
    const decimals = parseInt(el.dataset.decimals || '0', 10);
    counterObserver.unobserve(el);
    if (reduceMotion) { el.textContent = target.toFixed(decimals); return; }
    const start = performance.now();
    (function tick(now) {
      const p = Math.min((now - start) / 1400, 1);
      el.textContent = (target * (1 - Math.pow(1 - p, 3))).toFixed(decimals);
      if (p < 1) requestAnimationFrame(tick);
    })(start);
  });
}, { threshold: 0.5 });
document.querySelectorAll('.count').forEach(el => counterObserver.observe(el));

// ============ Project filters ============
const filters = document.querySelectorAll('.filter');
const projects = document.querySelectorAll('.project');
filters.forEach(btn => btn.addEventListener('click', () => {
  filters.forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const f = btn.dataset.filter;
  projects.forEach(p => {
    const show = f === 'all' || p.dataset.cat.split(' ').includes(f);
    p.classList.toggle('hidden', !show);
    if (show) p.classList.add('visible');
  });
  updatePipeline();
}));

// ============ Terminal: test-run animation + interactive shell ============
const terminal = document.getElementById('terminal');
const termScreen = document.getElementById('termScreen');
const termInputLine = document.getElementById('termInputLine');
const termInput = document.getElementById('termInput');
const termBadge = document.getElementById('termBadge');
// Interactive only on larger screens with a mouse/trackpad; phones get the animation only.
const interactive = window.matchMedia('(min-width: 761px) and (pointer: fine)').matches;

const testLines = [
  { t: '', d: 300 },
  { t: '<span class="t-dim">Running 8 tests using 3 workers</span>', d: 500 },
  { t: '', d: 150 },
  { t: '  <span class="t-pass">✓</span> ISTQB CTFL v4.0 certified <span class="t-dim">(12ms)</span>', d: 280 },
  { t: '  <span class="t-pass">✓</span> Manual &amp; functional testing <span class="t-dim">(18ms)</span>', d: 280 },
  { t: '  <span class="t-pass">✓</span> Selenium WebDriver + Java <span class="t-dim">(21ms)</span>', d: 280 },
  { t: '  <span class="t-pass">✓</span> Playwright + TypeScript <span class="t-dim">(16ms)</span>', d: 280 },
  { t: '  <span class="t-pass">✓</span> API testing: Postman / Rest Assured <span class="t-dim">(19ms)</span>', d: 280 },
  { t: '  <span class="t-pass">✓</span> Mobile: Appium 2 <span class="t-dim">(23ms)</span>', d: 280 },
  { t: '  <span class="t-pass">✓</span> CI/CD with GitHub Actions <span class="t-dim">(14ms)</span>', d: 280 },
  { t: '  <span class="t-pass">✓</span> Bug reports devs actually like <span class="t-dim">(9ms)</span>', d: 380 },
  { t: '', d: 150 },
  { t: '  <span class="t-pass t-bold">8 passed</span> <span class="t-dim">(1.2s)</span>', d: 380 },
  { t: '  <span class="t-info">Status:</span> <span class="t-warn">open to QA opportunities</span>', d: 380 },
  { t: '', d: 100 },
];

const PROMPT = '<span class="t-prompt">$</span> ';
const esc = s => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const row = (k, v, w = 12) => `  <span class="t-pass">${k.padEnd(w)}</span>${v}`;
const link = (href, text, ext) => `<a class="t-link" href="${href}"${ext ? ' target="_blank" rel="noopener"' : ''}>${text}</a>`;

function print(html = '') {
  terminal.insertAdjacentHTML('beforeend', html + '\n');
  termScreen.scrollTop = termScreen.scrollHeight;
}

let busy = false;
function runTests(done) {
  busy = true;
  print(PROMPT + 'npx playwright test --project=ahinsa');
  if (reduceMotion) {
    testLines.forEach(l => print(l.t));
    busy = false;
    if (done) done();
    return;
  }
  let i = 0;
  (function next() {
    if (i >= testLines.length) { busy = false; if (done) done(); return; }
    print(testLines[i].t);
    setTimeout(next, testLines[i++].d);
  })();
}

function goTo(id) {
  const el = document.getElementById(id);
  if (el) setTimeout(() => el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' }), 250);
}

const commands = {
  help: () => [
    '<span class="t-bold">Available commands</span>',
    row('whoami', 'who I am'),
    row('skills', 'my testing toolkit'),
    row('projects', 'automation & testing projects'),
    row('experience', 'where I work'),
    row('certs', 'certifications'),
    row('contact', 'how to reach me'),
    row('cv', 'download my CV'),
    row('run tests', 're-run the test suite'),
    row('deploy', 'jump to the deploy job'),
    row('theme', 'toggle light / dark mode'),
    row('clear', 'clear the terminal'),
    '<span class="t-dim">Tip: ↑/↓ for history, Tab to autocomplete.</span>',
  ].join('\n'),

  whoami: () => [
    '<span class="t-bold">Ahinsa Arunodi</span>: Quality Engineer',
    '  QA Engineer Intern @ Derana Macro Labs',
    '  BSc Industrial IT, Uva Wellassa University <span class="t-dim">(CGPA 3.73)</span>',
    '  <span class="t-pass">✓</span> ISTQB CTFL v4.0 certified',
  ].join('\n'),

  skills: () => [
    row('testing', 'manual · functional · regression · smoke · UI · API'),
    row('practices', 'test design · BVA/EP · bug reports · STLC · Agile'),
    row('automation', 'Selenium (Java) · Playwright (TS) · Appium 2 · TestNG'),
    row('api', 'Postman · Newman · Rest Assured'),
    row('ci/cd', 'GitHub Actions · Jenkins · Git · Docker'),
    row('languages', 'Java · TypeScript · JavaScript · Python'),
  ].join('\n'),

  projects: () => [
    '  <span class="t-pass">✓</span> Toolshop E-Commerce UI &amp; API testing <span class="t-dim">Selenium · Rest Assured</span>',
    '  <span class="t-pass">✓</span> Automation Exercise framework + CI   <span class="t-dim">Playwright · TS</span>',
    '  <span class="t-pass">✓</span> SauceDemo UI automation              <span class="t-dim">Playwright · TS</span>',
    '  <span class="t-pass">✓</span> Restful-Booker API testing           <span class="t-dim">Postman · Newman</span>',
    '  <span class="t-pass">✓</span> Android app automation               <span class="t-dim">Appium · Java</span>',
    '  → ' + link('#projects', 'view all projects'),
  ].join('\n'),

  experience: () => [
    '  <span class="t-info">Jun 2026 – now</span>  QA Engineer Intern @ <span class="t-bold">Derana Macro Labs</span>',
    '  <span class="t-dim">manual · functional · regression testing in an Agile team</span>',
  ].join('\n'),

  certs: () => [
    '  <span class="t-pass">✓</span> ISTQB CTFL v4.0',
    '  <span class="t-warn">◔</span> SQA using Test Automation Framework (UCSC) <span class="t-dim">in progress</span>',
    '  <span class="t-pass">✓</span> Introduction to SQA (University of Moratuwa)',
    '  <span class="t-pass">✓</span> GitHub Foundations',
    '  <span class="t-pass">✓</span> Selenium WebDriver 4 with Java (Packt)',
  ].join('\n'),

  contact: () => [
    row('email', link('mailto:ahinsa1222@gmail.com', 'ahinsa1222@gmail.com')),
    row('linkedin', link('https://www.linkedin.com/in/ahinsa-arunodi-1158812a0/', 'in/ahinsa-arunodi', true)),
    row('github', link('https://github.com/AhinsaAru', 'github.com/AhinsaAru', true)),
  ].join('\n'),

  deploy: () => {
    goTo('contact');
    return '  <span class="t-warn">⏸</span> deploy is waiting for your approval… <span class="t-dim">(scrolling)</span>';
  },

  cv: () => {
    const a = document.createElement('a');
    a.href = 'cv.pdf';
    a.download = 'Ahinsa_Arunodi_CV.pdf';
    document.body.appendChild(a);
    a.click();
    a.remove();
    return '  <span class="t-pass">↓</span> Downloading Ahinsa_Arunodi_CV.pdf…';
  },

  theme: () => {
    themeToggle.click();
    return `  Theme switched to <span class="t-bold">${currentTheme()}</span>.`;
  },

  // Hidden extras for curious interviewers
  ls: () => '  trigger/  checkout/  setup-env/  install-deps/  run-tests/  quality-gate/  artifacts/  deploy/',
  hello: () => '  Hi there 👋 Type <span class="t-pass">help</span> to see what I can do.',
  hi: () => commands.hello(),
  exit: () => '  Nice try. Good QA never quits halfway 😄',
  'sudo hire ahinsa': () => [
    '  <span class="t-dim">[sudo] password for recruiter: ********</span>',
    '  <span class="t-pass">✓ Permission granted.</span> Excellent decision.',
    '  → ' + link('mailto:ahinsa1222@gmail.com?subject=Let%27s%20talk', 'send an email to get started'),
  ].join('\n'),
};
commands.certifications = commands.certs;
commands.about = commands.whoami;

const visibleCommands = ['help', 'whoami', 'skills', 'projects', 'experience', 'certs', 'contact', 'cv', 'run tests', 'deploy', 'theme', 'clear'];
const history = [];
let histIdx = 0;

function showInput() {
  termInputLine.hidden = false;
  termScreen.scrollTop = termScreen.scrollHeight;
}

function execute(raw) {
  const cmd = raw.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!cmd) return;
  if (cmd === 'clear' || cmd === 'cls') { terminal.innerHTML = ''; return; }
  if (cmd === 'run tests' || cmd === 'run' || cmd === 'test' || cmd.startsWith('npx playwright test')) {
    termInputLine.hidden = true;
    runTests(() => { showInput(); termInput.focus({ preventScroll: true }); });
    return;
  }
  if (cmd.startsWith('sudo') && cmd !== 'sudo hire ahinsa') {
    print('  <span class="t-err">Permission denied.</span> <span class="t-dim">(hint: sudo hire ahinsa)</span>');
    return;
  }
  const fn = commands[cmd];
  if (fn) print(fn());
  else print(`  <span class="t-err">command not found:</span> ${esc(cmd)}. Type <span class="t-pass">help</span> for options.`);
}

if (interactive) {
  termBadge.hidden = false;

  termInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      if (busy) return;
      const raw = termInput.value;
      termInput.value = '';
      print(PROMPT + esc(raw));
      if (raw.trim()) { history.push(raw); histIdx = history.length; }
      execute(raw);
    } else if (e.key === 'ArrowUp') {
      if (!history.length) return;
      e.preventDefault();
      histIdx = Math.max(0, histIdx - 1);
      termInput.value = history[histIdx];
    } else if (e.key === 'ArrowDown') {
      if (!history.length) return;
      e.preventDefault();
      histIdx = Math.min(history.length, histIdx + 1);
      termInput.value = history[histIdx] || '';
    } else if (e.key === 'Tab') {
      const v = termInput.value.trim().toLowerCase();
      if (!v) return;
      e.preventDefault();
      const matches = visibleCommands.filter(c => c.startsWith(v));
      if (matches.length === 1) termInput.value = matches[0];
      else if (matches.length > 1) { print(PROMPT + esc(termInput.value)); print('  ' + matches.join('   ')); }
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      terminal.innerHTML = '';
    }
  });

  // Click anywhere in the terminal to type (unless selecting text or clicking a link)
  termScreen.addEventListener('click', e => {
    if (e.target.closest('a')) return;
    if (window.getSelection().toString()) return;
    if (!termInputLine.hidden) termInput.focus({ preventScroll: true });
  });
}

runTests(() => {
  if (interactive) {
    print('<span class="t-dim">Type</span> <span class="t-pass">help</span> <span class="t-dim">to explore, or try</span> <span class="t-pass">run tests</span>');
    showInput();
  } else {
    print(PROMPT + '<span class="cursor"></span>');
  }
});

// ============ Footer year ============
document.getElementById('year').textContent = new Date().getFullYear();
