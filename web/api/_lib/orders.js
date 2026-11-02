import { supabase } from './supabase.js';

export { countActiveOrders } from './load.js';

export const ACTIVE_STATUSES = ['PENDING', 'CONFIRMED', 'PREPARING'];

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
      group_code: fields.groupCode ?? null,
      payment_method: fields.paymentMethod ?? 'CASH',
      total_amount: fields.totalAmount,
    })
    .select('order_id')
    .single();

  if (error) throw new Error('DB_ERROR');

  const rows = lines.map(item => ({
    order_id: order.order_id,
    product_id: item.productId,
    product_name: item.productName,
    unit_price: item.unitPrice,
    quantity: item.quantity,
  }));

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(rows);

  if (itemsError) {
    await supabase.from('orders').delete().eq('order_id', order.order_id);
    throw new Error('DB_ERROR');
  }

  return order.order_id;
}

export async function markPaid(orderId) {
  const { error } = await supabase
    .from('orders')
    .update({ payment_status: 'PAID' })
    .eq('order_id', orderId);

  if (error) throw new Error('DB_ERROR');
}

export async function deleteOrder(orderId) {
  const { error } = await supabase
    .from('orders')
    .delete()
    .eq('order_id', orderId);

  if (error) throw new Error('DB_ERROR');
}

export async function cancelOrder(orderId) {
  const { error } = await supabase
    .from('orders')
    .update({
      status: 'CANCELLED',
      payment_status: 'REFUNDED',
    })
    .eq('order_id', orderId);

  if (error) throw new Error('DB_ERROR');
}

export async function setPointsEarned(orderId, points) {
  const { error } = await supabase
    .from('orders')
    .update({ points_earned: points })
    .eq('order_id', orderId);

  if (error) throw new Error('DB_ERROR');
}

export async function getOrderWithItems(id) {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('order_id', id)
    .maybeSingle();

  if (error) throw new Error('DB_ERROR');
  return data;
}

// Đổi tên cột cơ sở dữ liệu thành dữ liệu JSON cho trang web.
// Chỉ nhân viên mới được nhận số điện thoại khách.
export function publicOrder(order, includePhone = false) {
  const output = {
    orderId: order.order_id,
    status: order.status,
    rejectReason: order.reject_reason,
    paymentMethod: order.payment_method,
    paymentStatus: order.payment_status,
    totalAmount: order.total_amount,
    pointsEarned: order.points_earned,
    pickupTime: order.pickup_time,
    tableNo: order.table_no,
    groupCode: order.group_code,
    customerName: order.customer_name,
    createdAt: order.created_at,
    items: (order.order_items ?? []).map(item => ({
      productId: item.product_id,
      productName: item.product_name,
      unitPrice: item.unit_price,
      quantity: item.quantity,
    })),
  };

  if (includePhone) {
    output.phone = order.phone;
  }

  return output;
}