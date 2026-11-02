import { getAccessToken, signIn, signOut, getRole } from './session.js';

const $ = id => document.getElementById(id);
const money = n => new Intl.NumberFormat('vi-VN').format(n) + ' đ';

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

// Bản sao quy tắc chuyển trạng thái để vẽ nút.
// Máy chủ vẫn kiểm tra lại quyền chuyển trạng thái.
const ACTIONS = {
  PENDING: [['CONFIRMED', 'Xác nhận'], ['REJECTED', 'Từ chối']],
  CONFIRMED: [['PREPARING', 'Bắt đầu pha chế'], ['CANCELLED', 'Hủy đơn']],
  PREPARING: [['READY', 'Sẵn sàng']],
  READY: [['COMPLETED', 'Hoàn tất']],
};

let timer;
let acceptingOrders = true;

async function api(path, options = {}) {
  const token = await getAccessToken();
  const headers = { 'content-type': 'application/json' };

  if (token) {
    headers.authorization = `Bearer ${token}`;
  }

  const r = await fetch(path, {
    ...options,
    headers: { ...headers, ...options.headers },
  });

  const data = await r.json().catch(() => ({}));

  if (!r.ok) {
    throw new Error(data.message || `Lỗi ${r.status}`);
  }

  return data;
}

async function patch(id, body) {
  try {
    await api(`/api/orders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    $('panel-msg').textContent = '';
  } catch (e) {
    $('panel-msg').textContent = e.message;
  }

  loadOrders();
}

function renderOrder(o) {
  const card = el('article', 'order-card');
  const head = el('div', 'order-head');

  head.append(
    el('strong', '', `#${o.orderId}`),
    el('span', 'tag', STATUS_LABEL[o.status] ?? o.status),
    el(
      'span',
      '',
      new Date(o.createdAt).toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      })
    )
  );

  card.append(head);

  const who = `${o.customerName} · ${o.phone}` +
    (o.tableNo ? ` · Bàn ${o.tableNo}` : '');

  card.append(el('div', '', who));

  if (o.pickupTime) {
    const t = new Date(o.pickupTime).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });
    card.append(el('div', '', `Giờ nhận: ${t}`));
  }

  const ul = el('ul', 'plain');

  for (const i of o.items) {
    ul.append(el('li', '', `${i.productName} x ${i.quantity}`));
  }

  card.append(ul);
  card.append(
    el(
      'div',
      '',
      `${money(o.totalAmount)} · ${PAY_LABEL[o.paymentMethod]} · ${PAID_LABEL[o.paymentStatus]}`
    )
  );

  if (o.rejectReason) {
    card.append(el('div', 'bad', `Lý do: ${o.rejectReason}`));
  }

  const actions = el('div', 'actions');
  const closed = ['REJECTED', 'CANCELLED', 'COMPLETED'].includes(o.status);

  if (o.paymentStatus === 'UNPAID' && !closed) {
    const pay = el('button', '', 'Đã thu tiền');
    pay.type = 'button';
    pay.addEventListener('click', () => {
      patch(o.orderId, { paymentStatus: 'PAID' });
    });
    actions.append(pay);
  }

  for (const [next, label] of ACTIONS[o.status] ?? []) {
    const isDanger = next === 'REJECTED' || next === 'CANCELLED';
    const button = el('button', isDanger ? 'danger' : '', label);
    button.type = 'button';

    button.addEventListener('click', () => {
      if (next === 'REJECTED') {
        const reason = prompt('Lý do từ chối đơn:');

        if (!reason || !reason.trim()) return;

        patch(o.orderId, { status: next, reason });
      } else {
        patch(o.orderId, { status: next });
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

    const box = $('orders');
    box.replaceChildren(...orders.map(renderOrder));
    $('empty').hidden = orders.length > 0;
  } catch (e) {
    $('panel-msg').textContent = e.message;
  }
}

// Đọc cài đặt quán từ API và cập nhật các nút trên trang.
async function loadShop() {
  const message = $('shop-msg');

  try {
    const shop = await api('/api/shop');

    $('baristas').value = String(shop.baristas);
    acceptingOrders = shop.acceptingOrders;

    $('toggle-orders').textContent = acceptingOrders
      ? 'Tạm dừng nhận đơn'
      : 'Mở lại nhận đơn';

    message.textContent = acceptingOrders
      ? 'Quán đang nhận đơn online.'
      : 'Quán đang tạm dừng nhận đơn online.';
  } catch (e) {
    message.textContent = `Không tải được cài đặt quán: ${e.message}`;
  }
}

// Lưu số nhân viên pha chế.
async function saveShop() {
  const message = $('shop-msg');
  const baristas = Number($('baristas').value);

  try {
    const shop = await api('/api/shop', {
      method: 'PATCH',
      body: JSON.stringify({ baristas }),
    });

    acceptingOrders = shop.acceptingOrders;
    message.textContent = 'Đã lưu số nhân viên pha chế.';
  } catch (e) {
    message.textContent = `Không lưu được: ${e.message}`;
  }
}

// Tạm dừng hoặc mở lại việc nhận đơn online.
async function toggleOrders() {
  const message = $('shop-msg');
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

    message.textContent = acceptingOrders
      ? 'Quán đã nhận đơn online trở lại.'
      : 'Quán đã tạm dừng nhận đơn online.';
  } catch (e) {
    message.textContent = `Không cập nhật được trạng thái quán: ${e.message}`;
  }
}

async function showPanel() {
  const role = await getRole();
  const allowed = role === 'staff' || role === 'admin';

  $('login-panel').hidden = allowed;
  $('panel').hidden = !allowed;

  clearInterval(timer);

  if (allowed) {
    loadShop();
    loadOrders();
    timer = setInterval(loadOrders, 15000);
  } else if (role) {
    await signOut();
    $('login-msg').textContent = 'Tài khoản này không có quyền nhân viên.';
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
$('save-shop').addEventListener('click', saveShop);
$('toggle-orders').addEventListener('click', toggleOrders);

showPanel();