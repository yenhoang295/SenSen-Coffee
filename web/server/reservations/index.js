import { supabase } from '../_lib/supabase.js';
import { sendJson, sendError } from '../_lib/http.js';
import { requireRole } from '../_lib/auth.js';

const STATUSES = ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'];

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return sendError(res, 405, 'METHOD_NOT_ALLOWED', 'Chỉ hỗ trợ GET');
  }

  const who = await requireRole(req, res, ['staff', 'admin']);
  if (!who) return;

  const status = req.query.status ? String(req.query.status) : '';

  if (status && !STATUSES.includes(status)) {
    return sendError(res, 400, 'BAD_REQUEST', 'Trạng thái đặt bàn không hợp lệ');
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

  const tableIds = [...new Set((reservations ?? []).map(item => item.table_id))];
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

  const tableById = new Map(tables.map(table => [table.table_id, table]));

  const output = (reservations ?? []).map(item => {
    const table = tableById.get(item.table_id);

    return {
      reservationId: item.reservation_id,
      customerName: item.customer_name,
      phone: item.phone,
      tableId: item.table_id,
      tableNo: table?.table_no ?? null,
      seats: table?.seats ?? null,
      reserveTime: item.reserve_time,
      partySize: item.party_size,
      status: item.status,
      createdAt: item.created_at,
    };
  });

  return sendJson(res, 200, output);
}