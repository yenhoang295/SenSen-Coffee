import { catalogClient } from './catalog-client.js';
import { walletClient } from './wallet-client.js';
import {
  countActiveOrders,
  saveOrder,
  markPaid,
  deleteOrder,
  cancelOrder,
} from './orders.js';

// Gom các hàm mà quy trình đặt món cần gọi.
export function buildOrderDeps(req) {
  const wallet = walletClient(req);

  return {
    ...catalogClient(req),
    saveOrder,
    countActive: countActiveOrders,
    markPaid,
    deleteOrder,
    cancelOrder,
    chargeWallet: async (userId, orderId, amount) => {
      const result = await wallet.charge(userId, orderId, amount);
      return result.status;
    },
    refundWallet: async (userId, orderId, amount) => {
      const result = await wallet.refund(userId, orderId, amount);
      return result.status;
    },
  };
}