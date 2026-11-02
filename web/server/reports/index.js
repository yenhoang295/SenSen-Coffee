import { supabase } from '../_lib/supabase.js';
import { sendJson, sendError } from '../_lib/http.js';
import { requireRole } from '../_lib/auth.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const REPORT_TIME_ZONE = 'Asia/Ho_Chi_Minh';

function validDay(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function localMidnightUTC(day, addDays = 0) {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, date + addDays) - 7 * 60 * 60 * 1000);
}

function hourInCafe(isoTime) {
  return Number(new Intl.DateTimeFormat('en-GB', {
    timeZone: REPORT_TIME_ZONE,
    hour: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(isoTime)));
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return sendError(res, 405, 'METHOD_NOT_ALLOWED', 'Chỉ hỗ trợ GET');
  }

  const who = await requireRole(req, res, ['staff', 'admin']);
  if (!who) return;

  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: REPORT_TIME_ZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
  const from = req.query.from ?? today;
  const to = req.query.to ?? today;

  if (!validDay(from) || !validDay(to) || from > to) {
    return sendError(res, 400, 'BAD_REQUEST', 'Ngày bắt đầu/kết thúc không hợp lệ');
  }

  const start = localMidnightUTC(from);
  const end = localMidnightUTC(to, 1);
  if ((end - start) / DAY_MS > 31) {
    return sendError(res, 400, 'DATE_RANGE_TOO_LARGE', 'Chỉ xem được tối đa 31 ngày mỗi lần');
  }

  const rows = [];
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase
      .from('orders')
      .select('order_id, total_amount, created_at, order_items(product_name, unit_price, quantity)')
      .eq('status', 'COMPLETED')
      .eq('payment_status', 'PAID')
      .gte('created_at', start.toISOString())
      .lt('created_at', end.toISOString())
      .order('order_id', { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) return sendError(res, 500, 'DB_ERROR', 'Không tải được báo cáo');
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
    if (rows.length >= 10000) {
      return sendError(res, 413, 'REPORT_TOO_LARGE', 'Khoảng ngày có quá nhiều đơn; hãy chọn khoảng ngắn hơn');
    }
  }

  const products = new Map();
  const hours = Array.from({ length: 24 }, (_, hour) => ({ hour, orders: 0 }));
  let revenue = 0;

  for (const order of rows) {
    revenue += Number(order.total_amount) || 0;
    hours[hourInCafe(order.created_at)].orders += 1;
    for (const item of order.order_items ?? []) {
      const name = item.product_name;
      const current = products.get(name) ?? { productName: name, quantity: 0, revenue: 0 };
      current.quantity += Number(item.quantity) || 0;
      current.revenue += (Number(item.unit_price) || 0) * (Number(item.quantity) || 0);
      products.set(name, current);
    }
  }

  return sendJson(res, 200, {
    from,
    to,
    timezone: REPORT_TIME_ZONE,
    completedPaidOrders: rows.length,
    revenue,
    bestSellers: [...products.values()]
      .sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue)
      .slice(0, 10),
    peakHours: hours.sort((a, b) => b.orders - a.orders || a.hour - b.hour).slice(0, 5),
  });
}
