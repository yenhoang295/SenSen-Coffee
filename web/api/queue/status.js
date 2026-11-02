import { calcQueueStatus } from '../_lib/core.js';
import { baseUrl, sendJson, sendError } from '../_lib/http.js';

// Queue Service: gọi Order lấy số đơn đang xử lý, áp quy tắc nghiệp vụ, trả mức đông.
export default async function handler(req, res) {
  if (req.method !== 'GET') return sendError(res, 405, 'METHOD_NOT_ALLOWED', 'Chỉ hỗ trợ GET');
  let r;
  try {
    r = await fetch(`${baseUrl(req)}/api/orders/active-count`, {
      headers: { 'x-internal-key': process.env.INTERNAL_API_KEY ?? '' },
    });
  } catch {
    return sendError(res, 503, 'ORDER_SERVICE_DOWN', 'Chưa lấy được số đơn đang xử lý');
  }
  if (!r.ok) return sendError(res, 503, 'ORDER_SERVICE_DOWN', 'Chưa lấy được số đơn đang xử lý');
  const { count } = await r.json();
  res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=20');
  return sendJson(res, 200, { ...calcQueueStatus(count), updatedAt: new Date().toISOString() });
}
