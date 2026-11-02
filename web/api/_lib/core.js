const FLAGS = ['best_seller', 'new_product', 'monthly_special'];

// Đọc tham số truy vấn của danh sách món và làm sạch.
export function parseProductQuery(query = {}) {
  const category = Number(query.category);
  const categoryId = Number.isInteger(category) && category > 0 ? category : null;
  const q = typeof query.q === 'string' && query.q.trim() ? query.q.trim() : null;
  const flag = FLAGS.includes(query.flag) ? query.flag : null;
  return { categoryId, q, flag };
}

export const STATUSES = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'COMPLETED', 'REJECTED', 'CANCELLED'];

const NEXT = {
  PENDING: ['CONFIRMED', 'REJECTED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY'],
  READY: ['COMPLETED'],
  COMPLETED: [],
  REJECTED: [],
  CANCELLED: [],
};

export function canTransition(from, to) {
  return (NEXT[from] ?? []).includes(to);
}

export function requiresReason(status) {
  return status === 'REJECTED';
}

export function calcOrderTotal(items) {
  return items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
}

export const MINUTES_PER_ORDER = 1.2;

export function calcQueueStatus(activeOrders) {
  const n = Math.max(0, Math.floor(activeOrders));
  const level = n <= 5 ? 'QUIET' : n <= 15 ? 'BUSY' : 'CROWDED';
  const etaMinutes = Math.max(5, Math.ceil((n * MINUTES_PER_ORDER) / 5) * 5);
  return { level, activeOrders: n, etaMinutes };
}

// Trả về danh sách tên trường sai; rỗng nghĩa là hợp lệ.
export function validateOrderInput(body, now = new Date()) {
  const errors = [];
  if (typeof body?.customerName !== 'string' || !body.customerName.trim()) errors.push('customerName');
  if (!/^0\d{9}$/.test(body?.phone ?? '')) errors.push('phone');

  const items = body?.items;
  const badItem = i => !Number.isInteger(i?.productId) || !Number.isInteger(i?.quantity) || i.quantity < 1 || i.quantity > 20;
  if (!Array.isArray(items) || items.length === 0 || items.some(badItem)) errors.push('items');

  if (body?.pickupTime !== undefined && body.pickupTime !== null) {
    const t = new Date(body.pickupTime).getTime();
    const min = now.getTime() + 15 * 60 * 1000;
    const max = now.getTime() + 24 * 60 * 60 * 1000;
    if (Number.isNaN(t) || t < min || t > max) errors.push('pickupTime');
  }
  if (body?.tableNo !== undefined && body.tableNo !== null) {
    if (!Number.isInteger(body.tableNo) || body.tableNo < 1 || body.tableNo > 99) errors.push('tableNo');
  }
  if (body?.paymentMethod !== undefined && !['CASH', 'TRANSFER', 'WALLET'].includes(body.paymentMethod)) errors.push('paymentMethod');
  if (body?.note !== undefined && body.note !== null && (typeof body.note !== 'string' || body.note.length > 200)) errors.push('note');
  return errors;
}

// 1 điểm cho mỗi 10.000 đồng, làm tròn xuống.
export function calcPoints(amount) {
  const n = Number(amount);
  return Number.isFinite(n) && n > 0 ? Math.floor(n / 10000) : 0;
}
