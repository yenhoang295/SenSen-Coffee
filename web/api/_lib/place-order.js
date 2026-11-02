import { calcOrderTotal, calcQueueStatus } from './core.js';

export class OrderError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// Gộp các dòng trùng productId thành một dòng.
export function mergeItems(items) {
  const map = new Map();
  for (const { productId, quantity } of items) {
    map.set(productId, (map.get(productId) ?? 0) + quantity);
  }
  return [...map].map(([productId, quantity]) => ({ productId, quantity }));
}

// Điều phối đặt món. Các hàm phụ thuộc được truyền vào (deps) nên test được không cần mạng:
//   getProduct(id)         -> sản phẩm hoặc null; ném lỗi nếu Catalog hỏng
//   changeStock(id, delta) -> mã HTTP (200, 409, ...)
//   saveOrder(fields, lines) -> orderId; ném lỗi nếu không lưu được
//   countActive()          -> số đơn đang xử lý
// Giá luôn lấy từ Catalog, không bao giờ tin giá do trình duyệt gửi.
export async function placeOrder(input, deps) {
  const { getProduct, changeStock, saveOrder, countActive } = deps;

  const lines = [];
  for (const want of mergeItems(input.items)) {
    let product;
    try {
      product = await getProduct(want.productId);
    } catch {
      throw new OrderError(503, 'CATALOG_DOWN', 'Dịch vụ menu đang bận, thử lại sau');
    }
    if (!product) throw new OrderError(404, 'PRODUCT_NOT_FOUND', `Không tìm thấy món số ${want.productId}`);
    lines.push({
      productId: product.product_id,
      productName: product.product_name,
      unitPrice: product.price,
      quantity: want.quantity,
    });
  }

  const reserved = [];
  const release = async () => {
    for (const line of reserved) {
      try { await changeStock(line.productId, line.quantity); } catch { /* cố hết sức */ }
    }
  };

  for (const line of lines) {
    let status;
    try {
      status = await changeStock(line.productId, -line.quantity);
    } catch {
      await release();
      throw new OrderError(503, 'CATALOG_DOWN', 'Dịch vụ menu đang bận, thử lại sau');
    }
    if (status === 409) {
      await release();
      throw new OrderError(409, 'INSUFFICIENT_STOCK', `Không đủ hàng: ${line.productName}`);
    }
    if (status !== 200) {
      await release();
      throw new OrderError(503, 'CATALOG_ERROR', 'Không giữ được tồn kho, thử lại sau');
    }
    reserved.push(line);
  }

  const totalAmount = calcOrderTotal(lines);
  let orderId;
  try {
    orderId = await saveOrder({ ...input, totalAmount }, lines);
  } catch {
    await release();
    throw new OrderError(500, 'DB_ERROR', 'Không lưu được đơn');
  }

  let etaMinutes = null;
  try {
    etaMinutes = calcQueueStatus(await countActive()).etaMinutes;
  } catch { /* thời gian chờ chỉ là phần thêm */ }

  return {
    orderId,
    status: 'PENDING',
    totalAmount,
    etaMinutes,
    items: lines.map(l => ({ productName: l.productName, unitPrice: l.unitPrice, quantity: l.quantity })),
  };
}
