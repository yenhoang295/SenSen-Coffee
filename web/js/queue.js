const LABEL = {
  QUIET: '🟢 Đang vắng',
  BUSY: '🟡 Đang khá đông',
  CROWDED: '🔴 Đang rất đông',
};

const COLOR = {
  QUIET: '#e3f5e8',
  BUSY: '#fdf3d6',
  CROWDED: '#fbe3e0',
};

const banner = document.getElementById('queue-banner');

async function loadQueue() {
  if (!banner) return;

  try {
    const response = await fetch('/api/queue/status');
    if (!response.ok) {
      banner.hidden = true;
      return;
    }

    const status = await response.json();
    banner.hidden = false;

    if (status.acceptingOrders === false) {
      banner.style.background = '#e5e5e5';
      banner.textContent = '⛔ Quán tạm ngưng nhận đơn online, vui lòng quay lại sau';
      return;
    }

    banner.style.background = COLOR[status.level] ?? '#eee';

    const cups = status.cups ?? status.activeOrders;
    const staff = status.baristas > 1
      ? ` · ${status.baristas} người pha chế`
      : '';

    banner.textContent =
      `${LABEL[status.level]} · ${cups} ly đang xử lý${staff} · Thời gian dự kiến: ${status.etaMinutes} phút`;
  } catch {
    banner.hidden = true;
  }
}

loadQueue();
setInterval(loadQueue, 30000);