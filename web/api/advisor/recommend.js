import { sendJson, sendError } from '../_lib/http.js';
import { catalogClient } from '../_lib/catalog-client.js';
import { validateAdviceInput, calcAdvice } from '../_lib/advice.js';

// Advisor Service: lấy menu từ Catalog rồi chấm điểm theo khẩu vị.
export default async function handler(req, res) {
  if (req.method !== 'POST') return sendError(res, 405, 'METHOD_NOT_ALLOWED', 'Chỉ hỗ trợ POST');
  const { errors, prefs } = validateAdviceInput(req.body);
  if (errors.length) return sendError(res, 400, 'BAD_REQUEST', `Dữ liệu sai: ${errors.join(', ')}`);
  let products;
  try {
    products = await catalogClient(req).listProducts();
  } catch {
    return sendError(res, 503, 'CATALOG_DOWN', 'Chưa lấy được menu');
  }
  return sendJson(res, 200, { recommendations: calcAdvice(products, prefs, 3) });
}
