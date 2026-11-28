// ───────────── Groups ─────────────
function groupsView() {
  const list = [...db.groups].sort((a, b) => a.start.localeCompare(b.start));
  const mon = monthShort();
  return `
    <h1>Groups / Batches</h1>
    ${list.length ? list.map(g => {
      const sts = studentsOf(g.id).sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
      return `
      <div class="card">
        <div class="row">
          <b class="grow" style="font-size:18px">${esc(g.name)}</b>
          <button class="icon" title="Edit" onclick="openGroupForm('${g.id}')">${ic('edit', 16)}</button>
          <button class="icon danger" title="Delete" onclick="deleteGroup('${g.id}')">${ic('trash', 16)}</button>
        </div>
        <div class="muted" style="margin-top:6px">${ic('clock', 14)} ${fmtTime(g.start)} - ${fmtTime(g.end)} &nbsp;•&nbsp; ${money(g.fee)}/month</div>
        <div class="kpis sm" style="margin-top:12px">
          <div class="kpi blue"><div class="kpi-val">${sts.length}</div><div class="kpi-lbl">Students</div></div>
          <div class="kpi green"><div class="kpi-val">${money(sumPaidMonth(sts))}</div><div class="kpi-lbl">Collected (${mon})</div></div>
          <div class="kpi amber"><div class="kpi-val">${money(sumPending(sts))}</div><div class="kpi-lbl">Pending</div></div>
        </div>
        <div class="sep"></div>
        <div class="muted"><b>Student List</b></div>
        ${sts.length ? sts.map(s => {
          const p = pending(s);
          return `
          <div class="row list-row" onclick="openDetail('${s.id}')">
            <div class="avatar sm">${esc(s.name[0].toUpperCase())}</div>
            <div class="grow"><b>${esc(s.name)}</b></div>
            ${p > 0 ? `<span class="pill due">Pending ${money(p)}</span>` : `<span class="pill ok">Paid</span>`}
          </div>`;
        }).join('') : '<div class="muted" style="padding:8px 0">No students in this group yet</div>'}
      </div>`;
    }).join('') : '<div class="card empty">Create a group first (e.g. "Class 10 - Morning")</div>'}
    <button class="fab" onclick="openGroupForm()">${ic('plus')} Add Group</button>`;
}

function openGroupForm(id) {
  const g = id ? group(id) : null;
  openModal(`
    <h3>${g ? 'Edit' : 'Add'} Group</h3>
    <label>Group Name</label><input id="g_name" value="${esc(g?.name || '')}">
    <div class="two">
      <div><label>Start Time</label><input id="g_start" type="time" value="${g?.start || '16:00'}"></div>
      <div><label>End Time</label><input id="g_end" type="time" value="${g?.end || '17:00'}"></div>
    </div>
    <label>Monthly Fee (₹)</label><input id="g_fee" type="number" value="${g?.fee ?? ''}">
    <div class="hint">${ic('info', 15)} Subjects are set individually in each student's profile.</div>
    <button class="btn" onclick="saveGroup('${id || ''}')">Save Group</button>
    <button class="btn light" onclick="closeModal()">Cancel</button>`);
}

function saveGroup(id) {
  const name = $('g_name').value.trim();
  if (!name) return alert('Please enter the group name');
  const data = {
    name,
    start: $('g_start').value || '16:00',
    end: $('g_end').value || '17:00',
    fee: Number($('g_fee').value) || 0
  };
  if (id) Object.assign(group(id), data);
  else db.groups.push({ id: uid(), ...data, subjects: Array(7).fill('') });
  closeModal();
  save();
}

function deleteGroup(id) {
  const n = countIn(id);
  if (n > 0) return alert(`This group has ${n} student(s). Please delete them first.`);
  if (confirm('Delete this group?')) {
    db.groups = db.groups.filter(g => g.id !== id);
    save();
  }
}