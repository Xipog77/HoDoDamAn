# Kiến trúc Hệ thống Tộc Phả Platform

Tài liệu này mô tả chi tiết về cấu trúc, ngăn xếp công nghệ, luồng xác thực và mô hình dữ liệu của nền tảng Tộc Phả.

## 1. Ngăn xếp công nghệ (Tech Stack)

- **TanStack Start**: Framework cốt lõi (sử dụng React 19, Server-Side Rendering, File-based routing tại `src/routes/`).
- **Tailwind CSS v4**: Thư viện styling, được cấu hình với các biến màu tùy chỉnh `@theme` (wood, gold, crimson, parchment) để tạo phong cách truyền thống.
- **Cơ sở dữ liệu**: PostgreSQL chạy trên Docker quản lý thông qua **Drizzle ORM**.
- **Xác thực**: JWT tùy chỉnh sử dụng `jose` và `bcryptjs`. Token được lưu trữ an toàn trong HttpOnly cookies để chống tấn công XSS.
- **Giao diện & Tiện ích**:
  - Sơ đồ cây: **React Flow** (`@xyflow/react`) kết hợp thuật toán tính toán layout **Dagre** (`@dagrejs/dagre`).
  - Soạn thảo: **TipTap** cho nội dung phong phú (Rich text) — bài viết, tiểu sử chi tiết.
  - Danh sách chọn có tìm kiếm: **SearchableSelect** — component tái sử dụng cho toàn hệ thống.

## 2. Cấu trúc thư mục (Key Directories)

```text
db/                             # Lược đồ database + Khởi tạo client (Drizzle ORM)
  schema.ts                     # Tất cả bảng: users, persons, marriages, posts, anniversaries...
  client.ts                     # Drizzle client kết nối với Postgres
  migrate.ts                    # Script migration tùy chỉnh (chạy tự động khi Docker start)
  seed.ts                       # Script reset cơ sở dữ liệu và khởi tạo admin mặc định
  migrations/                   # Tệp SQL tự động sinh ra bởi Drizzle Kit

src/
  lib/
    auth.ts                     # Xử lý ký/xác thực JWT, thao tác với cookie
    lunar-calendar.ts           # Tiện ích chuyển đổi lịch Âm, tính ngày giỗ
    background-images.ts        # Cấu hình ảnh nền trang chủ & hồ sơ (thay đổi tại đây)

  components/
    AuthProvider.tsx             # Context bao bọc toàn ứng dụng, quản lý Auth
    Navbar.tsx                   # Thanh menu cố định trên cùng (điều chỉnh cỡ chữ, dropdown tài khoản)
    FamilyTree.tsx               # Component sơ đồ cây với React Flow (mở rộng/thu gọn)
    SearchableSelect.tsx         # Dropdown có tìm kiếm tái sử dụng

  routes/
    __root.tsx                   # Layout chính: Navbar, Footer, AuthProvider
    index.tsx                    # Trang chủ: Thống kê, Tin nổi bật, Ngày giỗ sắp tới
    tree.tsx                     # Xem toàn bộ tộc phả
    login.tsx                    # Đăng nhập / Đăng ký
    anniversaries.tsx            # Lịch sự kiện (Dương lịch + Âm lịch, chuyển tháng/năm)
    fund.tsx                     # Xem quỹ họ công khai
    person/$id.tsx               # Hồ sơ thành viên (Thông tin, Thành tựu, Album, Tưởng niệm)
    posts/index.tsx              # Danh sách bài viết
    posts/$id.tsx                # Chi tiết bài viết

    admin.tsx                    # Layout Admin (sidebar + outlet)
    admin/users.tsx              # Phê duyệt thành viên, gán liên kết hồ sơ
    admin/persons.tsx            # Quản lý hồ sơ tộc phả (TipTap editor, upload ảnh)
    admin/tree.tsx               # Quản lý quan hệ cây tộc phả (gán cha/mẹ)
    admin/posts.tsx              # Quản lý bài viết (TipTap editor)
    admin/fund.tsx               # Quản lý thu chi quỹ họ
    admin/anniversaries.tsx      # Quản lý sự kiện (Âm/Dương, lặp hàng năm/1 lần)
    admin/notifications.tsx      # Quản lý thông báo trang chủ

    api/                         # RESTful API endpoints (Server handlers)
```

## 3. Mô hình dữ liệu (Data Model)

Hệ thống sử dụng PostgreSQL. Các bảng chính:

- **`users`**: Tài khoản đăng nhập. Luồng trạng thái: `PENDING` → `ACTIVE`.
  - Có các quyền (`role`): GUEST | MEMBER | ADMIN | SUPER_ADMIN.
  - Cột `personId` liên kết tài khoản với hồ sơ trong cây tộc phả.

- **`persons`**: Hồ sơ cá nhân — các nút (Node) trên sơ đồ cây.
  - Tham chiếu tự thân (`fatherId`, `motherId`) để hình thành cấu trúc cây.
  - Phân loại `gender` (MALE/FEMALE) quyết định cách hiển thị.
  - `fullBiography`: nội dung HTML phong phú do TipTap soạn thảo.
  - `extra` (JSONB): dữ liệu mở rộng linh hoạt.

- **`marriages`**: Bảng trung gian liên kết vợ — chồng.

- **`posts`**: Tin tức cộng đồng (nội dung HTML từ TipTap, ảnh bìa).

- **`family_fund`**: Các giao dịch thu (IN), chi (OUT) của quỹ họ.

- **`memory_wall`**: Lời tri ân, hồi ký gắn liền với một hồ sơ `person`.

- **`notifications`**: Thông báo hiển thị trên trang chủ (bật/tắt).

- **`anniversaries`**: Sự kiện gia đình hỗ trợ lịch kép.
  - `dateType`: SOLAR hoặc LUNAR.
  - `type`: DEATH (Giỗ) | COMMEMORATION (Kỷ niệm) | OTHER (Khác).
  - `isRecurring`: diễn ra hàng năm hoặc chỉ 1 lần.
  - `personId`: liên kết tùy chọn đến hồ sơ thành viên.
  - `postId`: liên kết tùy chọn đến bài viết liên quan.

- **`media`**: Hình ảnh/tệp được tải lên hoặc nhúng link, gắn với `person` hoặc `post`.

- **`galleries`**, **`edit_requests`**: Bảng dự trữ cho tính năng tương lai.

## 4. Luồng Xác thực (Auth Flow)

Nền tảng sử dụng hệ thống đăng ký duyệt thủ công nhằm đảm bảo thông tin cá nhân của dòng họ không bị rò rỉ:

1. **Đăng ký**: Người dùng đăng ký tài khoản. Mặc định `status = PENDING`.
2. **Phê duyệt**: Quản trị viên vào `/admin/users`, chọn "Duyệt" → `status = ACTIVE`.
3. **Liên kết**: Quản trị viên gắn tài khoản với một hồ sơ trong cây tộc phả (`personId`).
4. **Đăng nhập**: Ứng dụng trả về JWT trong cookie `auth_token` (HttpOnly, hết hạn 7 ngày).
5. **Duy trì phiên**: Frontend gọi `GET /api/auth/me` để lấy lại thông tin user từ cookie.
6. **Hồ sơ cá nhân**: Nếu `personId` được gán, dropdown tài khoản hiển thị link "Hồ sơ của tôi".

## 5. Quyết định Thiết kế (Design Decisions)

- **PostgreSQL duy nhất**: Cơ sở dữ liệu quan hệ đảm bảo tính toàn vẹn dữ liệu (FK, unique, NOT NULL) rất phù hợp cho tộc phả. Cột `jsonb` cung cấp tính linh hoạt tương đương MongoDB khi cần. Với quy mô 300+ hồ sơ, PostgreSQL xử lý dễ dàng (thiết kế cho hàng triệu rows).
- **Tự xây Auth (Custom Auth)**: Do yêu cầu đặc thù về "Luồng phê duyệt tài khoản" (Admin-approval flow).
- **Cơ chế lọc Chi/Cành (Branch Filtering)**: Để tránh làm quá tải trình duyệt khi cây phát triển lớn.
- **Lịch kép (Dual Calendar)**: Sự kiện hỗ trợ cả Âm lịch và Dương lịch, hiển thị song song trên lưới tháng.
- **Ảnh nền cấu hình local**: File `src/lib/background-images.ts` chứa danh sách ảnh nền cho trang chủ và hồ sơ, dễ dàng thay đổi mà không sửa code.
