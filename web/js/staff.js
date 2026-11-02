import { getAccessToken, signIn, signOut, getRole } from './session.js';

const $ = id => document.getElementById(id);
const money = n => new Intl.NumberFormat('vi-VN').format(n) + ' đ';

const hhmm = value =>
  new Date(value).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });

const dayhh = value =>
  new Date(value).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

const STATUS_LABEL = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  PREPARING: 'Đang pha chế',
  READY: 'Sẵn sàng',
  COMPLETED: 'Hoàn tất',
  REJECTED: 'Đã từ chối',
  CANCELLED: 'Đã hủy',
};

const PAY_LABEL = {
  CASH: 'Tiền mặt',
  TRANSFER: 'Chuyển khoản',
  WALLET: 'Ví',
};

const PAID_LABEL = {
  UNPAID: 'Chưa thu',
  PAID: 'Đã thu',
  REFUNDED: 'Đã hoàn',
};

const ACTIONS = {
  PENDING: [['CONFIRMED', 'Xác nhận'], ['REJECTED', 'Từ chối']],
  CONFIRMED: [['PREPARING', 'Bắt đầu pha chế'], ['CANCELLED', 'Hủy đơn']],
  PREPARING: [['READY', 'Sẵn sàng']],
  READY: [['COMPLETED', 'Hoàn tất']],
};

const RESERVATION_ACTIONS = {
  PENDING: [['CONFIRMED', 'Xác nhận'], ['CANCELLED', 'Hủy']],
  CONFIRMED: [['COMPLETED', 'Khách đã đến'], ['CANCELLED', 'Hủy']],
};

let timer;
let activeTab = 'orders';
let acceptingOrders = true;

async function api(path, options = {}) {
  const token = await getAccessToken();
  const headers = { 'content-type': 'application/json' };

  if (token) {
    headers.authorization = `Bearer ${token}`;
  }

  const response = await fetch(path, {
    ...options,
    headers: { ...headers, ...options.headers },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || `Lỗi ${response.status}`);
  }

  return data;
}

// ---------- Đơn hàng ----------

async function patchOrder(id, body) {
  try {
    await api(`/api/orders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    $('panel-msg').textContent = '';
  } catch (error) {
    $('panel-msg').textContent = error.message;
  }

  loadOrders();
}

function renderOrder(order) {
  const card = el('article', 'order-card');
  const head = el('div', 'order-head');

  head.append(
    el('strong', '', `#${order.orderId}`),
    el('span', 'tag', STATUS_LABEL[order.status] ?? order.status),
    el('span', '', hhmm(order.createdAt))
  );
  card.append(head);

  card.append(
    el(
      'div',
      '',
      `${order.customerName} · ${order.phone}` +
        (order.tableNo ? ` · Bàn ${order.tableNo}` : '')
    )
  );

  if (order.groupCode) {
    card.append(el('div', '', `Đơn nhóm ${order.groupCode}`));
  }

  if (order.pickupTime) {
    card.append(el('div', '', `Giờ nhận: ${hhmm(order.pickupTime)}`));
  }

  const list = el('ul', 'plain');
  for (const item of order.items) {
    list.append(el('li', '', `${item.productName} x ${item.quantity}`));
  }
  card.append(list);

  card.append(
    el(
      'div',
      '',
      `${money(order.totalAmount)} · ${PAY_LABEL[order.paymentMethod]} · ${PAID_LABEL[order.paymentStatus]}`
    )
  );

  if (order.pointsEarned) {
    card.append(el('div', 'ok', `Đã cộng ${order.pointsEarned} điểm`));
  }

  if (order.rejectReason) {
    card.append(el('div', 'bad', `Lý do: ${order.rejectReason}`));
  }

  const actions = el('div', 'actions');
  const closed = ['REJECTED', 'CANCELLED', 'COMPLETED'].includes(order.status);

  if (order.paymentStatus === 'UNPAID' && !closed) {
    const paidButton = el('button', '', 'Đã thu tiền');
    paidButton.type = 'button';
    paidButton.addEventListener('click', () => {
      patchOrder(order.orderId, { paymentStatus: 'PAID' });
    });
    actions.append(paidButton);
  }

  for (const [nextStatus, label] of ACTIONS[order.status] ?? []) {
    const isDanger = nextStatus === 'REJECTED' || nextStatus === 'CANCELLED';
    const button = el('button', isDanger ? 'danger' : '', label);
    button.type = 'button';

    button.addEventListener('click', () => {
      if (nextStatus === 'REJECTED') {
        const reason = prompt('Lý do từ chối đơn:');
        if (!reason || !reason.trim()) return;

        patchOrder(order.orderId, { status: nextStatus, reason });
      } else {
        patchOrder(order.orderId, { status: nextStatus });
      }
    });

    actions.append(button);
  }

  card.append(actions);
  return card;
}

function renderReport(report) {
  $('report-revenue').textContent = money(report.revenue);
  $('report-count').textContent = String(report.completedPaidOrders);

  const productBox = $('report-products');
  productBox.replaceChildren();
  if (!report.bestSellers.length) {
    productBox.append(el('p', '', 'Chưa có đơn hoàn tất trong khoảng ngày này.'));
  } else {
    const table = document.createElement('table');
    table.className = 'report-table';
    const head = document.createElement('tr');
    for (const title of ['Món', 'Số lượng', 'Doanh thu']) {
      const th = document.createElement('th');
      th.textContent = title;
      head.append(th);
    }
    const thead = document.createElement('thead');
    thead.append(head);
    table.append(thead);
    const tbody = document.createElement('tbody');
    for (const item of report.bestSellers) {
      const row = document.createElement('tr');
      for (const value of [item.productName, item.quantity, money(item.revenue)]) {
        const cell = document.createElement('td');
        cell.textContent = String(value);
        row.append(cell);
      }
      tbody.append(row);
    }
    table.append(tbody);
    productBox.append(table);
  }

  const hoursBox = $('report-hours');
  hoursBox.replaceChildren();
  const maxOrders = Math.max(1, ...report.peakHours.map(item => item.orders));
  for (const item of report.peakHours) {
    const hour = el('div', 'report-hour');
    hour.append(el('strong', '', `${String(item.hour).padStart(2, '0')}:00`));
    hour.append(el('div', '', `${item.orders} đơn`));
    const bar = el('div', 'report-hour-bar');
    bar.style.width = `${Math.max(4, item.orders / maxOrders * 100)}%`;
    hour.append(bar);
    hoursBox.append(hour);
  }
}

function setDefaultReportDates() {
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
  $('report-from').value = today;
  $('report-to').value = today;
}

async function loadReport() {
  const from = $('report-from').value;
  const to = $('report-to').value;
  const message = $('report-message');
  message.className = '';
  message.textContent = '';
  if (!from || !to || from > to) {
    message.className = 'bad';
    message.textContent = 'Chọn khoảng ngày hợp lệ trước khi xem.';
    return;
  }
  try {
    const query = new URLSearchParams({ from, to });
    const report = await api(`/api/reports?${query}`);
    renderReport(report);
    message.textContent = `Báo cáo từ ${from} đến ${to}.`;
  } catch (error) {
    message.className = 'bad';
    message.textContent = error.message;
  }
}

async function loadOrders() {
  const status = $('filter').value;

  try {
    const orders = await api(
      '/api/orders' + (status ? `?status=${encodeURIComponent(status)}` : '')
    );

    $('orders').replaceChildren(...orders.map(renderOrder));
    $('empty').hidden = orders.length > 0;
  } catch (error) {
    $('panel-msg').textContent = error.message;
  }
}

// ---------- Đặt bàn ----------

async function patchReservation(id, status) {
  try {
    await api(`/api/reservations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    $('panel-msg').textContent = '';
  } catch (error) {
    $('panel-msg').textContent = error.message;
  }

  loadReservations();
}

function renderReservation(reservation) {
  const card = el('article', 'order-card');
  const head = el('div', 'order-head');

  head.append(
    el(
      'strong',
      '',
      `#${reservation.reservationId} · Bàn ${reservation.tableNo}`
    ),
    el(
      'span',
      'tag',
      STATUS_LABEL[reservation.status] ?? reservation.status
    )
  );
  card.append(head);

  card.append(
    el(
      'div',
      '',
      `${dayhh(reservation.reserveTime)} · ${reservation.partySize} người (bàn ${reservation.seats} chỗ)`
    )
  );
  card.append(
    el('div', '', `${reservation.customerName} · ${reservation.phone}`)
  );

  const actions = el('div', 'actions');

  for (const [nextStatus, label] of RESERVATION_ACTIONS[reservation.status] ?? []) {
    const button = el(
      'button',
      nextStatus === 'CANCELLED' ? 'danger' : '',
      label
    );
    button.type = 'button';
    button.addEventListener('click', () => {
      patchReservation(reservation.reservationId, nextStatus);
    });
    actions.append(button);
  }

  card.append(actions);
  return card;
}

async function loadReservations() {
  const status = $('r-filter').value;

  try {
    const reservations = await api(
      '/api/reservations' +
        (status ? `?status=${encodeURIComponent(status)}` : '')
    );

    $('reservations').replaceChildren(...reservations.map(renderReservation));
    $('r-empty').hidden = reservations.length > 0;
  } catch (error) {
    $('panel-msg').textContent = error.message;
  }
}

// ---------- Nạp ví cho khách ----------

async function topup() {
  const message = $('topup-msg');
  message.className = '';
  message.textContent = '';

  try {
    const result = await api('/api/wallet/topup', {
      method: 'POST',
      body: JSON.stringify({
        email: $('topup-email').value.trim(),
        amount: Number($('topup-amount').value),
      }),
    });

    message.className = 'ok';
    message.textContent =
      `Đã nạp. Số dư mới của ${result.email}: ${money(result.balance)}`;
    $('topup-amount').value = '';
  } catch (error) {
    message.className = 'bad';
    message.textContent = error.message;
  }
}

// ---------- Cài đặt quán từ Ngày 3 ----------

async function loadShop() {
  try {
    const shop = await api('/api/shop');

    $('baristas').value = String(shop.baristas);
    acceptingOrders = shop.acceptingOrders;

    $('toggle-orders').textContent = acceptingOrders
      ? 'Tạm dừng nhận đơn'
      : 'Mở lại nhận đơn';

    $('shop-msg').textContent = acceptingOrders
      ? 'Quán đang nhận đơn online.'
      : 'Quán đang tạm dừng nhận đơn online.';
  } catch (error) {
    $('shop-msg').textContent =
      `Không tải được cài đặt quán: ${error.message}`;
  }
}

async function saveShop() {
  const baristas = Number($('baristas').value);

  try {
    const shop = await api('/api/shop', {
      method: 'PATCH',
      body: JSON.stringify({ baristas }),
    });

    acceptingOrders = shop.acceptingOrders;
    $('shop-msg').textContent = 'Đã lưu số nhân viên pha chế.';
  } catch (error) {
    $('shop-msg').textContent = `Không lưu được: ${error.message}`;
  }
}

async function toggleOrders() {
  const nextValue = !acceptingOrders;

  try {
    const shop = await api('/api/shop', {
      method: 'PATCH',
      body: JSON.stringify({ acceptingOrders: nextValue }),
    });

    acceptingOrders = shop.acceptingOrders;
    $('toggle-orders').textContent = acceptingOrders
      ? 'Tạm dừng nhận đơn'
      : 'Mở lại nhận đơn';

    $('shop-msg').textContent = acceptingOrders
      ? 'Quán đã nhận đơn online trở lại.'
      : 'Quán đã tạm dừng nhận đơn online.';
  } catch (error) {
    $('shop-msg').textContent =
      `Không cập nhật được trạng thái quán: ${error.message}`;
  }
}

// ---------- Chuyển tab ----------

function showTab(name) {
  activeTab = name;

  for (const button of document.querySelectorAll('.tab')) {
    button.classList.toggle('active', button.dataset.tab === name);
  }

  for (const tabName of ['orders', 'pos', 'reports', 'reservations', 'wallet']) {
    $(`tab-${tabName}`).hidden = tabName !== name;
  }

  $('panel-msg').textContent = '';

  if (name === 'orders') {
    loadShop();
    loadOrders();
  }

  if (name === 'reservations') {
    loadReservations();
  }

  if (name === 'reports') {
    loadReport();
  }
}

async function showPanel() {
  const role = await getRole();
  const allowed = role === 'staff' || role === 'admin';

  $('login-panel').hidden = allowed;
  $('panel').hidden = !allowed;

  clearInterval(timer);

  if (allowed) {
    showTab(activeTab);
    timer = setInterval(() => {
      if (activeTab === 'orders') loadOrders();
    }, 15000);
  } else if (role) {
    await signOut();
    $('login-msg').textContent =
      'Tài khoản này không có quyền nhân viên.';
  }
}

$('login').addEventListener('click', async () => {
  const error = await signIn(
    $('email').value.trim(),
    $('password').value
  );

  if (error) {
    $('login-msg').textContent = 'Sai email hoặc mật khẩu.';
    return;
  }

  $('login-msg').textContent = '';
  showPanel();
});

$('logout').addEventListener('click', async () => {
  await signOut();
  showPanel();
});

$('filter').addEventListener('change', loadOrders);
$('refresh').addEventListener('click', loadOrders);
$('r-filter').addEventListener('change', loadReservations);
$('r-refresh').addEventListener('click', loadReservations);
$('topup').addEventListener('click', topup);
$('report-load').addEventListener('click', loadReport);
$('save-shop').addEventListener('click', saveShop);
$('toggle-orders').addEventListener('click', toggleOrders);

for (const button of document.querySelectorAll('.tab')) {
  button.addEventListener('click', () => showTab(button.dataset.tab));
}

showPanel();
setDefaultReportDates();
