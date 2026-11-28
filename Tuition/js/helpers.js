// ───────────── Helpers ─────────────
const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const FULLDAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

const $ = id => document.getElementById(id);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

// Escape text so it is safe to put inside HTML
const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));

const money = v => '₹' + Math.round(Number(v) || 0).toLocaleString('en-IN');

// Today's date as YYYY-MM-DD
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// 2025-08-10 -> 10/08/2025 (safe for empty / wrong values)
const fmtDate = iso => {
  if (!iso || !String(iso).includes('-')) return '-';
  const [y, m, d] = String(iso).slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
};

// 16:30 -> 4:30 PM (safe for empty / wrong values)
const fmtTime = t => {
  if (!t || !String(t).includes(':')) return '-';
  let [h, m] = String(t).split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return '-';
  const ap = h < 12 ? 'AM' : 'PM';
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, '0')} ${ap}`;
};

// Mon = 0 ... Sun = 6
const todayIdx = () => (new Date().getDay() + 6) % 7;