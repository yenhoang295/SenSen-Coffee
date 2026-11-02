import { calcQueueStatus } from '../_lib/core.js';
import { baseUrl, sendJson, sendError } from '../_lib/http.js';

// Queue Service: lấy tải hiện tại từ Order, tính mức đông và thời gian chờ.
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return sendError(res, 405, 'METHOD_NOT_ALLOWED', 'Chỉ hỗ trợ GET');
  }

  let response;
  try {
    response = await fetch(`${baseUrl(req)}/api/orders/active-count`, {
      headers: { 'x-internal-key': process.env.INTERNAL_API_KEY ?? '' },
    });
  } catch {
    return sendError(res, 503, 'ORDER_SERVICE_DOWN', 'Chưa lấy được số đơn đang xử lý');
  }

  if (!response.ok) {
    return sendError(res, 503, 'ORDER_SERVICE_DOWN', 'Chưa lấy được số đơn đang xử lý');
  }

  const info = await response.json();
  res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=20');

  return sendJson(res, 200, {
    ...calcQueueStatus(info.count),
    cups: info.cups,
    orders: info.orders,
    baristas: info.baristas,
    acceptingOrders: info.acceptingOrders,
    updatedAt: new Date().toISOString(),
  });
}