import { getAccessToken, signOut, getRole } from './session.js';

const $ = id => document.getElementById(id);
const money = n => new Intl.NumberFormat('vi-VN').format(n) + ' đ';

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

async function api(path, options = {}) {
  const token = await getAccessToken();
  const headers = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;

  const response = await fetch(path, {
    ...options,
    headers: { ...headers, ...options.headers },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || `Lỗi ${response.status}`);
  return data;
}

// ---------- Thống kê ----------

function renderReport(report) {
  $('report-revenue').textContent = money(report.revenue);
  $('report-count').textContent = String(report.completedPaidOrders);

  const productBox = $('report-products');
  productBox.replaceChildren();
  if (!report.bestSellers.length) {
    productBox.append(el('p', '', 'Chưa có đơn hoàn tất trong khoảng ngày này.'));
  } else {
    const table = document.createElement('table');
    table.className = 'report-table';
    const head = document.createElement('tr');
    for (const title of ['Món', 'Số lượng', 'Doanh thu']) {
      const th = document.createElement('th');
      th.textContent = title;
      head.append(th);
    }
    const thead = document.createElement('thead');
    thead.append(head);
    table.append(thead);
    const tbody = document.createElement('tbody');
    for (const item of report.bestSellers) {
      const row = document.createElement('tr');
      for (const value of [item.productName, item.quantity, money(item.revenue)]) {
        const cell = document.createElement('td');
        cell.textContent = String(value);
        row.append(cell);
      }
      tbody.append(row);
    }
    table.append(tbody);
    productBox.append(table);
  }

  const hoursBox = $('report-hours');
  hoursBox.replaceChildren();
  const maxOrders = Math.max(1, ...report.peakHours.map(item => item.orders));
  for (const item of report.peakHours) {
    const hour = el('div', 'report-hour');
    hour.append(el('strong', '', `${String(item.hour).padStart(2, '0')}:00`));
    hour.append(el('div', '', `${item.orders} đơn`));
    const bar = el('div', 'report-hour-bar');
    bar.style.width = `${Math.max(4, item.orders / maxOrders * 100)}%`;
    hour.append(bar);
    hoursBox.append(hour);
  }
}

function setDefaultReportDates() {
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
  $('report-from').value = today;
  $('report-to').value = today;
}

async function loadReport() {
  const from = $('report-from').value;
  const to = $('report-to').value;
  const message = $('report-message');
  message.className = '';
  message.textContent = '';
  if (!from || !to || from > to) {
    message.className = 'bad';
    message.textContent = 'Chọn khoảng ngày hợp lệ trước khi xem.';
    return;
  }
  try {
    const query = new URLSearchParams({ from, to });
    const report = await api(`/api/reports?${query}`);
    renderReport(report);
    message.textContent = `Báo cáo từ ${from} đến ${to}.`;
  } catch (error) {
    message.className = 'bad';
    message.textContent = error.message;
  }
}

// ---------- Quản lý món ----------

let categories = [];

async function loadCategories() {
  if (categories.length) return;
  categories = await api('/api/catalog/categories');
  $('p-category').replaceChildren(
    ...categories.map(c => {
      const option = el('option', '', c.category_name);
      option.value = String(c.category_id);
      return option;
    })
  );
}

const categoryName = id => categories.find(c => c.category_id === id)?.category_name ?? '';

async function saveProduct(id, body, message) {
  try {
    await api(`/api/catalog/products/${id}`, { method: 'PUT', body: JSON.stringify(body) });
    $('panel-msg').textContent = '';
  } catch (error) {
    $('panel-msg').textContent = `${message}: ${error.message}`;
  }
  loadProducts();
}

function renderProduct(product) {
  const hidden = product.status === 'hidden';
  const card = el('article', 'order-card');
  const head = el('div', 'order-head');
  head.append(
    el('strong', '', `#${product.product_id} · ${product.product_name}`),
    el('span', 'tag', hidden ? 'Đang ẩn' : 'Đang bán'),
    el('span', '', categoryName(product.category_id))
  );
  card.append(head);

  const price = el('input');
  price.type = 'number';
  price.min = '0';
  price.step = '1000';
  price.value = String(product.price);

  const qty = el('input');
  qty.type = 'number';
  qty.min = '0';
  qty.step = '1';
  qty.value = String(product.quantity);

  const row = el('div', 'tools');
  row.append(el('span', '', 'Giá'), price, el('span', '', 'Tồn kho'), qty);
  card.append(row);

  const actions = el('div', 'actions');

  const save = el('button', '', 'Lưu giá và tồn kho');
  save.type = 'button';
  save.addEventListener('click', () => {
    saveProduct(
      product.product_id,
      { price: Number(price.value), quantity: Number(qty.value) },
      'Không lưu được'
    );
  });

  const toggle = el('button', hidden ? '' : 'danger', hidden ? 'Bán lại' : 'Ẩn món');
  toggle.type = 'button';
  toggle.addEventListener('click', () => {
    saveProduct(product.product_id, { status: hidden ? 'active' : 'hidden' }, 'Không đổi được trạng thái');
  });

  actions.append(save, toggle);
  card.append(actions);
  return card;
}

async function loadProducts() {
  try {
    await loadCategories();
    const products = await api('/api/catalog/products?all=1');
    $('products').replaceChildren(...products.map(renderProduct));
  } catch (error) {
    $('panel-msg').textContent = error.message;
  }
}

async function addProduct() {
  const message = $('p-msg');
  message.className = '';
  message.textContent = '';

  const body = {
    product_name: $('p-name').value.trim(),
    description: $('p-desc').value.trim(),
    category_id: Number($('p-category').value),
    price: Number($('p-price').value),
    quantity: Number($('p-qty').value || 0),
  };
  const image = $('p-image').value.trim();
  if (image) body.image = image;

  try {
    await api('/api/catalog/products', { method: 'POST', body: JSON.stringify(body) });
    message.className = 'ok';
    message.textContent = 'Đã thêm món.';
    for (const id of ['p-name', 'p-desc', 'p-price', 'p-qty', 'p-image']) $(id).value = '';
    loadProducts();
  } catch (error) {
    message.className = 'bad';
    message.textContent = error.message;
  }
}

// ---------- Chuyển tab và đăng nhập ----------

function showTab(name) {
  for (const button of document.querySelectorAll('.tab')) {
    button.classList.toggle('active', button.dataset.tab === name);
  }
  for (const tabName of ['reports', 'products']) {
    $(`tab-${tabName}`).hidden = tabName !== name;
  }
  $('panel-msg').textContent = '';

  if (name === 'reports') loadReport();
  if (name === 'products') loadProducts();
}

async function showPanel() {
  const role = await getRole();

  // Chỉ có một trang đăng nhập chung là login.html.
  if (!role) { location.href = 'login.html'; return; }
  if (role === 'staff') { location.href = 'staff.html'; return; }
  if (role !== 'admin') { location.href = 'menu.html'; return; }

  $('panel').hidden = false;
  showTab('reports');
}

$('logout').addEventListener('click', async () => {
  await signOut();
  location.href = 'login.html';
});

$('report-load').addEventListener('click', loadReport);
$('p-add').addEventListener('click', addProduct);
$('p-refresh').addEventListener('click', loadProducts);

for (const button of document.querySelectorAll('.tab')) {
  button.addEventListener('click', () => showTab(button.dataset.tab));
}

setDefaultReportDates();
showPanel();
