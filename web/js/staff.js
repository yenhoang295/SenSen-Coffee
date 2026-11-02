import { getAccessToken, signOut, getRole } from './session.js';

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

  for (const tabName of ['orders', 'reservations', 'wallet']) {
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

}

async function showPanel() {
  const role = await getRole();

  // Chỉ có một trang đăng nhập chung là login.html.
  if (!role) { location.href = 'login.html'; return; }
  if (role === 'admin') { location.href = 'admin.html'; return; }
  if (role !== 'staff') { location.href = 'menu.html'; return; }

  $('panel').hidden = false;
  clearInterval(timer);
  showTab(activeTab);
  timer = setInterval(() => {
    if (activeTab === 'orders') loadOrders();
  }, 15000);
}

$('logout').addEventListener('click', async () => {
  await signOut();
  location.href = 'login.html';
});

$('filter').addEventListener('change', loadOrders);
$('refresh').addEventListener('click', loadOrders);
$('r-filter').addEventListener('change', loadReservations);
$('r-refresh').addEventListener('click', loadReservations);
$('topup').addEventListener('click', topup);
$('save-shop').addEventListener('click', saveShop);
$('toggle-orders').addEventListener('click', toggleOrders);

for (const button of document.querySelectorAll('.tab')) {
  button.addEventListener('click', () => showTab(button.dataset.tab));
}

showPanel();
