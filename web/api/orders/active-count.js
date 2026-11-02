import { sendJson, sendError } from '../_lib/http.js';
import { getLoad } from '../_lib/load.js';

// Chỉ Queue Service gọi (có x-internal-key).
export default async function handler(req, res) {
  const key = req.headers['x-internal-key'];

  if (!key || key !== process.env.INTERNAL_API_KEY) {
    return sendError(res, 401, 'UNAUTHORIZED', 'Thiếu khóa nội bộ');
  }

  try {
    const load = await getLoad();

    return sendJson(res, 200, {
      count: load.load,
      cups: load.cups,
      orders: load.orders,
      baristas: load.baristas,
      acceptingOrders: load.acceptingOrders,
    });
  } catch {
    return sendError(res, 500, 'DB_ERROR', 'Không đếm được đơn');
  }
}