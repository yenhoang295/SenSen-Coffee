import { supabase } from '../_lib/supabase.js';
import { sendJson, sendError } from '../_lib/http.js';
import { requireRole } from '../_lib/auth.js';

// Cộng hoặc trừ tồn kho theo delta. Order Service gọi bằng x-internal-key; quản trị gọi bằng JWT.
export default async function handler(req, res) {
  if (req.method !== 'POST') return sendError(res, 405, 'METHOD_NOT_ALLOWED', 'Chỉ hỗ trợ POST');

  const key = req.headers['x-internal-key'];
  const internal = Boolean(key) && key === process.env.INTERNAL_API_KEY;
  if (!internal) {
    const who = await requireRole(req, res, ['admin']);
    if (!who) return;
  }

  const { productId, delta } = req.body ?? {};
  if (!Number.isInteger(productId) || !Number.isInteger(delta)) {
    return sendError(res, 400, 'BAD_REQUEST', 'productId và delta phải là số nguyên');
  }
  const { data, error } = await supabase.rpc('change_stock', { p_id: productId, p_delta: delta });
  if (error) {
    if (error.message.includes('INSUFFICIENT_STOCK')) {
      return sendError(res, 409, 'INSUFFICIENT_STOCK', 'Không đủ tồn kho hoặc món không tồn tại');
    }
    return sendError(res, 500, 'DB_ERROR', 'Không cập nhật được tồn kho');
  }
  return sendJson(res, 200, { productId, quantity: data });
}
