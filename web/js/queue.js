const LABEL = { QUIET: '🟢 Đang vắng', BUSY: '🟡 Đang khá đông', CROWDED: '🔴 Đang rất đông' };
const COLOR = { QUIET: '#e3f5e8', BUSY: '#fdf3d6', CROWDED: '#fbe3e0' };
const banner = document.getElementById('queue-banner');

async function loadQueue() {
  if (!banner) return;
  try {
    const r = await fetch('/api/queue/status');
    if (!r.ok) { banner.hidden = true; return; }
    const s = await r.json();
    banner.hidden = false;
    banner.style.background = COLOR[s.level] ?? '#eee';
    banner.textContent = `${LABEL[s.level]} · ${s.activeOrders} đơn đang xử lý · Thời gian dự kiến: ${s.etaMinutes} phút`;
  } catch {
    banner.hidden = true;
  }
}

loadQueue();
setInterval(loadQueue, 30000);
