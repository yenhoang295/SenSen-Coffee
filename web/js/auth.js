import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config.js';

const $ = id => document.getElementById(id);
const sb = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// Mỗi vai trò vào một trang riêng sau khi đăng nhập.
const ROLE_HOME = { customer: 'menu.html', staff: 'staff.html', admin: 'admin.html' };

async function goHome(userId) {
  const { data } = await sb.from('profiles').select('role').eq('user_id', userId).maybeSingle();
  location.href = ROLE_HOME[data?.role] ?? 'menu.html';
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
  if (user) $('who').textContent = user.email;
}

$('register').addEventListener('click', async () => {
  const email = $('email').value.trim();
  const password = $('password').value;
  const full_name = $('full-name').value.trim();
  if (!email || password.length < 6) return show('Nhập email và mật khẩu từ 6 ký tự.', true);
  const { error } = await sb.auth.signUp({ email, password, options: { data: { full_name } } });
  if (error) return show('Không đăng ký được: ' + error.message, true);
  show('Đăng ký thành công.');
  refresh();
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

refresh();