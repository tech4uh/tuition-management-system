// Extras: dashboard greeting ("Hello, Rahul") + dark mode.
// Self-contained. Does not change any other file.
(function () {
  var THEME_KEY = 'tuition_theme';
  var PROFILE_KEY = 'tuition_profile';

  // ---------- Icons ----------
  var SVG = ' viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
  var MOON = '<svg' + SVG + '><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
  var SUN = '<svg' + SVG + '><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';

  // ---------- Styles ----------
  function injectCss() {
    if (document.getElementById('ex_css')) return;
    var st = document.createElement('style');
    st.id = 'ex_css';
    st.textContent = [
      /* Greeting */
      '#greet{margin:0 0 14px}',
      '#greet .g-hi{font-size:22px;font-weight:700;color:var(--ink,#0f172a);line-height:1.25}',
      '#greet .g-date{font-size:13px;color:var(--muted,#64748b);margin-top:2px}',

      /* Theme button (left of the profile avatar) */
      '#theme_btn{position:fixed;top:9px;right:60px;z-index:99998;width:38px;height:38px;border-radius:50%;',
      'border:1px solid #e5e7eb;background:#fff;color:#334155;cursor:pointer;padding:0;',
      'display:flex;align-items:center;justify-content:center;box-shadow:0 1px 4px rgba(15,23,42,.12)}',
      '#theme_btn:hover{background:#f1f5f9}',

      /* ---------- Dark theme ---------- */
      'html[data-theme="dark"]{color-scheme:dark;--bg:#0b1220;--ink:#f1f5f9;--text:#e2e8f0;--muted:#94a3b8;--line:#263449;',
      '--primary:#6366f1;--primary-d:#4f46e5;--green:#34d399;--red:#f87171;--amber:#fb923c}',
      'html[data-theme="dark"] body{background:#0b1220!important;color:#e2e8f0!important}',
      'html[data-theme="dark"] main{background:transparent!important}',
      'html[data-theme="dark"] #topbar{background:#111a2e!important;border-color:#263449!important;color:#f1f5f9!important}',
      'html[data-theme="dark"] #nav{background:#111a2e!important;border-color:#263449!important}',
      'html[data-theme="dark"] #nav button{color:#94a3b8!important;background:transparent!important}',
      'html[data-theme="dark"] #nav button.on,html[data-theme="dark"] #nav button.active{color:#a5b4fc!important}',

      'html[data-theme="dark"] h1,html[data-theme="dark"] h2,html[data-theme="dark"] h3,html[data-theme="dark"] h4{color:#f1f5f9!important}',
      'html[data-theme="dark"] .muted,html[data-theme="dark"] .hint,html[data-theme="dark"] small{color:#94a3b8!important}',

      'html[data-theme="dark"] .card,html[data-theme="dark"] .kpi,html[data-theme="dark"] .scard,',
      'html[data-theme="dark"] .info,html[data-theme="dark"] .sched{background:#1a2438!important;border-color:#263449!important;color:#e2e8f0!important}',
      'html[data-theme="dark"] .list-row,html[data-theme="dark"] .classline,html[data-theme="dark"] .dayl{background:#223049!important;border-color:#2f3f58!important;color:#e2e8f0!important}',
      'html[data-theme="dark"] .search,html[data-theme="dark"] .chip{background:#1a2438!important;border-color:#263449!important;color:#cbd5e1!important}',
      'html[data-theme="dark"] .chip.on{background:#4f46e5!important;border-color:#4f46e5!important;color:#fff!important}',

      'html[data-theme="dark"] input,html[data-theme="dark"] select,html[data-theme="dark"] textarea{background:#0f172a!important;color:#f1f5f9!important;border-color:#334155!important}',
      'html[data-theme="dark"] input::placeholder,html[data-theme="dark"] textarea::placeholder{color:#64748b!important}',
      'html[data-theme="dark"] label{color:#cbd5e1!important}',

      'html[data-theme="dark"] .btn.light{background:#223049!important;color:#e2e8f0!important;border-color:#334155!important}',
      'html[data-theme="dark"] .icon{background:#223049!important;color:#cbd5e1!important;border-color:#334155!important}',
      'html[data-theme="dark"] .icon.danger{color:#f87171!important}',

      'html[data-theme="dark"] .pill.ok{background:rgba(52,211,153,.15)!important;color:#6ee7b7!important}',
      'html[data-theme="dark"] .pill.due{background:rgba(248,113,113,.15)!important;color:#fca5a5!important}',

      'html[data-theme="dark"] #modal #box{background:#1a2438!important;color:#e2e8f0!important}',
      'html[data-theme="dark"] hr{border-color:#263449!important}',

      /* Theme button in dark */
      'html[data-theme="dark"] #theme_btn{background:#1a2438;border-color:#334155;color:#fbbf24}',
      'html[data-theme="dark"] #theme_btn:hover{background:#223049}',
      'html[data-theme="dark"] #pf_btn{border-color:#111a2e}',

      /* Login + profile card (cloud.js) */
      'html[data-theme="dark"] #cl_overlay{background:#0b1220}',
      'html[data-theme="dark"] .cl-card{background:#1a2438;border-color:#263449;box-shadow:0 10px 30px rgba(0,0,0,.4)}',
      'html[data-theme="dark"] .cl-title{color:#f1f5f9}',
      'html[data-theme="dark"] .cl-sub{color:#94a3b8}',
      'html[data-theme="dark"] .cl-label{color:#cbd5e1}',
      'html[data-theme="dark"] .cl-input{background:#0f172a;color:#f1f5f9;border-color:#334155}',
      'html[data-theme="dark"] .cl-input:disabled{background:#172033;color:#94a3b8}',
      'html[data-theme="dark"] .cl-btn.outline{background:transparent;color:#e2e8f0;border-color:#334155}',
      'html[data-theme="dark"] .cl-btn.outline:hover{background:#223049}',
      'html[data-theme="dark"] .cl-btn.danger{background:transparent;border-color:#7f1d1d;color:#f87171}',
      'html[data-theme="dark"] .cl-btn.danger:hover{background:rgba(248,113,113,.1)}',
      'html[data-theme="dark"] .cl-divider::before,html[data-theme="dark"] .cl-divider::after{background:#334155}',
      'html[data-theme="dark"] .pf-x:hover{background:#334155;color:#fff}',

      /* Reminder popup (reminder.js) */
      'html[data-theme="dark"] #rem_box{background:#1a2438}',
      'html[data-theme="dark"] .rem-t,html[data-theme="dark"] .rem-nm{color:#f1f5f9}',
      'html[data-theme="dark"] .rem-s,html[data-theme="dark"] .rem-sub{color:#94a3b8}',
      'html[data-theme="dark"] .rem-row{background:#223049;border-color:#334155}',
      'html[data-theme="dark"] .rem-ic{background:#312e81;color:#c7d2fe}'
    ].join('');
    document.head.appendChild(st);
  }

  // ---------- Dark mode ----------
  function getTheme() {
    try { return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'; }
    catch (e) { return 'light'; }
  }

  var btn = null;
  function updateBtn(t) {
    if (!btn) return;
    // In dark mode show the sun (tap = go light); in light mode show the moon
    btn.innerHTML = t === 'dark' ? SUN : MOON;
    btn.title = t === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
  }

  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    var m = document.querySelector('meta[name="theme-color"]');
    if (!m) {
      m = document.createElement('meta');
      m.name = 'theme-color';
      document.head.appendChild(m);
    }
    m.content = t === 'dark' ? '#111a2e' : '#ffffff';
    updateBtn(t);
  }

  function buildBtn() {
    if (btn || !document.body) return;
    btn = document.createElement('button');
    btn.id = 'theme_btn';
    btn.type = 'button';
    btn.onclick = function () {
      var next = getTheme() === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
      applyTheme(next);
    };
    document.body.appendChild(btn);
    updateBtn(getTheme());
  }

  // ---------- Greeting ----------
  function firstName() {
    try {
      var p = JSON.parse(localStorage.getItem(PROFILE_KEY)) || {};
      return String(p.name || '').trim().split(/\s+/)[0] || '';
    } catch (e) { return ''; }
  }

  function greetText() {
    var n = firstName();
    return n ? 'Hello, ' + n : 'Hello!';
  }

  function onDashboard() {
    try { return typeof tab !== 'undefined' && tab === 'dashboard' && !detailId; }
    catch (e) { return false; }
  }

  function addGreeting() {
    var view = document.getElementById('view');
    if (!view || !onDashboard()) return;
    if (view.querySelector('#greet')) return;

    var g = document.createElement('div');
    g.id = 'greet';
    var hi = document.createElement('div');
    hi.className = 'g-hi';
    hi.textContent = greetText();
    var dt = document.createElement('div');
    dt.className = 'g-date';
    dt.textContent = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
    g.appendChild(hi);
    g.appendChild(dt);
    view.insertBefore(g, view.firstChild);
  }

  // Keep the name fresh (profile is saved / arrives from the cloud after the page renders)
  function refreshGreeting() {
    var hi = document.querySelector('#greet .g-hi');
    if (!hi) return;
    var t = greetText();
    if (hi.textContent !== t) hi.textContent = t;
  }

  // ---------- Start ----------
  function start() {
    injectCss();
    applyTheme(getTheme());
    buildBtn();

    var view = document.getElementById('view');
    if (view) {
      new MutationObserver(addGreeting).observe(view, { childList: true });
      addGreeting();
    }
    setInterval(refreshGreeting, 1500);
  }

  // Apply the saved theme right away to avoid a light flash
  document.documentElement.setAttribute('data-theme', getTheme());

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();