import { supabase } from './supabase.js';

// Đọc người dùng từ header Authorization nhưng KHÔNG gửi lỗi nếu thiếu (khác requireRole).
export async function getUserFromRequest(req) {
  const token = (req.headers.authorization ?? '').replace(/^Bearer /, '');
  if (!token) return null;
  const { data, error } = await supabase.auth.getUser(token);
  return error ? null : (data?.user ?? null);
}

export async function getSession(req) {
  const user = await getUserFromRequest(req);
  if (!user) return null;
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('user_id', user.id).maybeSingle();
  return { user, role: profile?.role ?? null };
}
