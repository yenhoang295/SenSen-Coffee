import { supabase } from '../_lib/supabase.js';
import { sendJson, sendError } from '../_lib/http.js';
import { isInternalRequest, validateMoneyMove } from '../_lib/wallet.js';

// Chỉ Order gọi: trừ tiền ví khi đặt món. Gọi lại cùng orderId không trừ thêm.
export default async function handler(req, res) {
  if (req.method !== 'POST') return sendError(res, 405, 'METHOD_NOT_ALLOWED', 'Chỉ hỗ trợ POST');
  if (!isInternalRequest(req)) return sendError(res, 401, 'UNAUTHORIZED', 'Thiếu khóa nội bộ');
  const errors = validateMoneyMove(req.body);
  if (errors.length) return sendError(res, 400, 'BAD_REQUEST', `Dữ liệu sai: ${errors.join(', ')}`);
  const { userId, orderId, amount } = req.body;

  const { data: existing } = await supabase.from('wallet_transactions')
    .select('tx_id').eq('order_id', orderId).eq('tx_type', 'PAYMENT').limit(1);
  if (existing?.length) return sendJson(res, 200, { already: true });

  const { data: balance, error } = await supabase.rpc('change_wallet', { p_user: userId, p_delta: -amount });
  if (error) {
    if (error.message.includes('INSUFFICIENT_FUNDS')) return sendError(res, 409, 'INSUFFICIENT_FUNDS', 'Số dư ví không đủ');
    return sendError(res, 500, 'DB_ERROR', 'Không trừ được tiền');
  }
  const { error: txError } = await supabase.from('wallet_transactions')
    .insert({ user_id: userId, amount: -amount, tx_type: 'PAYMENT', order_id: orderId });
  if (txError) {
    await supabase.rpc('change_wallet', { p_user: userId, p_delta: amount });
    return sendError(res, 500, 'DB_ERROR', 'Không ghi được giao dịch');
  }
  return sendJson(res, 200, { balance });
}
