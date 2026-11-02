import { createClient } from '@supabase/supabase-js';

// Khóa secret chỉ đọc từ biến môi trường, tuyệt đối không ghi thẳng vào mã.
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false } }
);
