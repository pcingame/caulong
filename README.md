# Cầu Lông

Web app quản lý lịch cầu lông và chi phí nhóm. Admin đặt sân trên `datlich.alobo.vn`, upload ảnh xác nhận lên đây, hệ thống theo dõi RSVP, chốt sổ, chia tiền và thông báo qua Discord.

## Stack

- Next.js 16 (App Router, TypeScript) + Tailwind v4 (dark theme mặc định)
- Prisma 6 + PostgreSQL
- NextAuth v5 (Google login)
- Vercel Blob (upload ảnh đặt lịch + QR)
- Discord Webhook (thông báo)

## Chạy local (không cần Google OAuth, không cần Docker)

Yêu cầu: **Node.js ≥ 20.19 / ≥22.13 / ≥24** (bản `prisma dev` ở bước 2 cần `node:sqlite`, chỉ có từ Node ≥23.4 hoặc ≥24 — khuyên dùng Node 24 LTS).

1. Cài dependencies:
   ```
   npm install
   ```
2. Chạy 1 Postgres local (không cần cài gì thêm, không cần Docker):
   ```
   npx prisma dev --detach --name cau-long
   ```
   Lệnh này chạy nền, in ra 1 URL dạng `postgres://postgres:postgres@localhost:<port>/template1?...`. Tạo database riêng cho app:
   ```
   printf 'CREATE DATABASE cau_long;' | npx prisma db execute --url "postgres://postgres:postgres@localhost:<port>/template1?sslmode=disable" --stdin
   ```
3. Cập nhật `.env` (copy từ `.env.example` nếu chưa có), điền `DATABASE_URL` trỏ vào db vừa tạo — **bắt buộc thêm `&pgbouncer=true&connection_limit=1`** vì `prisma dev` chạy sau 1 connection pooler, thiếu 2 flag này sẽ gặp lỗi `prepared statement already exists`:
   ```
   DATABASE_URL="postgres://postgres:postgres@localhost:<port>/cau_long?sslmode=disable&pgbouncer=true&connection_limit=1"
   ```
   Điền thêm `NEXTAUTH_SECRET` (chạy `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`). Để trống `GOOGLE_CLIENT_ID/SECRET` và `BLOB_READ_WRITE_TOKEN` cũng chạy được — chỉ cần khi muốn test đăng nhập Google thật hoặc upload ảnh.
4. Chạy migration:
   ```
   npx prisma migrate dev --name init
   ```
5. Seed dữ liệu mẫu (1 nhóm demo, 4 thành viên giả, 4 trận đấu ở đủ trạng thái: đã tất toán, đã chốt còn nợ, chờ chốt sổ, sắp diễn ra) — **không cần đăng nhập trước**, script tự tạo admin:
   ```
   npx prisma db seed
   ```
   Muốn dùng email khác cho admin: `SEED_ADMIN_EMAIL=abc@dev.test npx prisma db seed`. Chạy lại bất cứ lúc nào để reset data mẫu.
6. Chạy dev server:
   ```
   npm run dev
   ```
7. Vào http://localhost:3000/login → dùng ô **"Dev Login"** ở cuối trang, gõ email `admin@dev.test` (hoặc email bạn seed) → vào thẳng app với đầy đủ data mẫu, không cần cấu hình Google OAuth. Ô "Đăng nhập với Google" vẫn hoạt động song song nếu bạn đã điền `GOOGLE_CLIENT_ID/SECRET` thật.

**Lưu ý:** "Dev Login" chỉ tồn tại khi `NODE_ENV !== "production"` (tự động, không thể bật nhầm ở production) — đây là provider credentials nhận bất kỳ email nào, tự tạo `User` nếu chưa có, chỉ dùng để test local.

Quản lý Postgres local: `npx prisma dev ls` (xem đang chạy), `npx prisma dev stop cau-long` (dừng), `npx prisma dev start cau-long` (chạy lại — port có thể đổi, nhớ cập nhật `DATABASE_URL`).

## Test

Unit test cho các phần logic quan trọng nhất (chia tiền, state machine của trận đấu, format tin nhắn Discord + retry khi bị rate-limit):
```
npm test          # chạy 1 lần
npm run test:watch
```
Đây là test thuần logic (không cần DB), tách riêng khỏi các API route để dễ test và tái sử dụng (`src/lib/split.ts`, `src/lib/match-status.ts`, `src/lib/discord.ts`).

## Tạo Discord Webhook (bắt buộc để có thông báo)

Webhook không tạo qua code — phải tạo thủ công trên Discord, mỗi nhóm 1 webhook:

1. Tạo (hoặc dùng) 1 server Discord, mời các thành viên vào.
2. Vào kênh muốn nhận thông báo (vd `#lich-cau`) → **Edit Channel** → **Integrations** → **Webhooks** → **New Webhook**.
3. Đặt tên, bấm **Copy Webhook URL**.
4. Dán URL đó vào ô "Discord Webhook URL" trong trang **Cài đặt nhóm** (`/groups/[id]/settings`) của app, bấm Lưu.

Lưu ý: ai cầm URL này cũng gửi được tin nhắn vào kênh — không chia sẻ công khai. URL được lưu trong DB (qua form cài đặt), không phải biến môi trường.

## Luồng chính

1. **Tạo nhóm** ở dashboard → bạn thành `SUPER_ADMIN`.
2. **Cài đặt nhóm** (`/groups/[id]/settings`): upload QR mặc định, thông tin ngân hàng, Discord Webhook URL, thêm thành viên (bằng email — thành viên phải đăng nhập app ít nhất 1 lần trước).
3. **Tạo trận đấu**: đặt sân trên alobo.vn như bình thường → vào app upload ảnh xác nhận + nhập ngày giờ/sân. Chi phí dự kiến tự tính từ trung bình các trận đã chốt gần nhất (chỉ để tham khảo).
4. **Thành viên RSVP** tham gia/vắng.
5. Sau khi trận **kết thúc** (`endTime` đã qua), admin bấm **Chốt sổ**: nhập tiền sân/nước thực tế + chọn ai thực sự chơi → hệ thống chia đều và khoá số tiền từng người, gửi thông báo Discord.
6. Thành viên bấm **Đã chuyển khoản**, admin **Xác nhận** → khi tất cả đã xác nhận, trận chuyển trạng thái **Đã tất toán**.
7. Thành viên **không thể tự rời nhóm** nếu còn trận đã kết thúc chưa được admin chốt sổ, hoặc còn khoản thanh toán chưa được admin xác nhận. Admin vẫn có thể xoá cưỡng chế (có ghi log cảnh báo).

## Triển khai Production (Vercel)

### Bước 1 — Đẩy code lên GitHub

```
git init
git add .
git commit -m "Initial commit"
```
Tạo 1 repo trên GitHub rồi push lên (`git remote add origin ... && git push -u origin main`).

### Bước 2 — Tạo database Postgres cho production

Chọn 1 trong 2, cả hai đều có gói free đủ dùng cho nhóm bạn bè:
- [Neon](https://neon.tech) → New Project → copy **connection string** (dạng `postgresql://...`).
- [Supabase](https://supabase.com) → New Project → Settings → Database → copy **Connection string** (chọn chế độ "Transaction" pooling cho serverless).

Giữ lại connection string này, dùng ở bước 4.

### Bước 3 — Tạo Vercel project

1. Vào [vercel.com/new](https://vercel.com/new) → Import repo GitHub vừa tạo.
2. Vercel tự nhận diện Next.js — **chưa bấm Deploy vội**, qua bước 4 điền env vars trước.

### Bước 4 — Điền Environment Variables trên Vercel

Vào Project Settings → Environment Variables, thêm (áp dụng cho Production, và Preview nếu muốn test trước):

| Key | Giá trị |
|---|---|
| `DATABASE_URL` | Connection string Postgres ở bước 2 |
| `NEXTAUTH_URL` | `https://<domain-vercel-cua-ban>.vercel.app` (đổi lại nếu dùng custom domain) |
| `NEXTAUTH_SECRET` | Chạy `openssl rand -base64 32` ở máy local, dán kết quả vào |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Xem bước 5 |
| `BLOB_READ_WRITE_TOKEN` | Xem bước 6 |

### Bước 5 — Cấu hình Google OAuth cho production

1. Vào [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials), mở OAuth Client ID đã tạo lúc dev (hoặc tạo mới).
2. Thêm vào **Authorized redirect URIs**:
   ```
   https://<domain-vercel-cua-ban>.vercel.app/api/auth/callback/google
   ```
   (giữ nguyên URI localhost cũ nếu vẫn dev local song song)
3. Nếu app ở chế độ "Testing" trong OAuth consent screen, thêm email các thành viên vào danh sách **Test users**, hoặc publish app (không cần verify vì chỉ dùng nội bộ nhóm bạn bè, ít user).

### Bước 6 — Tạo Vercel Blob store

1. Trong Vercel dashboard → project → tab **Storage** → **Create Database** → chọn **Blob**.
2. Sau khi tạo, Vercel tự thêm `BLOB_READ_WRITE_TOKEN` vào env vars của project (kiểm tra lại ở Settings → Environment Variables).

### Bước 7 — Deploy lần đầu

Bấm **Deploy** trên Vercel (hoặc `git push` nếu project đã link sẵn).

Lưu ý: [vercel.json](vercel.json) đã cấu hình `buildCommand: npm run vercel-build`, script này chạy `prisma migrate deploy` (áp toàn bộ migration lên DB production) trước khi build — tự động, không cần chạy tay.

### Bước 8 — Kiểm tra sau khi deploy

1. Mở domain Vercel, đăng nhập Google → tạo nhóm đầu tiên (bạn thành `SUPER_ADMIN`).
2. Vào Cài đặt nhóm → upload QR mặc định, điền bank info, dán Discord Webhook URL (xem hướng dẫn tạo webhook ở trên).
3. Thêm thành viên bằng email — **mỗi người phải tự đăng nhập Google vào app ít nhất 1 lần trước** thì admin mới thêm được (hệ thống match theo email đã có trong DB).
4. Tạo thử 1 trận đấu để xác nhận luồng upload ảnh, RSVP, chốt sổ, thanh toán, thông báo Discord đều chạy đúng trên production.

### Từ lần deploy sau

Chỉ cần `git push` lên nhánh đã link với Vercel — mỗi lần deploy sẽ tự chạy `prisma migrate deploy`, nên nếu bạn thêm migration mới (`npx prisma migrate dev --name ...` ở local trước khi push), production sẽ tự cập nhật schema.

## Ghi chú thiết kế

- Không có đồng bộ tự động từ alobo.vn — admin luôn thao tác thủ công + upload ảnh làm bằng chứng.
- Trạng thái `UPCOMING` / `ONGOING` / `AWAITING_FINALIZE` được tính từ giờ hệ thống (không cần cron); chỉ `FINALIZED` / `SETTLED` được ghi thật vào DB, do admin chủ động chốt.
- Danh sách người chia tiền được khoá tại thời điểm chốt sổ (không dùng RSVP tại thời điểm tạo trận), để tránh lệch khi có người đổi ý phút chót.
