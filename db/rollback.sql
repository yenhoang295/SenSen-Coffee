-- Hoàn tác schema v2 (xóa sạch dữ liệu ứng dụng). Chỉ dùng khi làm lại từ đầu.
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
drop table if exists public.group_items, public.group_orders, public.reservations,
                     public.wallet_transactions, public.order_items, public.orders,
                     public.dining_tables, public.wallets, public.profiles,
                     public.products, public.categories cascade;
drop function if exists public.change_stock(int, int);
drop function if exists public.change_wallet(uuid, numeric);
drop function if exists public.change_points(uuid, int);
