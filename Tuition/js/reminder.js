// Month-complete reminder popup
// Shows a popup on the day a student's monthly cycle completes (based on joining date).
(function () {
  var SEEN_KEY = 'tuition_reminder_seen';

  function pad(n) { return String(n).padStart(2, '0'); }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function escH(t) {
    return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmtMoney(n) {
    try { if (typeof money === 'function') return money(n); } catch (e) {}
    return '\u20B9' + (Number(n) || 0);
  }

  // Students whose month completes today
  function dueToday() {
    var out = [];
    if (typeof db === 'undefined' || !db || !Array.isArray(db.students)) return out;
    var now = new Date();
    var y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
    var lastDay = new Date(y, m + 1, 0).getDate();

    db.students.forEach(function (s) {
      var j = String(s.joining || '');
      if (!/^\d{4}-\d{2}-\d{2}/.test(j)) return;
      var jy = +j.slice(0, 4), jm = +j.slice(5, 7) - 1, jd = +j.slice(8, 10);
      var done = (y * 12 + m) - (jy * 12 + jm);   // full months completed
      if (done < 1) return;                        // first month not finished yet
      if (d !== Math.min(jd, lastDay)) return;     // not today's date
      out.push({ s: s, months: done });
    });
    return out;
  }

  function css() {
    if (document.getElementById('rem_css')) return;
    var st = document.createElement('style');
    st.id = 'rem_css';
    st.textContent =
      '#rem_ov{position:fixed;inset:0;z-index:99998;background:rgba(15,23,42,.5);display:flex;align-items:flex-end;justify-content:center;animation:remFade .2s ease}' +
      '#rem_box{background:#fff;width:100%;max-width:440px;max-height:85vh;overflow:auto;border-radius:20px 20px 0 0;padding:22px 18px calc(18px + env(safe-area-inset-bottom));box-shadow:0 -10px 40px rgba(0,0,0,.2);animation:remUp .25s ease;font-family:inherit}' +
      '@media(min-width:768px){#rem_ov{align-items:center}#rem_box{border-radius:18px}}' +
      '.rem-head{display:flex;align-items:center;gap:12px;margin-bottom:14px}' +
      '.rem-ic{width:44px;height:44px;border-radius:12px;background:#eef2ff;color:#4f46e5;display:flex;align-items:center;justify-content:center;flex:none}' +
      '.rem-t{font-size:17px;font-weight:700;color:#0f172a;line-height:1.2}' +
      '.rem-s{font-size:13px;color:#64748b;margin-top:2px}' +
      '.rem-row{display:flex;align-items:center;gap:12px;padding:11px 12px;border:1px solid #e5e7eb;border-radius:12px;margin-bottom:8px;cursor:pointer;background:#fff}' +
      '.rem-row:active{background:#f8fafc}' +
      '.rem-av{width:38px;height:38px;border-radius:50%;background:#4f46e5;color:#fff;font-weight:700;display:flex;align-items:center;justify-content:center;flex:none}' +
      '.rem-nm{font-weight:600;color:#0f172a;font-size:15px}' +
      '.rem-sub{font-size:12px;color:#64748b;margin-top:1px}' +
      '.rem-amt{margin-left:auto;text-align:right;font-size:13px;font-weight:700;white-space:nowrap}' +
      '.rem-amt.due{color:#dc2626}.rem-amt.ok{color:#059669}' +
      '#rem_ok{width:100%;margin-top:8px;padding:13px;border:0;border-radius:12px;background:#4f46e5;color:#fff;font-size:15px;font-weight:600;cursor:pointer}' +
      '#rem_ok:hover{background:#4338ca}' +
      '@keyframes remFade{from{opacity:0}to{opacity:1}}' +
      '@keyframes remUp{from{transform:translateY(30px);opacity:0}to{transform:none;opacity:1}}';
    document.head.appendChild(st);
  }

  function close() {
    var o = document.getElementById('rem_ov');
    if (o) o.remove();
    document.removeEventListener('keydown', onKey);
  }
  function onKey(e) { if (e.key === 'Escape') close(); }

  function show(list) {
    if (document.getElementById('rem_ov')) return;
    css();

    var rows = list.map(function (x) {
      var s = x.s;
      var p = 0;
      try { p = (typeof pending === 'function') ? pending(s) : 0; } catch (e) {}
      var name = s.name || 'Student';
      var amt = p > 0
        ? '<div class="rem-amt due">Pending<br>' + escH(fmtMoney(p)) + '</div>'
        : '<div class="rem-amt ok">Fee paid</div>';
      return '<div class="rem-row" data-id="' + escH(s.id) + '">' +
        '<div class="rem-av">' + escH(name.trim().charAt(0).toUpperCase()) + '</div>' +
        '<div><div class="rem-nm">' + escH(name) + '</div>' +
        '<div class="rem-sub">' + x.months + (x.months > 1 ? ' months' : ' month') + ' completed</div></div>' +
        amt + '</div>';
    }).join('');

    var icon = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="M9 16l2 2 4-4"/></svg>';

    var ov = document.createElement('div');
    ov.id = 'rem_ov';
    ov.innerHTML =
      '<div id="rem_box">' +
        '<div class="rem-head"><div class="rem-ic">' + icon + '</div>' +
        '<div><div class="rem-t">Month completed today</div>' +
        '<div class="rem-s">' + list.length + (list.length > 1 ? ' students' : ' student') + ' \u2013 fee reminder</div></div></div>' +
        rows +
        '<button id="rem_ok" type="button">OK, got it</button>' +
      '</div>';
    document.body.appendChild(ov);

    ov.addEventListener('click', function (e) {
      if (e.target === ov) return close();
      if (e.target.id === 'rem_ok') return close();
      var row = e.target.closest ? e.target.closest('.rem-row') : null;
      if (row) {
        var id = row.getAttribute('data-id');
        close();
        try { if (typeof openDetail === 'function') openDetail(id); } catch (err) {}
      }
    });
    document.addEventListener('keydown', onKey);
  }

  function check() {
    try {
      var list = dueToday();
      if (!list.length) return;
      var sig = ymd(new Date()) + '|' + list.map(function (x) { return x.s.id; }).join(',');
      if (localStorage.getItem(SEEN_KEY) === sig) return;   // already shown today
      localStorage.setItem(SEEN_KEY, sig);
      show(list);
    } catch (e) { /* never break the app */ }
  }

  window.addEventListener('load', function () { setTimeout(check, 1500); });
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) setTimeout(check, 800);
  });
})();