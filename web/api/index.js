import health from '../server/health.js';
import shop from '../server/shop.js';
import advisor from '../server/advisor/recommend.js';
import categories from '../server/catalog/categories.js';
import products from '../server/catalog/products.js';
import stock from '../server/catalog/stock.js';
import productById from '../server/catalog/products/[id].js';
import activeCount from '../server/orders/active-count.js';
import orders from '../server/orders/index.js';
import orderById from '../server/orders/[id].js';
import queueStatus from '../server/queue/status.js';
import walletCharge from '../server/wallet/charge.js';
import walletMe from '../server/wallet/me.js';
import walletPoints from '../server/wallet/points.js';
import walletRefund from '../server/wallet/refund.js';
import walletTopup from '../server/wallet/topup.js';

// Đường dẫn tĩnh đặt trước đường dẫn có :id để khớp đúng.
const ROUTES = [
  ['health', health],
  ['shop', shop],
  ['advisor/recommend', advisor],
  ['catalog/categories', categories],
  ['catalog/products', products],
  ['catalog/stock', stock],
  ['catalog/products/:id', productById],
  ['orders/active-count', activeCount],
  ['orders', orders],
  ['orders/:id', orderById],
  ['queue/status', queueStatus],
  ['wallet/charge', walletCharge],
  ['wallet/me', walletMe],
  ['wallet/points', walletPoints],
  ['wallet/refund', walletRefund],
  ['wallet/topup', walletTopup],
];

function match(path) {
  const parts = path.split('/').filter(Boolean);
  for (const [pattern, handler] of ROUTES) {
    const segs = pattern.split('/');
    if (segs.length !== parts.length) continue;
    const params = {};
    let ok = true;
    segs.forEach((s, i) => {
      if (s.startsWith(':')) params[s.slice(1)] = decodeURIComponent(parts[i]);
      else if (s !== parts[i]) ok = false;
    });
    if (ok) return { handler, params };
  }
  return null;
}

export default async function dispatcher(req, res) {
  const route = Array.isArray(req.query?.route) ? req.query.route.join('/') : (req.query?.route ?? '');
  const found = match(route);
  if (!found) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Không có API này' } }));
  }
  const { route: _bo, ...query } = req.query;
  Object.defineProperty(req, 'query', {
    value: { ...query, ...found.params },
    writable: true,
    configurable: true,
  });
  try {
    return await found.handler(req, res);
  } catch (e) {
    console.error(e);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: { code: 'SERVER_ERROR', message: 'Lỗi máy chủ' } }));
    }
  }
}