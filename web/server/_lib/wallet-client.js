import { baseUrl } from './http.js';

// Order gọi Wallet qua HTTP kèm khóa nội bộ. Mỗi hàm trả { status, data }.
export function walletClient(req) {
  const base = baseUrl(req);
  const call = async (path, payload) => {
    const r = await fetch(`${base}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-internal-key': process.env.INTERNAL_API_KEY ?? '' },
      body: JSON.stringify(payload),
    });
    const data = await r.json().catch(() => ({}));
    return { status: r.status, data };
  };
  return {
    charge: (userId, orderId, amount) => call('/api/wallet/charge', { userId, orderId, amount }),
    refund: (userId, orderId, amount) => call('/api/wallet/refund', { userId, orderId, amount }),
    addPoints: (userId, orderId, amount) => call('/api/wallet/points', { userId, orderId, amount }),
  };
}
