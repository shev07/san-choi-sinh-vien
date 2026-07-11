# Sân Chơi Sinh Viên

Website để sinh viên đăng, tải xuống và khám phá tài liệu, mã nguồn và game tự làm.

## Chạy thử

```bash
npm install
npm start
```

Mở `http://localhost:3000` để kiểm tra trong quá trình phát triển.

## Đưa website lên Internet (không dùng localhost)

1. Tạo một repository GitHub mới, rồi đưa toàn bộ thư mục dự án này lên repository đó.
2. Đăng nhập [Render](https://render.com), chọn **New + → Blueprint**, kết nối repository vừa tạo và xác nhận triển khai.
3. Render sẽ tạo URL công khai dạng `https://san-choi-sinh-vien.onrender.com`; chia sẻ URL này hoặc trỏ tên miền riêng vào đó.

Lưu ý: gói miễn phí của Render có thể xóa tệp người dùng đã tải lên khi dịch vụ khởi động lại. Để lưu tệp bền vững, dùng Render Disk (trả phí) hoặc thay phần lưu tệp trong `server.js` bằng Cloudinary, Amazon S3 hoặc Supabase Storage.

## Tạo tài khoản quản trị

Trong Render, mở **Environment** của Web Service và thêm ba biến sau trước lần triển khai kế tiếp:

```text
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=mật-khẩu-mạnh-tối-thiểu-8-ký-tự
SESSION_SECRET=một-chuỗi-ngẫu-nhiên-dài
```

Khi dịch vụ khởi động, tài khoản email trên sẽ có vai trò `admin`. Người dùng thường có thể tự đăng ký; chỉ admin mới xóa và quản lý bài đăng. Không đưa các giá trị thật vào GitHub.
