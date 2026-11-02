# SENSEN COFFEE

Hệ thống dịch vụ quán cà phê trực tuyến theo kiến trúc hướng dịch vụ (môn Phát triển phần mềm hướng dịch vụ).

- Link web (Vercel): _điền sau khi deploy_
- Nhóm: yenhoang295 (Dev), lethihuechi16-sen (BA)

## Tính năng
Menu, giỏ hàng, đặt món, đặt giờ nhận, QR tại bàn, đơn nhóm, thanh toán (tiền mặt, chuyển khoản, ví), ví điện tử, tích điểm, quán đang vắng hay đông kèm thời gian chờ, POS cho nhân viên, thống kê, tư vấn đồ uống, đặt bàn.

## Công nghệ
VS Code, JavaScript (Node.js 22), hàm serverless trên Vercel (thư mục `web/api`), Supabase (PostgreSQL, Auth, RLS), GitHub (GitHub Flow, Ruleset, CI).

## Dịch vụ
| Dịch vụ | Thư mục | Việc chính |
| --- | --- | --- |
| Catalog | web/api/catalog | Menu, danh mục, tồn kho |
| Order | web/api/orders | Đơn, đơn nhóm, thanh toán |
| Queue | web/api/queue | Quán đông hay vắng, thời gian chờ |
| Reservation | web/api/reservations | Đặt bàn |
| Wallet | web/api/wallet | Ví, tích điểm |
| Advisor | web/api/advisor | Tư vấn đồ uống |
| Report | web/api/reports | Thống kê |

## Chạy trên máy
```
cd web
npm install
npm test
npm install -g vercel
vercel login
vercel link
vercel env pull .env.local
vercel dev
```

## Cấu trúc
- `web/`: giao diện và API (Root Directory của Vercel)
- `db/`: schema.sql, seed.sql, rollback.sql
- `docs/`: tài liệu BA, nhật ký, openapi.yaml

## Bảo mật
Không commit mật khẩu, khóa secret hay file .env. Web chỉ chứa khóa publishable.
