import { supabase } from '../_lib/supabase.js';
import { sendJson, sendError } from '../_lib/http.js';
import { requireRole } from '../_lib/auth.js';
import { validateTopup } from '../_lib/wallet.js';

// Nhân viên nạp tiền vào ví cho khách tại quầy.
export default async function handler(req, res) {
  if (req.method !== 'POST') return sendError(res, 405, 'METHOD_NOT_ALLOWED', 'Chỉ hỗ trợ POST');
  const who = await requireRole(req, res, ['staff', 'admin']);
  if (!who) return;
  const errors = validateTopup(req.body);
  if (errors.length) return sendError(res, 400, 'BAD_REQUEST', `Dữ liệu sai: ${errors.join(', ')}`);

  const email = req.body.email.trim().toLowerCase();
  const { data: list, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) return sendError(res, 500, 'DB_ERROR', 'Không tìm được tài khoản');
  const user = list.users.find(u => u.email?.toLowerCase() === email);
  if (!user) return sendError(res, 404, 'NOT_FOUND', 'Không có tài khoản với email này');

  const { data: balance, error } = await supabase.rpc('change_wallet', { p_user: user.id, p_delta: req.body.amount });
  if (error) return sendError(res, 500, 'DB_ERROR', 'Không nạp được tiền');
  const { error: txError } = await supabase.from('wallet_transactions')
    .insert({ user_id: user.id, amount: req.body.amount, tx_type: 'TOPUP' });
  if (txError) return sendError(res, 500, 'DB_ERROR', 'Đã nạp nhưng chưa ghi được lịch sử, báo quản trị');
  return sendJson(res, 200, { email, balance });
}
