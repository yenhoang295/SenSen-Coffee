import { supabase } from '../_lib/supabase.js';
import { sendJson, sendError } from '../_lib/http.js';
import { requireRole } from '../_lib/auth.js';
import { getUserFromRequest } from '../_lib/session.js';
import {
  ACTIVE_RESERVATION,
  RESERVATION_MS,
  findFreeTables,
  publicReservation,
  validateReservationInput,
} from '../_lib/reservation.js';

const STATUSES = ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'];

export default async function handler(req, res) {
  // Khách gửi yêu cầu đặt bàn.
  if (req.method === 'POST') {
    const errors = validateReservationInput(req.body);

    if (errors.length > 0) {
      return sendError(
        res,
        400,
        'BAD_REQUEST',
        `Dữ liệu không hợp lệ: ${errors.join(', ')}`
      );
    }

    const {
      customerName,
      phone,
      partySize,
      tableId,
      reserveTime,
    } = req.body;

    const timeMs = new Date(reserveTime).getTime();

    // Kiểm tra bàn có tồn tại và đủ chỗ không.
    const { data: table, error: tableError } = await supabase
      .from('dining_tables')
      .select('table_id, table_no, seats')
      .eq('table_id', tableId)
      .maybeSingle();

    if (tableError) {
      return sendError(res, 500, 'DB_ERROR', 'Không kiểm tra được bàn');
    }

    if (!table || table.seats < partySize) {
      return sendError(
        res,
        400,
        'TABLE_NOT_SUITABLE',
        'Bàn không tồn tại hoặc không đủ chỗ'
      );
    }

    // Lấy những lượt đặt có thể trùng trong khoảng hai giờ.
    const { data: reservations, error: reservationsError } = await supabase
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
      return sendError(
        res,
        500,
        'DB_ERROR',
        'Không kiểm tra được lịch đặt bàn'
      );
    }

    const freeTables = findFreeTables(
      [table],
      reservations ?? [],
      timeMs,
      partySize
    );

    if (freeTables.length === 0) {
      return sendError(
        res,
        409,
        'TABLE_UNAVAILABLE',
        'Bàn vừa được người khác đặt hoặc không còn trống vào giờ này'
      );
    }

    const user = await getUserFromRequest(req);

    const { data: created, error: insertError } = await supabase
      .from('reservations')
      .insert({
        user_id: user?.id ?? null,
        customer_name: customerName.trim(),
        phone: phone.trim(),
        table_id: tableId,
        reserve_time: new Date(timeMs).toISOString(),
        party_size: partySize,
        status: 'PENDING',
      })
      .select(
        'reservation_id, customer_name, phone, table_id, reserve_time, party_size, status, created_at'
      )
      .single();

    if (insertError) {
      return sendError(res, 500, 'DB_ERROR', 'Không tạo được yêu cầu đặt bàn');
    }

    return sendJson(res, 201, {
      reservationId: created.reservation_id,
      customerName: created.customer_name,
      phone: created.phone,
      tableId: created.table_id,
      tableNo: table.table_no,
      seats: table.seats,
      reserveTime: created.reserve_time,
      partySize: created.party_size,
      status: created.status,
    });
  }

  // Nhân viên xem danh sách lượt đặt bàn.
  if (req.method === 'GET') {
    const who = await requireRole(req, res, ['staff', 'admin']);
    if (!who) return;

    const status = req.query.status ? String(req.query.status) : '';

    if (status && !STATUSES.includes(status)) {
      return sendError(
        res,
        400,
        'BAD_REQUEST',
        'Trạng thái đặt bàn không hợp lệ'
      );
    }

    let query = supabase
      .from('reservations')
      .select(
        'reservation_id, customer_name, phone, table_id, reserve_time, party_size, status, created_at'
      )
      .order('reserve_time', { ascending: true })
      .limit(100);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: reservations, error } = await query;

    if (error) {
      return sendError(res, 500, 'DB_ERROR', 'Không đọc được lượt đặt bàn');
    }

    const tableIds = [
      ...new Set((reservations ?? []).map(item => item.table_id)),
    ];

    let tables = [];

    if (tableIds.length > 0) {
      const result = await supabase
        .from('dining_tables')
        .select('table_id, table_no, seats')
        .in('table_id', tableIds);

      if (result.error) {
        return sendError(res, 500, 'DB_ERROR', 'Không đọc được thông tin bàn');
      }

      tables = result.data ?? [];
    }

    const tableById = new Map(
      tables.map(table => [table.table_id, table])
    );

    const output = (reservations ?? []).map(item => {
      const table = tableById.get(item.table_id);

      return publicReservation({
        ...item,
        dining_tables: table,
      });
    });

    return sendJson(res, 200, output);
  }

  return sendError(
    res,
    405,
    'METHOD_NOT_ALLOWED',
    'Chỉ hỗ trợ GET và POST'
  );
}