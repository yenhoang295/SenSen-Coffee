import { supabase } from './_lib/supabase.js';
import { sendJson, sendError } from './_lib/http.js';
import { requireRole } from './_lib/auth.js';
import { getShopSettings } from './_lib/shop.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return sendJson(res, 200, await getShopSettings());
  }

  if (req.method === 'PATCH') {
    const who = await requireRole(req, res, ['staff', 'admin']);
    if (!who) return;

    const { baristas, acceptingOrders } = req.body ?? {};
    const update = {};

    if (baristas !== undefined) {
      if (!Number.isInteger(baristas) || baristas < 1 || baristas > 10) {
        return sendError(res, 400, 'BAD_REQUEST', 'Số người pha chế phải từ 1 đến 10');
      }
      update.baristas = baristas;
    }

    if (acceptingOrders !== undefined) {
      if (typeof acceptingOrders !== 'boolean') {
        return sendError(res, 400, 'BAD_REQUEST', 'acceptingOrders phải là true hoặc false');
      }
      update.accepting_orders = acceptingOrders;
    }

    if (Object.keys(update).length === 0) {
      return sendError(res, 400, 'BAD_REQUEST', 'Không có gì để cập nhật');
    }

    const { error } = await supabase
      .from('shop_settings')
      .update(update)
      .eq('id', 1);

    if (error) {
      return sendError(res, 500, 'DB_ERROR', 'Không lưu được cài đặt');
    }

    return sendJson(res, 200, await getShopSettings());
  }

  return sendError(res, 405, 'METHOD_NOT_ALLOWED', 'Chỉ hỗ trợ GET và PATCH');
}