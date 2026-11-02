import { supabase } from '../_lib/supabase.js';
import { sendJson, sendError } from '../_lib/http.js';
import { calcPoints } from '../_lib/core.js';
import { isInternalRequest, validateMoneyMove } from '../_lib/wallet.js';

// Chỉ Order gọi khi đơn hoàn tất và đã thu tiền: cộng điểm (1 điểm cho mỗi 10.000 đồng).
export default async function handler(req, res) {
  if (req.method !== 'POST') return sendError(res, 405, 'METHOD_NOT_ALLOWED', 'Chỉ hỗ trợ POST');
  if (!isInternalRequest(req)) return sendError(res, 401, 'UNAUTHORIZED', 'Thiếu khóa nội bộ');
  const errors = validateMoneyMove(req.body);
  if (errors.length) return sendError(res, 400, 'BAD_REQUEST', `Dữ liệu sai: ${errors.join(', ')}`);
  const { userId, amount } = req.body;

  const pointsAdded = calcPoints(amount);
  if (pointsAdded === 0) return sendJson(res, 200, { pointsAdded: 0 });
  const { data: points, error } = await supabase.rpc('change_points', { p_user: userId, p_delta: pointsAdded });
  if (error) return sendError(res, 500, 'DB_ERROR', 'Không cộng được điểm');
  return sendJson(res, 200, { pointsAdded, points });
}
