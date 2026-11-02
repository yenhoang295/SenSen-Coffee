import { supabase } from '../_lib/supabase.js';
import { sendJson, sendError } from '../_lib/http.js';
import { requireRole } from '../_lib/auth.js';
import { getUserFromRequest, getSession } from '../_lib/session.js';
import { getShopSettings } from '../_lib/shop.js';
import { validateOrderInput } from '../_lib/core.js';
import { placeOrder, OrderError } from '../_lib/place-order.js';
import { catalogClient } from '../_lib/catalog-client.js';
import { countActiveOrders, saveOrder, publicOrder } from '../_lib/orders.js';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const shop = await getShopSettings();
const session = await getSession(req);
const isStaff = Boolean(session) && ['staff', 'admin'].includes(session.role);

if (!shop.acceptingOrders && !isStaff) {
  return sendError(
    res,
    503,
    'SHOP_PAUSED',
    'Quán đang tạm ngưng nhận đơn online, vui lòng thử lại sau'
  );
}
    const errors = validateOrderInput(req.body);
    if (errors.length) return sendError(res, 400, 'BAD_REQUEST', `Dữ liệu sai: ${errors.join(', ')}`);

    const user = await getUserFromRequest(req);
    const { customerName, phone, note, pickupTime, tableNo, paymentMethod, items } = req.body;
    try {
      const result = await placeOrder(
        { customerName: customerName.trim(), phone, note, pickupTime, tableNo, paymentMethod, userId: user?.id, items },
        { ...catalogClient(req), saveOrder, countActive: countActiveOrders }
      );
      return sendJson(res, 201, result);
    } catch (e) {
      if (e instanceof OrderError) return sendError(res, e.status, e.code, e.message);
      return sendError(res, 500, 'SERVER_ERROR', 'Không tạo được đơn');
    }
  }

  if (req.method === 'GET') {
    const who = await requireRole(req, res, ['staff', 'admin']);
    if (!who) return;
    let query = supabase
      .from('orders').select('*, order_items(*)')
      .order('created_at', { ascending: false }).limit(100);
    if (req.query.status) query = query.eq('status', String(req.query.status));
    const { data, error } = await query;
    if (error) return sendError(res, 500, 'DB_ERROR', 'Không đọc được đơn');
    return sendJson(res, 200, data.map(o => publicOrder(o, true)));
  }

  return sendError(res, 405, 'METHOD_NOT_ALLOWED', 'Chỉ hỗ trợ GET và POST');
}
