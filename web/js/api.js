async function request(path) {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

export const getCategories = () => request('/api/catalog/categories');

export function getProducts({ category, q } = {}) {
  const p = new URLSearchParams();
  if (category) p.set('category', category);
  if (q) p.set('q', q);
  const s = p.toString();
  return request('/api/catalog/products' + (s ? `?${s}` : ''));
}
