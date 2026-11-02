import { supabase } from '../../_lib/supabase.js';
import { sendJson, sendError } from '../../_lib/http.js';
import { requireRole } from '../../_lib/auth.js';
import { pickProductFields, validateProduct } from '../../_lib/product.js';

export default async function handler(req, res) {
  const id = Number(req.query.id);
  if (!Number.isInteger(id) || id < 1) return sendError(res, 404, 'NOT_FOUND', 'Không tìm thấy món');

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('products').select('*').eq('product_id', id).eq('status', 'active').maybeSingle();
    if (error) return sendError(res, 500, 'DB_ERROR', 'Không đọc được dữ liệu');
    if (!data) return sendError(res, 404, 'NOT_FOUND', 'Không tìm thấy món');
    return sendJson(res, 200, data);
  }

  if (req.method === 'PUT') {
    const who = await requireRole(req, res, ['admin']);
    if (!who) return;
    const errors = validateProduct(req.body, { partial: true });
    if (errors.length) return sendError(res, 400, 'BAD_REQUEST', `Dữ liệu sai: ${errors.join(', ')}`);
    const fields = pickProductFields(req.body);
    if (Object.keys(fields).length === 0) return sendError(res, 400, 'BAD_REQUEST', 'Không có trường nào để sửa');
    const { data, error } = await supabase
      .from('products').update(fields).eq('product_id', id).select().maybeSingle();
    if (error) return sendError(res, 500, 'DB_ERROR', 'Không sửa được món');
    if (!data) return sendError(res, 404, 'NOT_FOUND', 'Không tìm thấy món');
    return sendJson(res, 200, data);
  }

  if (req.method === 'DELETE') {
    // Không xóa thật để không làm hỏng đơn cũ; chỉ ẩn món.
    const who = await requireRole(req, res, ['admin']);
    if (!who) return;
    const { data, error } = await supabase
      .from('products').update({ status: 'hidden' }).eq('product_id', id).select().maybeSingle();
    if (error) return sendError(res, 500, 'DB_ERROR', 'Không ẩn được món');
    if (!data) return sendError(res, 404, 'NOT_FOUND', 'Không tìm thấy món');
    return sendJson(res, 200, { product_id: id, status: 'hidden' });
  }

  return sendError(res, 405, 'METHOD_NOT_ALLOWED', 'Chỉ hỗ trợ GET, PUT, DELETE');
}
