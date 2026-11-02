import { supabase } from '../_lib/supabase.js';
import { sendJson, sendError } from '../_lib/http.js';
import { isInternalRequest, validateMoneyMove } from '../_lib/wallet.js';

// Chỉ Order gọi: hoàn tiền ví khi đơn bị từ chối hoặc hủy. Hoàn một lần cho mỗi đơn.
export default async function handler(req, res) {
  if (req.method !== 'POST') return sendError(res, 405, 'METHOD_NOT_ALLOWED', 'Chỉ hỗ trợ POST');
  if (!isInternalRequest(req)) return sendError(res, 401, 'UNAUTHORIZED', 'Thiếu khóa nội bộ');
  const errors = validateMoneyMove(req.body);
  if (errors.length) return sendError(res, 400, 'BAD_REQUEST', `Dữ liệu sai: ${errors.join(', ')}`);
  const { userId, orderId, amount } = req.body;

  const { data: existing } = await supabase.from('wallet_transactions')
    .select('tx_id').eq('order_id', orderId).eq('tx_type', 'REFUND').limit(1);
  if (existing?.length) return sendJson(res, 200, { already: true });

  const { data: balance, error } = await supabase.rpc('change_wallet', { p_user: userId, p_delta: amount });
  if (error) return sendError(res, 500, 'DB_ERROR', 'Không hoàn được tiền');
  const { error: txError } = await supabase.from('wallet_transactions')
    .insert({ user_id: userId, amount, tx_type: 'REFUND', order_id: orderId });
  if (txError) return sendError(res, 500, 'DB_ERROR', 'Đã hoàn nhưng chưa ghi được lịch sử, báo quản trị');
  return sendJson(res, 200, { balance });
}
