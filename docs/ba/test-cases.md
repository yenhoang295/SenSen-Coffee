# Test case (BA điền cột Kết quả thực tế)

| Mã | Dịch vụ | Trường hợp | Kết quả mong đợi | Kết quả thực tế | Đạt |
| --- | --- | --- | --- | --- | --- |
| TC01 | Catalog | GET /api/catalog/products | Đủ số món trong seed, tiếng Việt đúng dấu | | |
| TC02 | Catalog | GET products?category=2 | Chỉ món thuộc danh mục 2 | | |
| TC03 | Catalog | GET products?q=trà | Chỉ món có tên chứa "trà" | | |
| TC04 | Catalog | GET products/9999 | 404, thân JSON có error và message | | |
| TC05 | Order | POST /api/orders hợp lệ | 201; tổng đúng; tồn kho giảm đúng | | |
| TC06 | Order | Body gửi kèm giá giả | Giá giả bị bỏ qua | | |
| TC07 | Order | Đặt vượt tồn kho | 409; tồn kho không đổi | | |
| TC08 | Order | Số lượng 0 hoặc âm, thiếu số điện thoại | 400 | | |
| TC09 | Catalog | POST /api/catalog/stock không có x-internal-key | 401 | | |
| TC10 | Order | Tra cứu đúng, rồi sai số điện thoại | Đúng xem được; sai thì 404 | | |
| TC11 | Order | GET /api/orders khi chưa đăng nhập | 401 | | |
| TC12 | Catalog | Tài khoản staff gọi POST /api/catalog/products | 403 | | |
| TC13 | Order | PATCH REJECTED thiếu reason, rồi có reason | 400; có reason thì được, tồn kho hoàn lại | | |
| TC14 | Order | PATCH nhảy từ PENDING sang READY | 409 | | |
| TC15 | Bảo mật | Tìm khóa secret, mật khẩu trong repo và file JS | Không có | | |
| TC16 | Queue | calcQueueStatus với 3, 8, 25 đơn | QUIET 5 phút, BUSY 10 phút, CROWDED 30 phút | | |
| TC17 | Queue | Đổi một đơn sang READY | activeOrders giảm 1 sau lần tải banner kế tiếp | | |
| TC18 | Queue | active-count không có x-internal-key; Order lỗi | 401; Queue trả 503, banner ẩn | | |
