import { supabase } from '../_lib/supabase.js';
import { sendJson, sendError } from '../_lib/http.js';
import { requireRole } from '../_lib/auth.js';
import { canReservationTransition } from '../_lib/reservation.js';

const VALID_STATUSES = ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'];

export default async function handler(req, res) {
  if (req.method !== 'PATCH') {
    return sendError(
      res,
      405,
      'METHOD_NOT_ALLOWED',
      'Chỉ hỗ trợ PATCH'
    );
  }

  const staff = await requireRole(req, res, ['staff', 'admin']);
  if (!staff) return;

  const reservationId = Number(req.query.id);
  const nextStatus = req.body?.status;

  if (!Number.isInteger(reservationId) || reservationId < 1) {
    return sendError(res, 400, 'BAD_REQUEST', 'Mã đặt bàn không hợp lệ');
  }

  if (!VALID_STATUSES.includes(nextStatus)) {
    return sendError(res, 400, 'BAD_REQUEST', 'Trạng thái đặt bàn không hợp lệ');
  }

  const { data: current, error: readError } = await supabase
    .from('reservations')
    .select('reservation_id, status')
    .eq('reservation_id', reservationId)
    .maybeSingle();

  if (readError) {
    return sendError(res, 500, 'DB_ERROR', 'Không đọc được yêu cầu đặt bàn');
  }

  if (!current) {
    return sendError(res, 404, 'NOT_FOUND', 'Không tìm thấy yêu cầu đặt bàn');
  }

  if (!canReservationTransition(current.status, nextStatus)) {
    return sendError(
      res,
      400,
      'INVALID_TRANSITION',
      `Không thể đổi từ ${current.status} sang ${nextStatus}`
    );
  }

  const { data: updated, error: updateError } = await supabase
    .from('reservations')
    .update({ status: nextStatus })
    .eq('reservation_id', reservationId)
    .select('reservation_id, status')
    .single();

  if (updateError) {
    return sendError(res, 500, 'DB_ERROR', 'Không cập nhật được trạng thái');
  }

  return sendJson(res, 200, {
    reservationId: updated.reservation_id,
    status: updated.status,
  });
}