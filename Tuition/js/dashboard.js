// ───────────── Dashboard ─────────────
function dashboardView() {
  const di = todayIdx();
  const groups = [...db.groups].sort((a, b) => a.start.localeCompare(b.start));
  const mon = monthShort();

  // Today's classes: groups where at least one student has a subject today
  const todays = groups.map(g => {
    const bySubject = {};
    studentsOf(g.id).forEach(s => {
      const sub = subjectOn(s, di);
      if (sub) (bySubject[sub] = bySubject[sub] || []).push(s.name);
    });
    return { g, bySubject, total: Object.values(bySubject).reduce((a, l) => a + l.length, 0) };
  }).filter(x => x.total > 0);

  return `
    <h1>Dashboard</h1>
    <div class="kpis">
      <div class="kpi blue">
        <div class="kpi-ic">${ic('users')}</div>
        <div class="kpi-val">${db.students.length}</div>
        <div class="kpi-lbl">Students</div>
      </div>
      <div class="kpi green">
        <div class="kpi-ic">${ic('check-circle')}</div>
        <div class="kpi-val">${money(sumPaidMonth(db.students))}</div>
        <div class="kpi-lbl">Collected (${mon})</div>
      </div>
      <div class="kpi amber">
        <div class="kpi-ic">${ic('clock')}</div>
        <div class="kpi-val">${money(sumPending(db.students))}</div>
        <div class="kpi-lbl">Pending</div>
      </div>
    </div>

    <h2>${ic('calendar', 16)} Today's Classes <span class="pill">${FULLDAYS[di]}</span></h2>
    ${todays.length ? todays.map(({ g, bySubject, total }) => `
      <div class="card">
        <div class="row">
          <div class="avatar">${ic('book', 20)}</div>
          <div class="grow">
            <b>${esc(g.name)}</b>
            <div class="muted">${ic('clock', 14)} ${fmtTime(g.start)} - ${fmtTime(g.end)}</div>
          </div>
          <span class="pill">${total} today</span>
        </div>
        ${Object.entries(bySubject).map(([sub, names]) =>
          `<div class="classline"><b>${esc(sub)}</b> — ${names.map(esc).join(', ')}</div>`).join('')}
      </div>`).join('') : '<div class="card empty">No classes today</div>'}

    <h2>${ic('layers', 16)} Group-wise Summary</h2>
    ${groups.length ? groups.map(g => {
      const list = studentsOf(g.id);
      return `
      <div class="card">
        <div class="row">
          <div class="grow">
            <b style="font-size:16px">${esc(g.name)}</b>
            <div class="muted">${ic('clock', 14)} ${fmtTime(g.start)} - ${fmtTime(g.end)}</div>
          </div>
          <div class="right"><b class="primary" style="font-size:20px">${list.length}</b><div class="muted">students</div></div>
        </div>
        <div class="sep"></div>
        <div class="two">
          <div><div class="muted">Collected (${mon})</div><b class="green">${money(sumPaidMonth(list))}</b></div>
          <div><div class="muted">Pending</div><b class="red">${money(sumPending(list))}</b></div>
        </div>
      </div>`;
    }).join('') : '<div class="card empty">No groups yet. Create one in the Groups tab.</div>'}`;
}

// ───────────── Backup / Restore ─────────────
function exportData() {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' }));
  a.download = `tuition-backup-${today()}.json`;
  a.click();
}

$('importFile').onchange = e => {
  const f = e.target.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const d = JSON.parse(r.result);
      if (!Array.isArray(d.groups) || !Array.isArray(d.students)) throw 0;
      if (confirm('Current data will be replaced. Continue?')) { db = d; save(); }
    } catch { alert('This is not a valid backup file'); }
  };
  r.readAsText(f);
  e.target.value = '';
};