import { supabase } from './supabase.js';
import { sendError } from './http.js';

// Kiểm tra JWT trong header Authorization: Bearer <token> và vai trò trong bảng profiles.
// Trả về { user, role } nếu hợp lệ; ngược lại đã gửi lỗi 401 hoặc 403 và trả về null.
export async function requireRole(req, res, roles) {
  const token = (req.headers.authorization ?? '').replace(/^Bearer /, '');
  if (!token) {
    sendError(res, 401, 'UNAUTHORIZED', 'Chưa đăng nhập');
    return null;
  }
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    sendError(res, 401, 'UNAUTHORIZED', 'Phiên đăng nhập không hợp lệ');
    return null;
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', data.user.id)
    .maybeSingle();
  if (!profile || !roles.includes(profile.role)) {
    sendError(res, 403, 'FORBIDDEN', 'Không đủ quyền');
    return null;
  }
  return { user: data.user, role: profile.role };
}
