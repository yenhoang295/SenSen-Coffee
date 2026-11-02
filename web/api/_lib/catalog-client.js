import { baseUrl } from './http.js';

// Order và Advisor gọi Catalog qua HTTP (liên kết lỏng), không đọc bảng của Catalog.
export function catalogClient(req) {
  const base = baseUrl(req);
  return {
    async getProduct(id) {
      const r = await fetch(`${base}/api/catalog/products/${id}`);
      if (r.status === 404) return null;
      if (!r.ok) throw new Error('CATALOG_DOWN');
      return r.json();
    },
    async listProducts() {
      const r = await fetch(`${base}/api/catalog/products`);
      if (!r.ok) throw new Error('CATALOG_DOWN');
      return r.json();
    },
    // Trả về mã HTTP: 200 thành công, 409 không đủ tồn kho.
    async changeStock(productId, delta) {
      const r = await fetch(`${base}/api/catalog/stock`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-internal-key': process.env.INTERNAL_API_KEY ?? '' },
        body: JSON.stringify({ productId, delta }),
      });
      return r.status;
    },
  };
}
