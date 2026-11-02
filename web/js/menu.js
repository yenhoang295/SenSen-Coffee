import { getCategories, getProducts } from './api.js';
import { addItem, setQuantity, cartTotal, cartCount } from './cart-core.js';
import { loadCart, saveCart, captureTable } from './cart.js';

const $ = id => document.getElementById(id);
const money = n => new Intl.NumberFormat('vi-VN').format(n) + ' đ';

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

let cart = loadCart();
const filter = { category: null, q: '' };
let products = [];

function setCart(next) {
  cart = next;
  saveCart(cart);
  renderCart();
}

function renderCategories(categories) {
  const box = $('chips');
  box.replaceChildren();
  const make = (label, value) => {
    const b = el('button', 'chip' + (filter.category === value ? ' active' : ''), label);
    b.type = 'button';
    b.addEventListener('click', () => {
      filter.category = value;
      renderCategories(categories);
      loadProducts();
    });
    box.append(b);
  };
  make('Tất cả', null);
  categories.forEach(c => make(c.category_name, c.category_id));
}

function renderProducts() {
  const grid = $('grid');
  grid.replaceChildren();
  $('status').textContent = products.length ? '' : 'Không có món phù hợp.';
  for (const p of products) {
    const card = el('article', 'card');
    const img = el('img', 'thumb');
    img.alt = p.product_name;
    img.loading = 'lazy';
    img.src = p.image || '';
    img.addEventListener('error', () => { img.style.visibility = 'hidden'; });
    const info = el('div', 'info');
    info.append(el('h3', '', p.product_name));
    if (p.description) info.append(el('p', 'desc', p.description));
    const badges = el('div', 'badges');
    if (p.best_seller) badges.append(el('span', 'badge', 'Bán chạy'));
    if (p.new_product) badges.append(el('span', 'badge', 'Mới'));
    if (p.monthly_special) badges.append(el('span', 'badge', 'Món của tháng'));
    info.append(badges);
    const row = el('div', 'row');
    row.append(el('strong', '', money(p.price)));
    const out = p.quantity <= 0;
    const btn = el('button', 'add', out ? 'Hết hàng' : 'Thêm');
    btn.type = 'button';
    btn.disabled = out;
    btn.addEventListener('click', () => setCart(addItem(cart, p, 1)));
    row.append(btn);
    info.append(row);
    card.append(img, info);
    grid.append(card);
  }
}

function renderCart() {
  const list = $('cart-list');
  list.replaceChildren();
  for (const line of cart) {
    const li = el('li', 'line');
    li.append(el('span', 'name', line.name));
    const minus = el('button', 'qty', '−');
    minus.type = 'button';
    minus.addEventListener('click', () => setCart(setQuantity(cart, line.productId, line.quantity - 1)));
    const plus = el('button', 'qty', '+');
    plus.type = 'button';
    plus.addEventListener('click', () => setCart(setQuantity(cart, line.productId, line.quantity + 1)));
    li.append(minus, el('span', 'n', String(line.quantity)), plus, el('span', 'sum', money(line.price * line.quantity)));
    list.append(li);
  }
  $('cart-empty').hidden = cart.length > 0;
  $('cart-total').textContent = money(cartTotal(cart));
  $('cart-count').textContent = String(cartCount(cart));
}

async function loadProducts() {
  $('status').textContent = 'Đang tải menu...';
  try {
    products = await getProducts({ category: filter.category, q: filter.q });
    renderProducts();
  } catch {
    $('status').textContent = 'Không tải được menu. Thử lại sau.';
  }
}

async function init() {
  const table = captureTable();
  if (table) $('table-info').textContent = `Bàn số ${table}`;
  let timer;
  $('search').addEventListener('input', e => {
    clearTimeout(timer);
    timer = setTimeout(() => { filter.q = e.target.value.trim(); loadProducts(); }, 300);
  });
  renderCart();
  try {
    renderCategories(await getCategories());
  } catch {
    $('status').textContent = 'Không tải được danh mục.';
  }
  loadProducts();
}

init();
