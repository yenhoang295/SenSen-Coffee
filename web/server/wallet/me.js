import { supabase } from '../_lib/supabase.js';
import { sendJson, sendError } from '../_lib/http.js';
import { getSession } from '../_lib/session.js';

// Khách xem số dư, điểm và lịch sử giao dịch của chính mình.
export default async function handler(req, res) {
  if (req.method !== 'GET') return sendError(res, 405, 'METHOD_NOT_ALLOWED', 'Chỉ hỗ trợ GET');
  const session = await getSession(req);
  if (!session) return sendError(res, 401, 'UNAUTHORIZED', 'Chưa đăng nhập');
  const uid = session.user.id;

  const [wallet, profile, txs] = await Promise.all([
    supabase.from('wallets').select('balance').eq('user_id', uid).maybeSingle(),
    supabase.from('profiles').select('points, full_name').eq('user_id', uid).maybeSingle(),
    supabase.from('wallet_transactions').select('tx_id, amount, tx_type, order_id, created_at')
      .eq('user_id', uid).order('created_at', { ascending: false }).limit(20),
  ]);
  if (wallet.error || profile.error || txs.error) return sendError(res, 500, 'DB_ERROR', 'Không đọc được ví');

  return sendJson(res, 200, {
    email: session.user.email,
    fullName: profile.data?.full_name ?? '',
    balance: wallet.data?.balance ?? 0,
    points: profile.data?.points ?? 0,
    transactions: txs.data.map(t => ({
      txId: t.tx_id, amount: t.amount, type: t.tx_type, orderId: t.order_id, createdAt: t.created_at,
    })),
  });
}
