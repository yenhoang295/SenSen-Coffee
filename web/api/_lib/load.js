import { supabase } from './supabase.js';
import { getShopSettings } from './shop.js';

const ACTIVE = ['PENDING', 'CONFIRMED', 'PREPARING'];
const FAR_PICKUP_MS = 30 * 60 * 1000;
const STALE_PENDING_MS = 45 * 60 * 1000;

// Bỏ khỏi hàng chờ các đơn hẹn nhận xa hoặc PENDING quá lâu.
export function pickCountableOrders(rows, nowMs = Date.now()) {
  return rows.filter(o => {
    if (o.pickup_time && new Date(o.pickup_time).getTime() > nowMs + FAR_PICKUP_MS) return false;
    if (o.status === 'PENDING' && nowMs - new Date(o.created_at).getTime() > STALE_PENDING_MS) return false;
    return true;
  });
}

// Tải quầy = số ly đang làm chia số người pha chế, làm tròn lên.
export async function getLoad() {
  const [{ data, error }, shop] = await Promise.all([
    supabase
      .from('orders')
      .select('order_id, status, created_at, pickup_time, order_items(quantity)')
      .in('status', ACTIVE)
      .limit(500),
    getShopSettings(),
  ]);

  if (error) throw new Error('DB_ERROR');

  const counted = pickCountableOrders(data ?? []);
  const cups = counted.reduce(
    (sum, order) => sum + (order.order_items ?? []).reduce((n, item) => n + item.quantity, 0),
    0
  );

  return {
    orders: counted.length,
    cups,
    baristas: shop.baristas,
    acceptingOrders: shop.acceptingOrders,
    load: Math.ceil(cups / shop.baristas),
  };
}

// Giữ tên cũ để các file khác vẫn có thể import hàm này.
export async function countActiveOrders() {
  return (await getLoad()).load;
}