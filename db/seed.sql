-- Dữ liệu MẪU. BA thay bằng 24 đến 36 món thật (tên tiếng Việt có dấu, giá, ảnh, nhãn).
insert into public.categories (category_name)
values ('Cà phê'), ('Trà'), ('Trà sữa'), ('Bánh');

insert into public.products
  (product_name, description, price, image, category_id, quantity,
   best_seller, new_product, monthly_special, temperature, sweetness, has_caffeine)
values
  ('Cà phê đen đá',        'Cà phê phin nguyên chất, không đường', 25000, 'images/ca-phe-den-da.jpg',   1, 60, false, false, false, 'cold', 1, true),
  ('Cà phê sữa đá',        'Cà phê phin đậm vị, sữa đặc',          29000, 'images/ca-phe-sua-da.jpg',   1, 60, true,  false, false, 'cold', 3, true),
  ('Bạc xỉu',              'Nhiều sữa, ít cà phê',                 32000, 'images/bac-xiu.jpg',         1, 50, true,  false, false, 'both', 3, true),
  ('Cappuccino nóng',      'Espresso, sữa nóng, bọt sữa',          45000, 'images/cappuccino.jpg',      1, 40, false, false, false, 'hot',  2, true),
  ('Trà đào cam sả',       'Trà đen, đào miếng, cam, sả',          45000, 'images/tra-dao-cam-sa.jpg',  2, 40, true,  false, false, 'cold', 2, true),
  ('Trà vải hoa hồng',     'Trà thơm vị vải và hoa hồng',          42000, 'images/tra-vai.jpg',         2, 40, false, true,  false, 'cold', 2, true),
  ('Trà gừng mật ong',     'Trà gừng ấm, ít ngọt',                 38000, 'images/tra-gung.jpg',        2, 30, false, false, false, 'hot',  2, false),
  ('Trà sữa trân châu',    'Trà sữa, trân châu đen',               42000, 'images/tra-sua-tran-chau.jpg',3, 40, true,  false, false, 'cold', 3, true),
  ('Trà sữa matcha',       'Matcha, sữa tươi',                     48000, 'images/tra-sua-matcha.jpg',  3, 30, false, true,  true,  'both', 2, true),
  ('Sữa tươi đường đen',   'Sữa tươi, trân châu đường đen',        44000, 'images/sua-tuoi-duong-den.jpg',3, 30, false, false, false, 'cold', 3, false),
  ('Bánh tiramisu',        'Một lát bánh tiramisu',                39000, 'images/banh-tiramisu.jpg',   4, 20, false, false, false, 'both', 3, true),
  ('Bánh croissant bơ',    'Croissant nướng bơ',                   32000, 'images/croissant.jpg',       4, 25, false, false, false, 'both', 2, false);

insert into public.dining_tables (table_no, seats)
values (1, 2), (2, 2), (3, 4), (4, 4), (5, 4), (6, 6), (7, 6), (8, 8);
