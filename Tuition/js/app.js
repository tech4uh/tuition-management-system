// ───────────── App start ─────────────

// Show any hidden JavaScript error as a red banner
function showError(msg) {
  let bar = document.getElementById('errbar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'errbar';
    bar.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#dc2626;color:#fff;padding:10px 14px;font-size:13px;z-index:999;cursor:pointer';
    bar.onclick = () => bar.remove();
    document.body.appendChild(bar);
  }
  bar.textContent = 'Error: ' + msg + '  (tap to close)';
}
window.addEventListener('error', e => showError(e.message));
window.addEventListener('unhandledrejection', e => showError(String(e.reason)));

// ───────────── Student profile ─────────────
function openDetail(id) {
  detailId = id;
  render();
  window.scrollTo(0, 0);
}

function detailView() {
  const s = student(detailId);
  if (!s) { detailId = null; return dashboardView(); }

  const g = group(s.groupId);
  const di = todayIdx();
  const subs = getSubjects(s);
  const todaySub = String(subs[di] || '').trim();
  const pays = [...(s.payments || [])].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));

  return `
    <div class="row" style="margin-bottom:16px">
      <button class="icon" title="Back" onclick="detailId=null;render()">${ic('arrow-left', 18)}</button>
      <h1 class="grow" style="margin:0">${esc(s.name)}</h1>
      <button class="icon" title="Edit" onclick="openStudentForm('${s.id}')">${ic('edit', 16)}</button>
      <button class="icon danger" title="Delete" onclick="deleteStudent('${s.id}')">${ic('trash', 16)}</button>
    </div>

    <div class="today-box">
      <small>${ic('calendar', 14)} Today's subject (${FULLDAYS[di]})</small>
      <b>${todaySub ? esc(todaySub) : 'No class today'}</b>
      ${g && todaySub ? `<small>${ic('clock', 14)} ${fmtTime(g.start)} - ${fmtTime(g.end)}</small>` : ''}
    </div>

    <div class="card">
      <div class="info"><span>Group</span><b>${esc(g?.name || '-')}</b></div>
      <div class="info"><span>Time</span><b>${g ? fmtTime(g.start) + ' - ' + fmtTime(g.end) : '-'}</b></div>
      <div class="info"><span>Phone</span><b>${esc(s.phone || '-')}</b></div>
      <div class="info"><span>Joining Date</span><b>${fmtDate(s.joining)}</b></div>
      <div class="info"><span>Monthly Fee</span><b>${money(s.fee)}</b></div>
      <div class="info"><span>Total Months</span><b>${monthsDue(s)}</b></div>
    </div>

    <div class="kpis">
      <div class="kpi blue"><div class="kpi-ic">${ic('rupee')}</div><div class="kpi-val">${money(totalDue(s))}</div><div class="kpi-lbl">Total Fees</div></div>
      <div class="kpi green"><div class="kpi-ic">${ic('check-circle')}</div><div class="kpi-val">${money(paid(s))}</div><div class="kpi-lbl">Paid</div></div>
      <div class="kpi amber"><div class="kpi-ic">${ic('clock')}</div><div class="kpi-val">${money(pending(s))}</div><div class="kpi-lbl">Pending</div></div>
    </div>

    <h2>${ic('book', 16)} Weekly Subjects</h2>
    <div class="card">
      ${DAYS.map((d, i) => {
        const sub = String(subs[i] || '').trim();
        return `
        <div class="sched ${i === di ? 'now' : ''}">
          <span>${FULLDAYS[i]}${i === di ? ' (Today)' : ''}</span>
          <b>${sub ? esc(sub) : '<span class="muted">Off</span>'}</b>
        </div>`;
      }).join('')}
    </div>

    <h2>${ic('rupee', 16)} Payment History</h2>
    ${pays.length ? pays.map(p => `
      <div class="card row">
        <div class="avatar green-bg">${ic('rupee', 18)}</div>
        <div class="grow"><b>${money(p.amount)}</b><div class="muted">${fmtDate(p.date)}</div></div>
        <button class="icon danger" title="Delete payment" onclick="deletePayment('${s.id}','${p.id}')">${ic('x', 16)}</button>
      </div>`).join('') : '<div class="card empty">No payments yet</div>'}
    <button class="fab" onclick="openPaymentForm('${s.id}')">${ic('plus')} Add Payment</button>`;
}

// ───────────── Payments ─────────────
function openPaymentForm(sid) {
  const p = pending(student(sid));
  openModal(`
    <h3>Add Payment</h3>
    <label>Amount (₹)</label><input id="p_amt" type="number" autofocus>
    ${p > 0 ? `<button class="chip" style="margin-top:8px" onclick="$('p_amt').value=${Math.round(p)}">Full pending: ${money(p)}</button>` : ''}
    <label>Date</label><input id="p_date" type="date" value="${today()}">
    <button class="btn" onclick="savePayment('${sid}')">Save</button>
    <button class="btn light" onclick="closeModal()">Cancel</button>`);
}

function savePayment(sid) {
  const amount = Number($('p_amt').value);
  if (!(amount > 0)) return alert('Please enter a valid amount');
  if (!$('p_date').value) return alert('Please select a date');
  student(sid).payments.push({ id: uid(), amount, date: $('p_date').value });
  closeModal();
  save();
}

function deletePayment(sid, pid) {
  if (confirm('Delete this payment?')) {
    const s = student(sid);
    s.payments = s.payments.filter(p => p.id !== pid);
    save();
  }
}

// ───────────── Render ─────────────
function render() {
  document.querySelectorAll('#nav button[data-tab]').forEach(b =>
    b.classList.toggle('active', b.dataset.tab === tab && !detailId));

  const v = $('view');
  try {
    if (detailId) v.innerHTML = detailView();
    else if (tab === 'dashboard') v.innerHTML = dashboardView();
    else if (tab === 'students') { v.innerHTML = studentsView(); renderStudentList(); }
    else v.innerHTML = groupsView();
  } catch (err) {
    console.error(err);
    detailId = null;
    v.innerHTML = `
      <div class="card">
        <h2 style="margin-top:0">Something went wrong</h2>
        <div class="muted" style="margin:8px 0">${esc(err.message)}</div>
        <button class="btn" onclick="render()">Go back</button>
      </div>`;
  }
}

// Menu buttons
document.querySelectorAll('#nav button[data-tab]').forEach(b =>
  b.onclick = () => {
    tab = b.dataset.tab;
    detailId = null;
    render();
    window.scrollTo(0, 0);
  });

// Check that every other file loaded (shows which one is missing)
const missing = [];
if (typeof fmtDate !== 'function') missing.push('helpers.js');
if (typeof ic !== 'function') missing.push('icons.js');
if (typeof repairData !== 'function') missing.push('data.js');
if (typeof openModal !== 'function') missing.push('modal.js');
if (typeof dashboardView !== 'function') missing.push('dashboard.js');
if (typeof openStudentForm !== 'function') missing.push('students.js');
if (typeof groupsView !== 'function') missing.push('groups.js');
if (missing.length) showError('These files did not load properly: ' + missing.join(', '));
render();