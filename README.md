# Quản Lý Thông Tin Dòng Họ

Một nền tảng quản lý thông tin dòng họ hiện đại, được xây dựng để bảo tồn lịch sử gia đình, tôn vinh tổ tiên và kết nối các thế hệ con cháu ở mọi nơi.

## 🌟 Các tính năng nổi bật

- **Gia Phả Tương Tác**: Ứng dụng React Flow kết hợp thuật toán Dagre.js để hiển thị gia phả trực quan, hỗ trợ lên đến 9+ đời. Tính năng mở rộng/thu gọn thông minh giúp dễ dàng xem chi tiết vợ/chồng và con cái.
- **Hồ Sơ Chi Tiết**: Mỗi thành viên có hồ sơ riêng biệt với tiểu sử chi tiết (TipTap rich text), ảnh chân dung, album ảnh và "Bức tường Ký ức" (Memory Wall) để con cháu gửi lời tri ân.
- **Lịch Sự Kiện Song Song**: Xem lịch tháng hiển thị cả ngày Dương lịch và Âm lịch. Ngày có sự kiện phát sáng nổi bật. Hỗ trợ sự kiện giỗ, kỷ niệm, và sự kiện đặc biệt — diễn ra hàng năm hoặc chỉ 1 lần.
- **Bài Viết & Tin Tức**: Hệ thống bài viết với trình soạn thảo TipTap phong phú, hỗ trợ chèn ảnh, liên kết và định dạng văn bản.
- **Quỹ Dòng Họ**: Minh bạch hóa thu/chi quỹ họ, ghi chép và theo dõi công khai.
- **Bảo Mật & Phân Quyền**: Quy trình đăng ký cần xét duyệt (PENDING → ACTIVE).
- **Hồ Sơ Cá Nhân**: Người dùng đã liên kết hồ sơ có thể truy cập nhanh trang cá nhân từ dropdown tài khoản.
- **Điều Chỉnh Cỡ Chữ**: Tính năng tăng/giảm cỡ chữ trên thanh menu, thuận tiện cho người lớn tuổi.
- **Bảng Điều Khiển Admin**: Công cụ toàn diện để quản lý thành viên, hồ sơ, quan hệ gia phả, bài viết, quỹ họ, sự kiện và thông báo.

## 🎨 Thiết kế (Design)

Giao diện kết hợp giữa nét truyền thống và phong cách thiết kế hiện đại:
- Bảng màu chủ đạo: Nâu gỗ (`wood`), Vàng kim (`gold`), Đỏ thẫm (`crimson`), và nền màu giấy da cũ (`parchment`).
- Phông chữ: **Playfair Display** (Serif) cho tiêu đề trang trọng, **Inter** (Sans-serif) cho nội dung dễ đọc.
- Ảnh nền cố định (parallax) cho trang chủ và ảnh bìa hồ sơ — cấu hình tại `src/lib/background-images.ts`.
- Trải nghiệm mượt mà với Skeleton loading, hiệu ứng micro-interactions và Glassmorphism.

## 💻 Ngăn xếp công nghệ (Tech Stack)

- **Framework**: TanStack Start (React 19, SSR, File-based API routes)
- **CSS**: Tailwind CSS v4 với các token tùy chỉnh.
- **Cơ sở dữ liệu**: PostgreSQL chạy trên Docker với Drizzle ORM.
- **Xác thực**: JWT (thư viện `jose`) lưu trong HttpOnly cookies, mã hóa mật khẩu với `bcryptjs`.
- **Sơ đồ cây**: `@xyflow/react` (React Flow) + `@dagrejs/dagre`.
- **Soạn thảo**: TipTap editor (bài viết, tiểu sử chi tiết).

## 🚀 Hướng dẫn cài đặt và chạy bằng Docker

Cách đơn giản nhất để chạy ứng dụng là sử dụng Docker Compose. Nó sẽ tự động khởi tạo cơ sở dữ liệu PostgreSQL và máy chủ Web.

1. Đảm bảo đã cài đặt **Docker** và **Docker Compose** trên máy.
2. Thiết lập biến môi trường — tạo file `.env` tại thư mục gốc:
   ```env
   DATABASE_URL=postgres://postgres:postgrespassword@db:5432/familytree
   JWT_SECRET=<khóa-bảo-mật-của-bạn>
   ```
3. Khởi chạy toàn bộ hệ thống:
   ```bash
   docker compose up -d --build
   ```

Ứng dụng sẽ chạy tại `http://localhost:3005`. Cả Web và Database đều chạy trong Docker container.

## 👑 Khởi tạo và Reset Cơ sở dữ liệu (Database Seeding)

Để dọn dẹp dữ liệu cũ (reset) hoặc khởi tạo tài khoản Admin đầu tiên cho hệ thống, bạn có hai cách:

### Cách 1: Sử dụng Script tự động (Khuyên dùng)
Hệ thống cung cấp sẵn lệnh seed để xóa sạch cơ sở dữ liệu cũ, đặt lại các khóa tự tăng (ID) và tạo sẵn tài khoản `SUPER_ADMIN` đầu tiên.

1. **Chạy trực tiếp trên máy host** (nếu cài Node.js):
   ```bash
   npm run db:seed
   ```
2. **Hoặc chạy thông qua Docker Container** (khi ứng dụng đang chạy):
   ```bash
   docker compose exec web npm run db:seed
   ```
3. Sau khi chạy thành công, tài khoản Admin mặc định sẽ được tạo:
   - **Tên đăng nhập**: Mặc định là `admin` (hoặc tùy biến qua biến `ADMIN_ACC` trong `.env`).
   - **Mật khẩu mặc định**: Mặc định là `admin123` (hoặc tùy biến qua biến `ADMIN_PASS` trong `.env` trước khi chạy seed).

### Cách 2: Khởi tạo thủ công qua PostgreSQL
Nếu bạn đã đăng ký tài khoản qua giao diện web và muốn nâng cấp tài khoản đó thành Admin:
1. Kết nối vào database container:
   ```bash
   docker compose exec db psql -U postgres -d familytree
   ```
2. Chạy câu lệnh SQL sau để kích hoạt và cấp quyền:
   ```sql
   UPDATE users SET role = 'SUPER_ADMIN', status = 'ACTIVE' WHERE username = 'ten-dang-nhap-cua-ban';
   ```

## 📁 Cấu trúc dự án

Xem chi tiết tại [ARCHITECTURE.md](./ARCHITECTURE.md).

## 📝 Quản lý Migration

Sau khi thay đổi schema (`db/schema.ts`):
```bash
DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5432/familytree" npx drizzle-kit generate
```
Migrations sẽ được áp dụng tự động khi Docker container khởi động (`npm run migrate`).
