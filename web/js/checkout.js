import { loadCart, saveCart, captureTable } from './cart.js';
import { cartTotal } from './cart-core.js';
import { getAccessToken } from './session.js';

const $ = id => document.getElementById(id);
const money = n => new Intl.NumberFormat('vi-VN').format(n) + ' đ';
const pad = n => String(n).padStart(2, '0');

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

const cart = loadCart();
const table = captureTable();

function renderSummary() {
  const list = $('summary');
  list.replaceChildren();

  for (const item of cart) {
    const li = el('li', 'line2');
    li.append(
      el('span', '', `${item.name} x ${item.quantity}`),
      el('span', '', money(item.price * item.quantity))
    );
    list.append(li);
  }

  $('total').textContent = money(cartTotal(cart));
  if (table) $('table-info').textContent = `Bàn số ${table}`;
}

// Tạo các khung giờ nhận món theo thời gian chờ hiện tại.
async function fillPickupSlots() {
  const select = $('pickup');
  let eta = 0;

  try {
    const response = await fetch('/api/queue/status');

    if (response.ok) {
      const status = await response.json();
      eta = status.etaMinutes ?? 0;

      if (status.acceptingOrders === false) {
        $('message').textContent =
          'Quán đang tạm ngưng nhận đơn online, vui lòng thử lại sau.';
        $('submit').disabled = true;
      }
    }
  } catch {
    // Nếu không lấy được thông tin hàng chờ thì dùng giờ mặc định.
  }

  select.options[0].textContent = eta
    ? `Càng sớm càng tốt (khoảng ${eta} phút)`
    : 'Càng sớm càng tốt';

  const start = new Date(Date.now() + Math.max(20, eta + 5) * 60000);
  start.setSeconds(0, 0);
  start.setMinutes(Math.ceil(start.getMinutes() / 15) * 15);

  for (let i = 0; i < 12; i++) {
    const time = new Date(start.getTime() + i * 15 * 60000);
    const option = document.createElement('option');
    option.value = time.toISOString();
    option.textContent = `${pad(time.getHours())}:${pad(time.getMinutes())}`;
    select.append(option);
  }
}

// Hiện số dư ví và điểm nếu khách đã đăng nhập.
async function loadWallet() {
  const info = $('wallet-info');
  const token = await getAccessToken();

  if (!token) {
    info.textContent = 'Đăng nhập để thanh toán bằng ví và tích điểm.';
    return;
  }

  try {
    const response = await fetch('/api/wallet/me', {
      headers: { authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      info.textContent = 'Không tải được số dư ví.';
      return;
    }

    const wallet = await response.json();
    info.textContent =
      `Số dư ví: ${money(wallet.balance)} · Điểm: ${wallet.points}`;

    if (wallet.fullName && !$('name').value) {
      $('name').value = wallet.fullName;
    }
  } catch {
    info.textContent = 'Không tải được thông tin ví.';
  }
}

function showDone(data, phone, payment) {
  $('form-panel').hidden = true;

  const box = $('done');
  box.hidden = false;
  box.replaceChildren();

  box.append(el('h2', '', 'Đặt món thành công'));
  box.append(el('p', '', `Mã đơn: ${data.orderId}`));
  box.append(el('p', '', `Tổng tiền: ${money(data.totalAmount)}`));

  if (data.etaMinutes) {
    box.append(
      el('p', '', `Thời gian dự kiến: khoảng ${data.etaMinutes} phút`)
    );
  }

  if (payment === 'TRANSFER') {
    box.append(
      el(
        'p',
        '',
        `Chuyển khoản với nội dung: SENSEN ${data.orderId}. Nhân viên sẽ xác nhận khi nhận được tiền.`
      )
    );

    const qr = el('img', 'qr');
    qr.src = 'images/qr-chuyen-khoan.png';
    qr.alt = 'Mã QR chuyển khoản';
    qr.addEventListener('error', () => {
      qr.hidden = true;
    });
    box.append(qr);
  } else if (payment === 'WALLET') {
    box.append(
      el(
        'p',
        '',
        'Đã thanh toán bằng ví SENSEN. Điểm được cộng khi đơn hoàn tất.'
      )
    );
  } else {
    box.append(el('p', '', 'Thanh toán tiền mặt khi nhận món.'));
  }

  const link = el('a', '', 'Theo dõi đơn của bạn');
  link.href = `track.html?id=${data.orderId}&phone=${encodeURIComponent(phone)}`;
  box.append(link);
}

$('order-form').addEventListener('submit', async event => {
  event.preventDefault();

  const message = $('message');
  message.textContent = '';

  const phone = $('phone').value.trim();
  const payment = document.querySelector('input[name=pay]:checked').value;

  const body = {
    customerName: $('name').value.trim(),
    phone,
    paymentMethod: payment,
    items: cart.map(item => ({
      productId: item.productId,
      quantity: item.quantity,
    })),
  };

  const note = $('note').value.trim();
  if (note) body.note = note;
  if ($('pickup').value) body.pickupTime = $('pickup').value;
  if (table) body.tableNo = Number(table);

  const headers = { 'content-type': 'application/json' };
  const token = await getAccessToken();

  if (token) {
    headers.authorization = `Bearer ${token}`;
  }

  if (payment === 'WALLET' && !token) {
    message.textContent =
      'Hãy đăng nhập ở mục Tài khoản để thanh toán bằng ví.';
    return;
  }

  const button = $('submit');
  button.disabled = true;

  try {
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      message.textContent =
        data.message || 'Không đặt được món, thử lại sau.';
      button.disabled = false;
      return;
    }

    saveCart([]);
    showDone(data, phone, payment);
  } catch {
    message.textContent = 'Mất kết nối, thử lại sau.';
    button.disabled = false;
  }
});

if (cart.length === 0) {
  $('form-panel').hidden = true;
  $('empty').hidden = false;
} else {
  renderSummary();
  fillPickupSlots();
  loadWallet();
}