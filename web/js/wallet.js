import { getAccessToken } from './session.js';

const $ = id => document.getElementById(id);
const money = n => new Intl.NumberFormat('vi-VN').format(n) + ' đ';

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function label(t) {
  if (t.type === 'TOPUP') return 'Nạp tiền';
  if (t.type === 'PAYMENT') return `Thanh toán đơn #${t.orderId}`;
  if (t.type === 'REFUND') return `Hoàn tiền đơn #${t.orderId}`;
  return t.type;
}

async function init() {
  const token = await getAccessToken();
  if (!token) {
    $('need-login').hidden = false;
    return;
  }
  try {
    const r = await fetch('/api/wallet/me', { headers: { authorization: `Bearer ${token}` } });
    if (!r.ok) throw new Error(String(r.status));
    const w = await r.json();
    $('wallet-box').hidden = false;
    $('who').textContent = w.fullName ? `${w.fullName} (${w.email})` : w.email;
    $('balance').textContent = money(w.balance);
    $('points').textContent = String(w.points);
    const list = $('tx');
    list.replaceChildren();
    for (const t of w.transactions) {
      const li = el('li', 'line2');
      const when = new Date(t.createdAt).toLocaleString('vi-VN');
      li.append(el('span', '', `${label(t)} · ${when}`));
      const sign = t.amount > 0 ? '+' : '';
      li.append(el('span', t.amount > 0 ? 'ok' : 'bad', sign + money(t.amount)));
      list.append(li);
    }
    $('no-tx').hidden = w.transactions.length > 0;
  } catch {
    $('error').hidden = false;
  }
}

init();
