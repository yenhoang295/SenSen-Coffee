import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config.js';

// Dùng chung cho các trang cần đăng nhập (nhân viên, POS, quản trị).
let client;
export function getSb() {
  client ??= createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  return client;
}

export async function getSession() {
  const { data } = await getSb().auth.getSession();
  return data.session;
}

// Trả về access token hoặc null; không ném lỗi để trang khách vẫn dùng được khi chưa cấu hình.
export async function getAccessToken() {
  try {
    return (await getSession())?.access_token ?? null;
  } catch {
    return null;
  }
}

// Trả về null nếu thành công, ngược lại trả về đối tượng lỗi.
export async function signIn(email, password) {
  const { error } = await getSb().auth.signInWithPassword({ email, password });
  return error;
}

export async function signOut() {
  await getSb().auth.signOut();
}

// Đọc vai trò (customer, staff, admin) của người đang đăng nhập.
export async function getRole() {
  const session = await getSession();
  if (!session) return null;
  const { data } = await getSb().from('profiles').select('role').eq('user_id', session.user.id).maybeSingle();
  return data?.role ?? null;
}
