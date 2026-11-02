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
  for (const l of cart) {
    const li = el('li', 'line2');
    li.append(el('span', '', `${l.name} x ${l.quantity}`), el('span', '', money(l.price * l.quantity)));
    list.append(li);
  }
  $('total').textContent = money(cartTotal(cart));
  if (table) $('table-info').textContent = `Bàn số ${table}`;
}

// Các khung giờ nhận cách nhau 15 phút, bắt đầu sau ít nhất 20 phút.
function fillPickupSlots() {
  const select = $('pickup');
  const start = new Date(Date.now() + 20 * 60000);
  start.setSeconds(0, 0);
  start.setMinutes(Math.ceil(start.getMinutes() / 15) * 15);
  for (let i = 0; i < 12; i++) {
    const t = new Date(start.getTime() + i * 15 * 60000);
    const opt = document.createElement('option');
    opt.value = t.toISOString();
    opt.textContent = `${pad(t.getHours())}:${pad(t.getMinutes())}`;
    select.append(opt);
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
  if (data.etaMinutes) box.append(el('p', '', `Thời gian dự kiến: khoảng ${data.etaMinutes} phút`));
  if (payment === 'TRANSFER') {
    box.append(el('p', '', `Chuyển khoản với nội dung: SENSEN ${data.orderId}. Nhân viên sẽ xác nhận khi nhận được tiền.`));
    const qr = el('img', 'qr');
    qr.src = 'images/qr-chuyen-khoan.png';
    qr.alt = 'Mã QR chuyển khoản';
    qr.addEventListener('error', () => { qr.hidden = true; });
    box.append(qr);
  } else {
    box.append(el('p', '', 'Thanh toán tiền mặt khi nhận món.'));
  }
  const link = el('a', '', 'Theo dõi đơn của bạn');
  link.href = `track.html?id=${data.orderId}&phone=${encodeURIComponent(phone)}`;
  box.append(link);
}

$('order-form').addEventListener('submit', async e => {
  e.preventDefault();
  const msg = $('message');
  msg.textContent = '';
  const phone = $('phone').value.trim();
  const payment = document.querySelector('input[name=pay]:checked').value;
  const body = {
    customerName: $('name').value.trim(),
    phone,
    paymentMethod: payment,
    items: cart.map(l => ({ productId: l.productId, quantity: l.quantity })),
  };
  const note = $('note').value.trim();
  if (note) body.note = note;
  if ($('pickup').value) body.pickupTime = $('pickup').value;
  if (table) body.tableNo = Number(table);

  const headers = { 'content-type': 'application/json' };
  const token = await getAccessToken();
  if (token) headers.authorization = `Bearer ${token}`;

  const btn = $('submit');
  btn.disabled = true;
  try {
    const r = await fetch('/api/orders', { method: 'POST', headers, body: JSON.stringify(body) });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      msg.textContent = data.message || 'Không đặt được món, thử lại sau.';
      btn.disabled = false;
      return;
    }
    saveCart([]);
    showDone(data, phone, payment);
  } catch {
    msg.textContent = 'Mất kết nối, thử lại sau.';
    btn.disabled = false;
  }
});

if (cart.length === 0) {
  $('form-panel').hidden = true;
  $('empty').hidden = false;
} else {
  renderSummary();
  fillPickupSlots();
}
