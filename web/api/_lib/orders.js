import { supabase } from './supabase.js';

export const ACTIVE_STATUSES = ['PENDING', 'CONFIRMED', 'PREPARING'];

export async function countActiveOrders() {
  const { count, error } = await supabase
    .from('orders')
    .select('order_id', { count: 'exact', head: true })
    .in('status', ACTIVE_STATUSES);
  if (error) throw new Error('DB_ERROR');
  return count ?? 0;
}

// Lưu đơn và các dòng món; nếu lưu dòng món lỗi thì xóa đơn vừa tạo.
export async function saveOrder(fields, lines) {
  const { data: order, error } = await supabase
    .from('orders')
    .insert({
      user_id: fields.userId ?? null,
      customer_name: fields.customerName,
      phone: fields.phone,
      note: fields.note ?? null,
      pickup_time: fields.pickupTime ?? null,
      table_no: fields.tableNo ?? null,
      payment_method: fields.paymentMethod ?? 'CASH',
      total_amount: fields.totalAmount,
    })
    .select('order_id')
    .single();
  if (error) throw new Error('DB_ERROR');

  const rows = lines.map(l => ({
    order_id: order.order_id,
    product_id: l.productId,
    product_name: l.productName,
    unit_price: l.unitPrice,
    quantity: l.quantity,
  }));
  const { error: itemsError } = await supabase.from('order_items').insert(rows);
  if (itemsError) {
    await supabase.from('orders').delete().eq('order_id', order.order_id);
    throw new Error('DB_ERROR');
  }
  return order.order_id;
}

export async function getOrderWithItems(id) {
  const { data, error } = await supabase
    .from('orders').select('*, order_items(*)').eq('order_id', id).maybeSingle();
  if (error) throw new Error('DB_ERROR');
  return data;
}

// Đổi từ dạng cột cơ sở dữ liệu sang JSON trả cho web. Số điện thoại chỉ trả cho nhân viên.
export function publicOrder(o, includePhone = false) {
  const out = {
    orderId: o.order_id,
    status: o.status,
    rejectReason: o.reject_reason,
    paymentMethod: o.payment_method,
    paymentStatus: o.payment_status,
    totalAmount: o.total_amount,
    pickupTime: o.pickup_time,
    tableNo: o.table_no,
    customerName: o.customer_name,
    createdAt: o.created_at,
    items: (o.order_items ?? []).map(i => ({
      productId: i.product_id,
      productName: i.product_name,
      unitPrice: i.unit_price,
      quantity: i.quantity,
    })),
  };
  if (includePhone) out.phone = o.phone;
  return out;
}
