# Quy tắc làm việc nhóm

## Nhánh
`loai/so-issue-mo-ta`, chữ thường, không dấu. Ví dụ: `feature/5-api-san-pham`, `bugfix/12-loi-ton-kho`, `docs/openapi`, `test/8-core-order`.
Loại: feature, bugfix, hotfix, docs, test, refactor, chore.

## Commit
`type(scope): mô tả ngắn dạng mệnh lệnh`. Ví dụ: `feat(catalog): thêm API lọc theo danh mục`.
Type: feat, fix, docs, style, refactor, test, chore. Mỗi commit một việc.
Làm theo TDD: `test(...)` (đỏ), `feat(...)` hoặc `fix(...)` (xanh), `refactor(...)` (dọn gọn).

## Pull Request
- Mỗi việc là một Issue, mỗi Issue một nhánh, mỗi nhánh một PR; mô tả ghi `Closes #số`.
- PR nhỏ (dưới khoảng 400 dòng), một mục đích, CI xanh mới nhờ duyệt.
- Người còn lại review và Approve; tác giả bấm Squash and merge.
- Không push thẳng vào `main`.

## Bảo mật
Không commit mật khẩu, khóa secret, `.env`, `node_modules`. Lỡ commit thì đổi khóa ngay trong Supabase.

## Họp nhóm
10 phút đầu ngày và 10 phút cuối ngày; cập nhật nhật ký trong `docs/dev` và `docs/ba`.
