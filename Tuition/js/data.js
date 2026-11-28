// ───────────── Data & State ─────────────
let db;
try {
  db = JSON.parse(localStorage.getItem('tuition_data') || '{"groups":[],"students":[]}');
} catch (e) {
  db = { groups: [], students: [] };
}


// Repair incomplete / old data so pages never crash
function repairData() {
  if (!db || typeof db !== 'object') db = {};
  db.groups = Array.isArray(db.groups) ? db.groups : [];
  db.students = Array.isArray(db.students) ? db.students : [];


  const safeId = id => typeof id === 'string' && /^[\w-]+$/.test(id);
  const idMap = {};


  db.groups.forEach(g => {
    if (!safeId(g.id)) { const n = uid(); idMap[g.id] = n; g.id = n; }
    g.name = g.name || 'Unnamed group';
    g.start = g.start || '16:00';
    g.end = g.end || '17:00';
    g.fee = Number(g.fee) || 0;
    if (!Array.isArray(g.subjects) || g.subjects.length !== 7) g.subjects = Array(7).fill('');
    g.subjects = g.subjects.map(x => String(x ?? ''));
  });


  db.students.forEach(s => {
    if (!safeId(s.id)) s.id = uid();
    if (idMap[s.groupId]) s.groupId = idMap[s.groupId];
    s.name = String(s.name || 'Unnamed');
    s.phone = String(s.phone || '');
    s.fee = Number(s.fee) || 0;
    s.joining = /^\d{4}-\d{2}-\d{2}/.test(s.joining || '') ? String(s.joining).slice(0, 10) : today();
    if (Array.isArray(s.subjects) && s.subjects.length === 7) {
      s.subjects = s.subjects.map(x => String(x ?? ''));
    } else {
      delete s.subjects;   // falls back to the group's subjects
    }
    s.payments = Array.isArray(s.payments) ? s.payments : [];
    s.payments.forEach(p => {
      if (!safeId(p.id)) p.id = uid();
      p.amount = Number(p.amount) || 0;
      p.date = /^\d{4}-\d{2}-\d{2}/.test(p.date || '') ? String(p.date).slice(0, 10) : today();
    });
  });
}
repairData();


// UI state
let tab = 'dashboard';
let detailId = null;
let query = '';
let gFilter = '';


function save() {
  localStorage.setItem('tuition_data', JSON.stringify(db));
  render();
}


// Finders
const group = id => db.groups.find(g => g.id === id);
const student = id => db.students.find(s => s.id === id);
const studentsOf = gid => db.students.filter(s => s.groupId === gid);
const countIn = gid => studentsOf(gid).length;


// Student's subjects (old data without subjects falls back to the group's subjects)
function getSubjects(s) {
  if (Array.isArray(s.subjects) && s.subjects.length === 7) return s.subjects;
  const g = group(s.groupId);
  return (g && Array.isArray(g.subjects) && g.subjects.length === 7) ? g.subjects : Array(7).fill('');
}
const subjectOn = (s, i) => String(getSubjects(s)[i] || '').trim();


// Fee calculation
function monthsDue(s) {
  const [y, m, d] = String(s.joining).split('-').map(Number);
  const joined = new Date(y, m - 1, d);
  if (!y || m < 1 || m > 12 || d < 1 ||
      joined.getFullYear() !== y || joined.getMonth() !== m - 1 || joined.getDate() !== d) return 0;

  const n = new Date();
  const elapsed = (n.getFullYear() - y) * 12 + (n.getMonth() - (m - 1));
  if (elapsed <= 0) return 0;

  const dueMonth = new Date(y, m - 1 + elapsed, 1);
  const lastDay = new Date(dueMonth.getFullYear(), dueMonth.getMonth() + 1, 0).getDate();
  const dueDate = new Date(dueMonth.getFullYear(), dueMonth.getMonth(), Math.min(d, lastDay));
  return n >= dueDate ? elapsed : elapsed - 1;
}
const totalDue = s => s.fee * monthsDue(s);
const paid = s => (s.payments || []).reduce((a, p) => a + (Number(p.amount) || 0), 0);
const pending = s => Math.max(0, totalDue(s) - paid(s));
const sumPaid = list => list.reduce((a, s) => a + paid(s), 0);
const sumPending = list => list.reduce((a, s) => a + pending(s), 0);


// Current month helpers (used for "Collected" on Dashboard and Groups)
function monthKey() {
  const n = new Date();
  return n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0');
}
const monthShort = () => new Date().toLocaleString('en-US', { month: 'short' });
const paidThisMonth = s => (s.payments || [])
  .filter(p => String(p.date).slice(0, 7) === monthKey())
  .reduce((a, p) => a + (Number(p.amount) || 0), 0);
const sumPaidMonth = list => list.reduce((a, s) => a + paidThisMonth(s), 0);