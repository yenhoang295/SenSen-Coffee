const FIELDS = [
  'product_name', 'description', 'price', 'image', 'category_id', 'quantity',
  'best_seller', 'new_product', 'monthly_special', 'temperature', 'sweetness',
  'has_caffeine', 'status',
];

// Chỉ giữ các trường được phép ghi.
export function pickProductFields(body) {
  return Object.fromEntries(FIELDS.filter(k => body?.[k] !== undefined).map(k => [k, body[k]]));
}

// Trả về danh sách tên trường sai; rỗng nghĩa là hợp lệ.
export function validateProduct(body, { partial = false } = {}) {
  const errors = [];
  const has = k => body?.[k] !== undefined;
  if (!partial || has('product_name')) {
    if (typeof body?.product_name !== 'string' || !body.product_name.trim()) errors.push('product_name');
  }
  if (!partial || has('price')) {
    if (!Number.isInteger(body?.price) || body.price < 0) errors.push('price');
  }
  if (!partial || has('category_id')) {
    if (!Number.isInteger(body?.category_id)) errors.push('category_id');
  }
  if (has('quantity') && (!Number.isInteger(body.quantity) || body.quantity < 0)) errors.push('quantity');
  if (has('temperature') && !['hot', 'cold', 'both'].includes(body.temperature)) errors.push('temperature');
  if (has('sweetness') && ![1, 2, 3].includes(body.sweetness)) errors.push('sweetness');
  if (has('status') && !['active', 'hidden'].includes(body.status)) errors.push('status');
  return errors;
}
