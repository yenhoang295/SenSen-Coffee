// Giỏ hàng là mảng { productId, name, price, quantity }. Mọi hàm trả mảng mới, không sửa mảng cũ.
export function addItem(cart, product, quantity = 1) {
  const found = cart.find(l => l.productId === product.product_id);
  if (found) {
    return cart.map(l => (l.productId === product.product_id ? { ...l, quantity: l.quantity + quantity } : l));
  }
  return [...cart, { productId: product.product_id, name: product.product_name, price: product.price, quantity }];
}

export function removeItem(cart, productId) {
  return cart.filter(l => l.productId !== productId);
}

export function setQuantity(cart, productId, quantity) {
  if (quantity <= 0) return removeItem(cart, productId);
  return cart.map(l => (l.productId === productId ? { ...l, quantity } : l));
}

export function cartTotal(cart) {
  return cart.reduce((sum, l) => sum + l.price * l.quantity, 0);
}

export function cartCount(cart) {
  return cart.reduce((sum, l) => sum + l.quantity, 0);
}
