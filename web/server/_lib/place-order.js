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

  return [...map].map(([productId, quantity]) => ({
    productId,
    quantity,
  }));
}

// Tạo đơn, giữ tồn kho và trừ ví nếu khách chọn thanh toán bằng ví.
export async function placeOrder(input, deps) {
  const { getProduct, changeStock, saveOrder, countActive } = deps;
  const useWallet = input.paymentMethod === 'WALLET';

  if (useWallet && !input.userId) {
    throw new OrderError(
      401,
      'LOGIN_REQUIRED',
      'Cần đăng nhập để thanh toán bằng ví'
    );
  }

  const lines = [];

  for (const wanted of mergeItems(input.items)) {
    let product;

    try {
      product = await getProduct(wanted.productId);
    } catch {
      throw new OrderError(
        503,
        'CATALOG_DOWN',
        'Dịch vụ menu đang bận, thử lại sau'
      );
    }

    if (!product) {
      throw new OrderError(
        404,
        'PRODUCT_NOT_FOUND',
        `Không tìm thấy món số ${wanted.productId}`
      );
    }

    lines.push({
      productId: product.product_id,
      productName: product.product_name,
      unitPrice: product.price,
      quantity: wanted.quantity,
    });
  }

  const reserved = [];

  async function releaseStock() {
    for (const line of reserved) {
      try {
        await changeStock(line.productId, line.quantity);
      } catch {
        // Cố gắng trả lại tồn kho đã giữ.
      }
    }
  }

  for (const line of lines) {
    let status;

    try {
      status = await changeStock(line.productId, -line.quantity);
    } catch {
      await releaseStock();
      throw new OrderError(
        503,
        'CATALOG_DOWN',
        'Dịch vụ menu đang bận, thử lại sau'
      );
    }

    if (status === 409) {
      await releaseStock();
      throw new OrderError(
        409,
        'INSUFFICIENT_STOCK',
        `Không đủ hàng: ${line.productName}`
      );
    }

    if (status !== 200) {
      await releaseStock();
      throw new OrderError(
        503,
        'CATALOG_ERROR',
        'Không giữ được tồn kho, thử lại sau'
      );
    }

    reserved.push(line);
  }

  const totalAmount = calcOrderTotal(lines);
  let orderId;

  try {
    orderId = await saveOrder({ ...input, totalAmount }, lines);
  } catch {
    await releaseStock();
    throw new OrderError(500, 'DB_ERROR', 'Không lưu được đơn');
  }

  let paymentStatus = 'UNPAID';

  if (useWallet) {
    let chargeStatus = 0;

    try {
      chargeStatus = await deps.chargeWallet(
        input.userId,
        orderId,
        totalAmount
      );
    } catch {
      chargeStatus = 0;
    }

    if (chargeStatus !== 200) {
      try {
        await deps.deleteOrder(orderId);
      } catch {
        // Cố gắng xóa đơn nếu thanh toán ví thất bại.
      }

      await releaseStock();

      if (chargeStatus === 409) {
        throw new OrderError(
          409,
          'INSUFFICIENT_FUNDS',
          'Số dư ví không đủ'
        );
      }

      throw new OrderError(
        503,
        'WALLET_DOWN',
        'Không trừ được tiền trong ví, thử lại sau'
      );
    }

    let markedPaid = false;

    for (let attempt = 0; attempt < 2 && !markedPaid; attempt++) {
      try {
        await deps.markPaid(orderId);
        markedPaid = true;
      } catch {
        // Thử cập nhật trạng thái thanh toán thêm một lần.
      }
    }

    if (!markedPaid) {
      try {
        await deps.refundWallet(input.userId, orderId, totalAmount);
      } catch {
        // Cố gắng hoàn tiền nếu không ghi được trạng thái thanh toán.
      }

      try {
        await deps.cancelOrder(orderId);
      } catch {
        // Cố gắng hủy đơn nếu thanh toán không được ghi nhận.
      }

      await releaseStock();

      throw new OrderError(
        500,
        'DB_ERROR',
        'Không ghi được thanh toán, đã hoàn tiền vào ví'
      );
    }

    paymentStatus = 'PAID';
  }

  let etaMinutes = null;

  try {
    etaMinutes = calcQueueStatus(await countActive()).etaMinutes;
  } catch {
    // ETA chỉ là thông tin bổ sung, không làm hỏng việc đặt món.
  }

  return {
    orderId,
    status: 'PENDING',
    paymentStatus,
    totalAmount,
    etaMinutes,
    items: lines.map(line => ({
      productName: line.productName,
      unitPrice: line.unitPrice,
      quantity: line.quantity,
    })),
  };
}