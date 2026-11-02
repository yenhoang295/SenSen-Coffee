import { supabase } from '../_lib/supabase.js';
import { sendJson, sendError } from '../_lib/http.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return sendError(res, 405, 'METHOD_NOT_ALLOWED', 'Chỉ hỗ trợ GET');
  const { data, error } = await supabase.from('categories').select('*').order('category_id');
  if (error) return sendError(res, 500, 'DB_ERROR', 'Không đọc được danh mục');
  return sendJson(res, 200, data);
}
