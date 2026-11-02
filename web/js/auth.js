import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config.js';

const $ = id => document.getElementById(id);
const sb = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// Mỗi vai trò vào một trang riêng sau khi đăng nhập.
const ROLE_HOME = { customer: 'menu.html', staff: 'staff.html', admin: 'admin.html' };
const ROLE_LABEL = {
  customer: 'Vào trang menu',
  staff: 'Vào trang nhân viên',
  admin: 'Vào trang quản lý',
};

async function getRoleOf(userId) {
  const { data } = await sb.from('profiles').select('role').eq('user_id', userId).maybeSingle();
  return data?.role ?? 'customer';
}

async function goHome(userId) {
  location.href = ROLE_HOME[await getRoleOf(userId)];
}

function show(message, isError = false) {
  const box = $('message');
  box.textContent = message;
  box.className = isError ? 'bad' : 'ok';
}

async function refresh() {
  const { data } = await sb.auth.getSession();
  const user = data.session?.user;
  $('signed-out').hidden = Boolean(user);
  $('signed-in').hidden = !user;
  if (!user) return;

  $('who').textContent = user.email;
  const role = await getRoleOf(user.id);

  // Nút đi tới đúng trang làm việc của vai trò đang đăng nhập.
  let link = $('go-home');
  if (!link) {
    link = document.createElement('a');
    link.id = 'go-home';
    link.style.display = 'block';
    link.style.margin = '12px 0';
    link.style.fontWeight = '700';
    $('who').closest('p').after(link);
  }
  link.href = ROLE_HOME[role];
  link.textContent = ROLE_LABEL[role];

  // Ví và điểm tích lũy chỉ dành cho khách.
  const wallet = $('signed-in').querySelector('a[href="wallet.html"]');
  if (wallet) wallet.hidden = role !== 'customer';
}

$('register').addEventListener('click', async () => {
  const email = $('email').value.trim();
  const password = $('password').value;
  const full_name = $('full-name').value.trim();
  if (!email || password.length < 6) return show('Nhập email và mật khẩu từ 6 ký tự.', true);
  const { data, error } = await sb.auth.signUp({ email, password, options: { data: { full_name } } });
  if (error) return show('Không đăng ký được: ' + error.message, true);
  show('Đăng ký thành công.');
  // Đăng ký xong đã có phiên đăng nhập thì vào luôn trang menu.
  if (data.session) goHome(data.user.id);
  else refresh();
});

$('login').addEventListener('click', async () => {
  const { data, error } = await sb.auth.signInWithPassword({
    email: $('email').value.trim(),
    password: $('password').value,
  });
  if (error) return show('Sai email hoặc mật khẩu.', true);
  show('Đăng nhập thành công.');
  goHome(data.user.id);
});

$('logout').addEventListener('click', async () => {
  await sb.auth.signOut();
  show('Đã đăng xuất.');
  refresh();
});

// Khung tài khoản demo, chỉ hiện khi mở login.html?demo=1
const DEMO_ACCOUNTS = [
  ['Khách hàng', 'khach@sensen.demo'],
  ['Nhân viên', 'nhanvien1@sensen.demo'],
  ['Quản lý', 'admin@sensen.demo'],
];
const DEMO_PASSWORD = 'Sensen@123';

if (new URLSearchParams(location.search).get('demo') === '1' && $('signed-out')) {
  const box = document.createElement('div');
  box.className = 'panel';
  const title = document.createElement('h3');
  title.textContent = 'Tài khoản demo (bấm để điền sẵn, rồi bấm Đăng nhập)';
  box.append(title);
  for (const [label, email] of DEMO_ACCOUNTS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = `${label}: ${email}`;
    button.addEventListener('click', () => {
      $('email').value = email;
      $('password').value = DEMO_PASSWORD;
    });
    box.append(button);
  }
  const note = document.createElement('p');
  note.textContent = `Mật khẩu chung: ${DEMO_PASSWORD}`;
  box.append(note);
  $('signed-out').after(box);
}

refresh();
