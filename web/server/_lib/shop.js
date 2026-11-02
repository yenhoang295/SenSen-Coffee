import { supabase } from './supabase.js';

// Cài đặt của quán: số người pha chế và quán có đang nhận đơn online không.
export async function getShopSettings() {
  const { data } = await supabase
    .from('shop_settings')
    .select('baristas, accepting_orders')
    .eq('id', 1)
    .maybeSingle();

  return {
    baristas: data?.baristas ?? 1,
    acceptingOrders: data?.accepting_orders ?? true,
  };
}