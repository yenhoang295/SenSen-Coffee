import { supabase } from '../_lib/supabase.js';
import { sendJson, sendError } from '../_lib/http.js';
import { requireRole } from '../_lib/auth.js';
import { getSession } from '../_lib/session.js';
import { STATUSES, canTransition, requiresReason, calcQueueStatus } from '../_lib/core.js';
import { catalogClient } from '../_lib/catalog-client.js';
import { ACTIVE_STATUSES, getOrderWithItems, publicOrder } from '../_lib/orders.js';

export default async function handler(req, res) {
  const id = Number(req.query.id);
  if (!Number.isInteger(id) || id < 1) return sendError(res, 404, 'NOT_FOUND', 'Không tìm thấy đơn');

  if (req.method === 'GET') {
    let order;
    try { order = await getOrderWithItems(id); } catch { return sendError(res, 500, 'DB_ERROR', 'Không đọc được đơn'); }

    const session = await getSession(req);
    const staff = Boolean(session) && ['staff', 'admin'].includes(session.role);
    // Khách phải khớp số điện thoại; sai thì trả 404 để không lộ đơn có tồn tại hay không.
    if (!order || (!staff && String(req.query.phone ?? '') !== order.phone)) {
      return sendError(res, 404, 'NOT_FOUND', 'Không tìm thấy đơn');
    }

    const out = publicOrder(order, staff);
    if (ACTIVE_STATUSES.includes(order.status)) {
      const { count } = await supabase
        .from('orders').select('order_id', { count: 'exact', head: true })
        .in('status', ACTIVE_STATUSES).lt('order_id', id);
      out.queueAhead = count ?? 0;
      out.etaMinutes = calcQueueStatus((count ?? 0) + 1).etaMinutes;
    }
    return sendJson(res, 200, out);
  }

  if (req.method === 'PATCH') {
    const who = await requireRole(req, res, ['staff', 'admin']);
    if (!who) return;

    const { status, reason, paymentStatus } = req.body ?? {};
    if (status === undefined && paymentStatus === undefined) {
      return sendError(res, 400, 'BAD_REQUEST', 'Cần status hoặc paymentStatus');
    }
    let order;
    try { order = await getOrderWithItems(id); } catch { return sendError(res, 500, 'DB_ERROR', 'Không đọc được đơn'); }
    if (!order) return sendError(res, 404, 'NOT_FOUND', 'Không tìm thấy đơn');

    const update = {};
    if (paymentStatus !== undefined) {
      if (paymentStatus !== 'PAID') return sendError(res, 400, 'BAD_REQUEST', 'Chỉ hỗ trợ đặt paymentStatus = PAID');
      if (order.payment_status !== 'UNPAID') return sendError(res, 409, 'CONFLICT', 'Đơn không ở trạng thái chưa thu tiền');
      update.payment_status = 'PAID';
    }

    let restock = false;
    if (status !== undefined) {
      if (!STATUSES.includes(status)) return sendError(res, 400, 'BAD_REQUEST', 'status không hợp lệ');
      if (!canTransition(order.status, status)) {
        return sendError(res, 409, 'CONFLICT', `Không thể chuyển từ ${order.status} sang ${status}`);
      }
      const cleanReason = typeof reason === 'string' ? reason.trim() : '';
      if (requiresReason(status) && !cleanReason) {
        return sendError(res, 400, 'BAD_REQUEST', 'Từ chối đơn phải có lý do');
      }
      if (status === 'COMPLETED' && order.payment_status !== 'PAID' && update.payment_status !== 'PAID') {
        return sendError(res, 409, 'UNPAID', 'Chưa thu tiền nên chưa thể hoàn tất đơn');
      }
      update.status = status;
      if (cleanReason) update.reject_reason = cleanReason;
      if (status === 'REJECTED' || status === 'CANCELLED') {
        restock = true;
        if (order.payment_status === 'PAID') update.payment_status = 'REFUNDED';
      }
    }

    // Chỉ cập nhật nếu trạng thái chưa bị ai đổi, tránh hoàn kho hai lần.
    const { data: updated, error } = await supabase
      .from('orders').update(update).eq('order_id', id).eq('status', order.status).select('order_id');
    if (error) return sendError(res, 500, 'DB_ERROR', 'Không cập nhật được đơn');
    if (!updated?.length) return sendError(res, 409, 'CONFLICT', 'Đơn vừa được người khác đổi, tải lại trang');

    if (restock) {
      const catalog = catalogClient(req);
      for (const item of order.order_items) {
        try { await catalog.changeStock(item.product_id, item.quantity); } catch { /* ghi log nếu cần */ }
      }
    }
    const fresh = await getOrderWithItems(id);
    return sendJson(res, 200, publicOrder(fresh, true));
  }

  return sendError(res, 405, 'METHOD_NOT_ALLOWED', 'Chỉ hỗ trợ GET và PATCH');
}
