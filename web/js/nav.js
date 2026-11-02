// Thanh điều hướng + chân trang dùng chung cho MỌI trang.
// optional: true = trang chưa chắc đã có trong repo. Trang chỉ hiện khi file thật sự tồn tại, nên không bao giờ bị 404.
const CUSTOMER = [
  { file: 'index.html', label: 'Trang chủ' },
  { file: 'menu.html', label: 'Menu' },
  { file: 'advisor.html', label: 'Tư vấn', optional: true },
  { file: 'reservation.html', label: 'Đặt bàn' },
  { file: 'group.html', label: 'Đơn nhóm', optional: true },
  { file: 'track.html', label: 'Theo dõi đơn', optional: true },
  { file: 'wallet.html', label: 'Ví & điểm' },
];
const ACCOUNT = { file: 'login.html', label: 'Tài khoản' };
const STAFF = [{ file: 'staff.html', label: 'Xử lý đơn' }, { file: 'pos.html', label: 'Quầy POS', optional: true }];
const ADMIN = [{ file: 'admin.html', label: 'Quản lý món', optional: true }, { file: 'dashboard.html', label: 'Thống kê', optional: true }];

const here = (location.pathname.split('/').pop() || 'index.html').replace(/\.html$/, '') || 'index';
const isHere = file => file.replace(/\.html$/, '') === here;

// Hỏi máy chủ xem trang có tồn tại không (mỗi trang chỉ hỏi một lần).
const exists = new Map();
function pageExists(file) {
  if (!exists.has(file)) {
    exists.set(file, fetch(file, { method: 'HEAD' }).then(r => r.ok).catch(() => false));
  }
  return exists.get(file);
}

function link(item, cls = '') {
  const a = document.createElement('a');
  a.href = item.file;
  a.textContent = item.label;
  if (cls) a.className = cls;
  if (isHere(item.file)) a.classList.add('active');
  if (item.optional) a.dataset.optional = '1';
  return a;
}

function buildHeader(header) {
  const tableInfo = header.querySelector('#table-info'); // menu.js và checkout.js ghi số bàn vào đây
  header.replaceChildren();
  header.classList.add('top');

  const logo = document.createElement('a');
  logo.className = 'logo';
  logo.href = 'index.html';
  logo.textContent = 'SENSEN COFFEE';
  header.append(logo);
  if (tableInfo) { tableInfo.classList.add('table-info'); header.append(tableInfo); }

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'menu-toggle';
  toggle.setAttribute('aria-label', 'Mở menu');
  toggle.textContent = '☰';
  toggle.addEventListener('click', () => header.classList.toggle('open'));

  const nav = document.createElement('nav');
  for (const item of CUSTOMER) nav.append(link(item));
  nav.append(link(ACCOUNT, 'pill'));
  header.append(toggle, nav);
}

function buildFooter() {
  if (document.querySelector('footer.site-foot')) return;
  const f = document.createElement('footer');
  f.className = 'site-foot';

  const brand = document.createElement('div');
  const b = document.createElement('strong');
  b.textContent = 'SENSEN COFFEE';
  const p = document.createElement('p');
  p.textContent = 'Đặt món trước, biết quán đông hay vắng.';
  brand.append(b, p);

  const col = (title, items) => {
    const d = document.createElement('div');
    const h = document.createElement('h4');
    h.textContent = title;
    d.append(h);
    for (const it of items) d.append(link(it));
    return d;
  };
  f.append(brand, col('Khách hàng', CUSTOMER.concat([ACCOUNT])), col('Nhân viên', STAFF), col('Quản trị', ADMIN));
  document.body.append(f);
}

// Ẩn mọi liên kết tới trang chưa có, hiện lại khi trang đó đã được merge.
async function settleOptionalLinks() {
  const links = [...document.querySelectorAll('a[data-optional]')];
  links.forEach(a => { a.hidden = true; });
  await Promise.all(links.map(async a => { a.hidden = !(await pageExists(a.getAttribute('href'))); }));
  // Cột chân trang nào không còn liên kết nào thì ẩn luôn cả cột.
  document.querySelectorAll('footer.site-foot > div').forEach(d => {
    if (d.querySelector('a') && ![...d.querySelectorAll('a')].some(a => !a.hidden)) d.hidden = true;
  });
}

let header = document.querySelector('header.top') || document.querySelector('body > header');
if (!header) { header = document.createElement('header'); document.body.prepend(header); }
buildHeader(header);
if (here === 'index') document.body.classList.add('home');
buildFooter();
settleOptionalLinks();

// Banner "quán đông hay vắng": chỉ nạp khi trang có banner.
if (document.getElementById('queue-banner')) import('./queue.js').catch(() => {});
