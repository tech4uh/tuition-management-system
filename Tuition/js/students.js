// ───────────── Students list ─────────────
const SEARCH_ICON = '<svg class="ic search-ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';

function studentsView() {
  return `
    <h1>Students</h1>
    <div class="search">
      ${SEARCH_ICON}
      <input id="q" placeholder="Search name / phone" value="${esc(query)}" oninput="query=this.value; renderStudentList()">
    </div>
    <div class="chips" id="chips"></div>
    <div id="slist"></div>
    <button class="fab" onclick="openStudentForm()">${ic('plus')} Add Student</button>`;
}

function renderStudentList() {
  $('chips').innerHTML =
    `<button class="chip ${gFilter === '' ? 'on' : ''}" onclick="gFilter='';renderStudentList()">All</button>` +
    db.groups.map(g => `<button class="chip ${gFilter === g.id ? 'on' : ''}" onclick="gFilter='${g.id}';renderStudentList()">${esc(g.name)}</button>`).join('');

  const q = query.toLowerCase(), di = todayIdx();
  const list = db.students
    .filter(s => (s.name.toLowerCase().includes(q) || (s.phone || '').includes(q)) && (!gFilter || s.groupId === gFilter))
    .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

  $('slist').innerHTML = list.length ? list.map(s => {
    const p = pending(s), sub = subjectOn(s, di);
    return `
    <div class="card scard">
      <div class="row" style="cursor:pointer" onclick="openDetail('${s.id}')">
        <div class="avatar">${esc(s.name[0].toUpperCase())}</div>
        <div class="grow">
          <b>${esc(s.name)}</b>
          <div class="muted">${esc(group(s.groupId)?.name || '-')} &nbsp;•&nbsp; Joined ${fmtDate(s.joining)}</div>
          <div class="muted">${ic('book', 13)} Today: ${sub ? '<b class="primary">' + esc(sub) + '</b>' : 'Off'}</div>
        </div>
      </div>
      <div class="sbar">
        <div class="row" style="gap:10px">
          ${p > 0 ? `<span class="pill due">Pending ${money(p)}</span>` : `<span class="pill ok">Paid</span>`}
          <span class="muted">Paid ${money(paid(s))}</span>
        </div>
        <div class="row" style="gap:8px">
          <button class="icon" title="Edit" onclick="openStudentForm('${s.id}')">${ic('edit', 16)}</button>
          <button class="icon danger" title="Delete" onclick="deleteStudent('${s.id}')">${ic('trash', 16)}</button>
        </div>
      </div>
    </div>`;
  }).join('') : '<div class="card empty">No students found</div>';
}

// ───────────── Student add / edit ─────────────
function openStudentForm(id) {
  if (!db.groups.length) { alert('Please create a group first in the Groups tab'); return; }
  const s = id ? student(id) : null;
  const gid = s ? s.groupId : db.groups[0].id;
  const subs = s ? getSubjects(s) : Array(7).fill('');
  const fee = s ? s.fee : (group(gid).fee || '');
  const known = [...new Set(db.students.flatMap(x => getSubjects(x)).map(x => (x || '').trim()).filter(Boolean))];

  openModal(`
    <h3>${s ? 'Edit' : 'Add'} Student</h3>
    <label>Student Name</label><input id="f_name" value="${esc(s?.name || '')}">
    <label>Phone (optional)</label><input id="f_phone" type="tel" value="${esc(s?.phone || '')}">
    <label>Group</label>
    <select id="f_group" ${s ? '' : `onchange="$('f_fee').value = group(this.value).fee"`}>
      ${db.groups.map(g => `<option value="${g.id}" ${g.id === gid ? 'selected' : ''}>${esc(g.name)} (${fmtTime(g.start)})</option>`).join('')}
    </select>
    <label>Monthly Fee (₹)</label><input id="f_fee" type="number" value="${fee}">
    <label>Joining Date</label><input id="f_date" type="date" value="${s ? s.joining : today()}">

    <label style="margin-top:20px">Daily Subjects</label>
    <div class="hint" style="margin-top:0">${ic('info', 15)} This student's subject for each day. Leave blank for days off.</div>
    <datalist id="subjList">${known.map(k => `<option value="${esc(k)}">`).join('')}</datalist>
    ${DAYS.map((d, i) => `
      <div class="row" style="margin-top:8px">
        <b class="dayl">${d}</b>
        <input id="f_s${i}" list="subjList" value="${esc(subs[i] || '')}" placeholder="Subject">
      </div>`).join('')}

    <button class="btn" onclick="saveStudent('${id || ''}')">${s ? 'Update' : 'Save'} Student</button>
    <button class="btn light" onclick="closeModal()">Cancel</button>`);
}

function saveStudent(id) {
  const name = $('f_name').value.trim();
  if (!name) return alert("Please enter the student's name");
  if (!$('f_date').value) return alert('Please select a joining date');
  const data = {
    name,
    phone: $('f_phone').value.trim(),
    groupId: $('f_group').value,
    fee: Number($('f_fee').value) || 0,
    joining: $('f_date').value,
    subjects: DAYS.map((_, i) => $('f_s' + i).value.trim())
  };
  if (id) Object.assign(student(id), data);          // payments are kept safe
  else db.students.push({ id: uid(), ...data, payments: [] });
  closeModal();
  save();
}

function deleteStudent(id) {
  const s = student(id);
  if (confirm(`Delete ${s.name}? All their payments will also be deleted.`)) {
    db.students = db.students.filter(x => x.id !== id);
    detailId = null;
    save();
  }
}