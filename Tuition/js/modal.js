// ───────────── Modal (popup) ─────────────
function openModal(html) {
  $('box').innerHTML = html;
  $('modal').classList.add('show');
}

function closeModal() {
  $('modal').classList.remove('show');
}

// Close when clicking outside the box
$('modal').addEventListener('mousedown', e => {
  if (e.target.id === 'modal') closeModal();
});