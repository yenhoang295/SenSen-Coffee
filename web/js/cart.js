// Lưu giỏ hàng và số bàn (từ mã QR) trong trình duyệt. Phần tính toán nằm ở cart-core.js.
const CART_KEY = 'sensen_cart';
const TABLE_KEY = 'sensen_table';

export function loadCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    const value = raw ? JSON.parse(raw) : [];
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function saveCart(cart) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  } catch {
    // Trình duyệt chặn lưu trữ: giỏ hàng chỉ sống trong phiên này.
  }
}

// Đọc ?table=N từ đường dẫn QR, ghi nhớ và trả về số bàn (hoặc null).
export function captureTable() {
  try {
    const t = new URLSearchParams(location.search).get('table');
    if (t && /^\d{1,2}$/.test(t)) localStorage.setItem(TABLE_KEY, t);
    return localStorage.getItem(TABLE_KEY);
  } catch {
    return null;
  }
}
