import { supabase } from '../_lib/supabase.js';
import { sendJson, sendError } from '../_lib/http.js';
import { requireRole } from '../_lib/auth.js';
import { parseProductQuery } from '../_lib/core.js';
import { pickProductFields, validateProduct } from '../_lib/product.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { categoryId, q, flag } = parseProductQuery(req.query);
    let query = supabase.from('products').select('*').order('product_id');

    if (req.query.all === '1') {
      // Nhân viên và quản trị xem cả món đã ẩn
      const who = await requireRole(req, res, ['staff', 'admin']);
      if (!who) return;
    } else {
      query = query.eq('status', 'active');
    }
    if (categoryId) query = query.eq('category_id', categoryId);
    if (q) query = query.ilike('product_name', `%${q}%`);
    if (flag) query = query.eq(flag, true);

    const { data, error } = await query;
    if (error) return sendError(res, 500, 'DB_ERROR', 'Không đọc được dữ liệu');
    return sendJson(res, 200, data);
  }

  if (req.method === 'POST') {
    const who = await requireRole(req, res, ['admin']);
    if (!who) return;
    const errors = validateProduct(req.body);
    if (errors.length) return sendError(res, 400, 'BAD_REQUEST', `Dữ liệu sai: ${errors.join(', ')}`);
    const { data, error } = await supabase
      .from('products')
      .insert(pickProductFields(req.body))
      .select()
      .single();
    if (error) return sendError(res, 500, 'DB_ERROR', 'Không thêm được món');
    return sendJson(res, 201, data);
  }

  return sendError(res, 405, 'METHOD_NOT_ALLOWED', 'Chỉ hỗ trợ GET và POST');
}
