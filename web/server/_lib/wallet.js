export const TOPUP_MIN = 1000;
export const TOPUP_MAX = 5000000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Nhân viên nạp ví: email khách và số tiền (bội số của 1.000 đồng).
export function validateTopup(body) {
  const errors = [];
  if (typeof body?.email !== 'string' || !/^\S+@\S+\.\S+$/.test(body.email.trim())) errors.push('email');
  const a = body?.amount;
  if (!Number.isInteger(a) || a < TOPUP_MIN || a > TOPUP_MAX || a % 1000 !== 0) errors.push('amount');
  return errors;
}

// Dùng cho lời gọi nội bộ giữa các dịch vụ: trừ ví, hoàn ví, cộng điểm.
export function validateMoneyMove(body) {
  const errors = [];
  if (typeof body?.userId !== 'string' || !UUID.test(body.userId)) errors.push('userId');
  if (!Number.isInteger(body?.orderId) || body.orderId < 1) errors.push('orderId');
  if (!Number.isInteger(body?.amount) || body.amount < 1) errors.push('amount');
  return errors;
}

export function isInternalRequest(req) {
  const key = req.headers['x-internal-key'];
  return Boolean(key) && key === process.env.INTERNAL_API_KEY;
}
