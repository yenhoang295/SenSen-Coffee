import { sendJson, sendError } from '../_lib/http.js';
import { countActiveOrders } from '../_lib/orders.js';

// Chỉ Queue Service gọi (có x-internal-key).
export default async function handler(req, res) {
  const key = req.headers['x-internal-key'];
  if (!key || key !== process.env.INTERNAL_API_KEY) {
    return sendError(res, 401, 'UNAUTHORIZED', 'Thiếu khóa nội bộ');
  }
  try {
    return sendJson(res, 200, { count: await countActiveOrders() });
  } catch {
    return sendError(res, 500, 'DB_ERROR', 'Không đếm được đơn');
  }
}
