import { supabase } from '../_lib/supabase.js';
import { sendJson, sendError } from '../_lib/http.js';
import { requireRole } from '../_lib/auth.js';
import { getUserFromRequest } from '../_lib/session.js';
import {
  findFreeTables,
  validateReservationInput,
  publicReservation,
  RESERVATION_MS,
  ACTIVE_RESERVATION,
} from '../_lib/reservation.js';

export default async function handler(req, res) {
  // Khách gửi yêu cầu đặt bàn.
  if (req.method === 'POST') {
    const errors = validateReservationInput(req.body);

    if (errors.length) {
      return sendError(
        res,
        400,
        'BAD_REQUEST',
        `Dữ liệu sai: ${errors.join(', ')}`
      );
    }

    const { customerName, phone, partySize, tableId, reserveTime } = req.body;
    const timeMs = new Date(reserveTime).getTime();

    const { data: tables, error: tablesError } = await supabase
      .from('dining_tables')
      .select('*');

    if (tablesError) {
      return sendError(res, 500, 'DB_ERROR', 'Không đọc được danh sách bàn');
    }

    const { data: activeReservations, error: reservationsError } =
      await supabase
        .from('reservations')
        .select('table_id, reserve_time, status')
        .in('status', ACTIVE_RESERVATION)
        .gt(
          'reserve_time',
          new Date(timeMs - RESERVATION_MS).toISOString()
        )
        .lt(
          'reserve_time',
          new Date(timeMs + RESERVATION_MS).toISOString()
        );

    if (reservationsError) {
      return sendError(res, 500, 'DB_ERROR', 'Không đọc được lượt đặt bàn');
    }

    const freeTables = findFreeTables(
      tables ?? [],
      activeReservations ?? [],
      timeMs,
      partySize
    );

    if (!freeTables.some(table => table.table_id === tableId)) {
      return sendError(
        res,
        409,
        'TABLE_UNAVAILABLE',
        'Bàn đã có người đặt hoặc không đủ chỗ, hãy chọn bàn khác'
      );
    }

    const user = await getUserFromRequest(req);

    const { data: reservation, error: insertError } = await supabase
      .from('reservations')
      .insert({
        user_id: user?.id ?? null,
        customer_name: customerName.trim(),
        phone,
        table_id: tableId,
        reserve_time: new Date(timeMs).toISOString(),
        party_size: partySize,
      })
      .select('*, dining_tables(table_no, seats)')
      .single();

    if (insertError) {
      return sendError(res, 500, 'DB_ERROR', 'Không đặt được bàn');
    }

    return sendJson(res, 201, publicReservation(reservation));
  }

  // Chỉ nhân viên hoặc quản trị viên được xem danh sách đặt bàn.
  if (req.method === 'GET') {
    const who = await requireRole(req, res, ['staff', 'admin']);
    if (!who) return;

    let query = supabase
      .from('reservations')
      .select('*, dining_tables(table_no, seats)')
      .order('reserve_time', { ascending: true })
      .limit(100);

    if (req.query.status) {
      query = query.eq('status', String(req.query.status));
    }

    const { data, error } = await query;

    if (error) {
      return sendError(res, 500, 'DB_ERROR', 'Không đọc được lượt đặt bàn');
    }

    return sendJson(
      res,
      200,
      (data ?? []).map(publicReservation)
    );
  }

  return sendError(
    res,
    405,
    'METHOD_NOT_ALLOWED',
    'Chỉ hỗ trợ GET và POST'
  );
}