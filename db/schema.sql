-- SENSEN-COFFEE schema v2 (chạy MỘT LẦN trong Supabase, SQL Editor)
-- Bao gồm mọi tính năng: menu, đơn, quán đông/vắng, đặt bàn, đơn nhóm, ví, tích điểm, tư vấn.

-- ========== BẢNG ==========
create table public.categories (
  category_id   serial primary key,
  category_name text not null unique
);

create table public.products (
  product_id      serial primary key,
  product_name    text not null,
  description     text,
  price           numeric(10,0) not null check (price >= 0),
  image           text,
  category_id     int not null references public.categories(category_id),
  quantity        int not null default 0 check (quantity >= 0),
  best_seller     boolean not null default false,
  new_product     boolean not null default false,
  monthly_special boolean not null default false,
  temperature     text not null default 'both' check (temperature in ('hot','cold','both')),
  sweetness       int  not null default 2 check (sweetness between 1 and 3),
  has_caffeine    boolean not null default true,
  status          text not null default 'active' check (status in ('active','hidden'))
);

create table public.profiles (
  user_id   uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone     text,
  role      text not null default 'customer' check (role in ('customer','staff','admin')),
  points    int  not null default 0 check (points >= 0)
);

create table public.wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance numeric(12,0) not null default 0 check (balance >= 0)
);

create table public.dining_tables (
  table_id serial primary key,
  table_no int not null unique,
  seats    int not null check (seats > 0)
);

create table public.orders (
  order_id       serial primary key,
  user_id        uuid references auth.users(id),
  customer_name  text not null,
  phone          text not null,
  note           text,
  pickup_time    timestamptz,
  table_no       int,
  group_code     text,
  status         text not null default 'PENDING'
                 check (status in ('PENDING','CONFIRMED','PREPARING','READY','COMPLETED','REJECTED','CANCELLED')),
  reject_reason  text,
  payment_method text not null default 'CASH' check (payment_method in ('CASH','TRANSFER','WALLET')),
  payment_status text not null default 'UNPAID' check (payment_status in ('UNPAID','PAID','REFUNDED')),
  total_amount   numeric(12,0) not null default 0,
  points_earned  int not null default 0,
  created_at     timestamptz not null default now()
);

create table public.order_items (
  item_id      serial primary key,
  order_id     int not null references public.orders(order_id) on delete cascade,
  product_id   int not null references public.products(product_id),
  product_name text not null,
  unit_price   numeric(10,0) not null,
  quantity     int not null check (quantity > 0)
);

create table public.wallet_transactions (
  tx_id      serial primary key,
  user_id    uuid not null references auth.users(id),
  amount     numeric(12,0) not null,
  tx_type    text not null check (tx_type in ('TOPUP','PAYMENT','REFUND')),
  order_id   int references public.orders(order_id),
  created_at timestamptz not null default now()
);

create table public.reservations (
  reservation_id serial primary key,
  user_id        uuid references auth.users(id),
  customer_name  text not null,
  phone          text not null,
  table_id       int not null references public.dining_tables(table_id),
  reserve_time   timestamptz not null,
  party_size     int not null check (party_size > 0),
  status         text not null default 'PENDING'
                 check (status in ('PENDING','CONFIRMED','CANCELLED','COMPLETED')),
  created_at     timestamptz not null default now()
);

create table public.group_orders (
  group_code text primary key,
  host_name  text not null,
  table_no   int,
  status     text not null default 'OPEN' check (status in ('OPEN','SUBMITTED')),
  order_id   int references public.orders(order_id),
  created_at timestamptz not null default now()
);

create table public.group_items (
  item_id     serial primary key,
  group_code  text not null references public.group_orders(group_code) on delete cascade,
  member_name text not null,
  product_id  int not null references public.products(product_id),
  quantity    int not null check (quantity > 0)
);

-- ========== HÀM NGUYÊN TỬ (chỉ dịch vụ dùng khóa secret mới gọi được) ==========
create or replace function public.change_stock(p_id int, p_delta int)
returns int language plpgsql as $$
declare new_qty int;
begin
  update public.products
     set quantity = quantity + p_delta
   where product_id = p_id and quantity + p_delta >= 0
   returning quantity into new_qty;
  if new_qty is null then
    raise exception 'INSUFFICIENT_STOCK';
  end if;
  return new_qty;
end $$;

create or replace function public.change_wallet(p_user uuid, p_delta numeric)
returns numeric language plpgsql as $$
declare new_bal numeric;
begin
  insert into public.wallets (user_id) values (p_user) on conflict (user_id) do nothing;
  update public.wallets
     set balance = balance + p_delta
   where user_id = p_user and balance + p_delta >= 0
   returning balance into new_bal;
  if new_bal is null then
    raise exception 'INSUFFICIENT_FUNDS';
  end if;
  return new_bal;
end $$;

create or replace function public.change_points(p_user uuid, p_delta int)
returns int language plpgsql as $$
declare new_pts int;
begin
  update public.profiles
     set points = points + p_delta
   where user_id = p_user and points + p_delta >= 0
   returning points into new_pts;
  if new_pts is null then
    raise exception 'INSUFFICIENT_POINTS';
  end if;
  return new_pts;
end $$;

revoke execute on function public.change_stock(int, int)       from public, anon, authenticated;
revoke execute on function public.change_wallet(uuid, numeric)  from public, anon, authenticated;
revoke execute on function public.change_points(uuid, int)      from public, anon, authenticated;
grant  execute on function public.change_stock(int, int)       to service_role;
grant  execute on function public.change_wallet(uuid, numeric)  to service_role;
grant  execute on function public.change_points(uuid, int)      to service_role;

-- ========== TỰ TẠO HỒ SƠ KHI CÓ NGƯỜI ĐĂNG KÝ ==========
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), 'customer');
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ========== BẬT RLS VÀ CẤP QUYỀN RÕ RÀNG ==========
alter table public.categories          enable row level security;
alter table public.products            enable row level security;
alter table public.profiles            enable row level security;
alter table public.wallets             enable row level security;
alter table public.dining_tables       enable row level security;
alter table public.orders              enable row level security;
alter table public.order_items         enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.reservations        enable row level security;
alter table public.group_orders        enable row level security;
alter table public.group_items         enable row level security;

revoke all on public.categories, public.products, public.profiles, public.wallets,
              public.dining_tables, public.orders, public.order_items,
              public.wallet_transactions, public.reservations,
              public.group_orders, public.group_items
  from anon, authenticated;

grant select on public.categories, public.products, public.dining_tables to anon, authenticated;
grant select on public.profiles, public.wallets to authenticated;

create policy categories_read on public.categories
  for select to anon, authenticated using (true);
create policy products_read on public.products
  for select to anon, authenticated using (status = 'active');
create policy tables_read on public.dining_tables
  for select to anon, authenticated using (true);
create policy profiles_read_own on public.profiles
  for select to authenticated using (user_id = auth.uid());
create policy wallets_read_own on public.wallets
  for select to authenticated using (user_id = auth.uid());
-- Các bảng còn lại không có chính sách: chỉ dịch vụ dùng khóa secret đọc/ghi được.
