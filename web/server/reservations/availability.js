import { supabase } from '../_lib/supabase.js';
import { sendJson, sendError } from '../_lib/http.js';
import {
  findFreeTables,
  RESERVATION_MS,
  ACTIVE_RESERVATION,
} from '../_lib/reservation.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return sendError(res, 405, 'METHOD_NOT_ALLOWED', 'Chỉ hỗ trợ GET');
  }

  const time = new Date(String(req.query.time ?? ''));
  const partySize = Number(req.query.size);

  if (
    Number.isNaN(time.getTime()) ||
    !Number.isInteger(partySize) ||
    partySize < 1 ||
    partySize > 12
  ) {
    return sendError(
      res,
      400,
      'BAD_REQUEST',
      'Cần time hợp lệ và size từ 1 đến 12'
    );
  }

  const { data: tables, error: tablesError } = await supabase
    .from('dining_tables')
    .select('*')
    .order('table_no');

  if (tablesError) {
    return sendError(res, 500, 'DB_ERROR', 'Không đọc được danh sách bàn');
  }

  const timeMs = time.getTime();

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
    return sendError(res, 500, 'DB_ERROR', 'Không đọc được lượt đặt bàn');
  }

  const freeTables = findFreeTables(
    tables ?? [],
    reservations ?? [],
    timeMs,
    partySize
  );

  return sendJson(res, 200, {
    time: time.toISOString(),
    partySize,
    tables: freeTables.map(table => ({
      tableId: table.table_id,
      tableNo: table.table_no,
      seats: table.seats,
    })),
  });
}