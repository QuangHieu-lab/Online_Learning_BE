# Hướng dẫn Setup Database MySQL

## Bước 1: Cài đặt MySQL (nếu chưa có)

### Windows:
1. Download MySQL từ: https://dev.mysql.com/downloads/installer/
2. Chọn "MySQL Installer for Windows"
3. Cài đặt và nhớ password của root user

### Hoặc sử dụng XAMPP/WAMP:
- XAMPP: https://www.apachefriends.org/
- WAMP: https://www.wampserver.com/

## Bước 2: Tạo Database

Mở MySQL Command Line hoặc MySQL Workbench và chạy:

```sql
CREATE DATABASE online_learning CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Hoặc nếu muốn đặt tên khác, có thể dùng:
```sql
CREATE DATABASE your_database_name CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## Bước 3: Tạo file .env

1. Copy file `.env.example` thành `.env`:
   ```bash
   cp .env.example .env
   ```

2. Mở file `.env` và cập nhật thông tin:

```env
DATABASE_URL="mysql://root:your_password@localhost:3306/online_learning"
```

**Giải thích:**
- `root`: username MySQL (thường là root)
- `your_password`: password MySQL của bạn
- `localhost`: host (thường là localhost)
- `3306`: port MySQL (mặc định là 3306)
- `online_learning`: tên database bạn vừa tạo

**Ví dụ:**
- Nếu password là `mypass123`: `mysql://root:mypass123@localhost:3306/online_learning`
- Nếu username là `admin`: `mysql://admin:mypass123@localhost:3306/online_learning`
- Nếu port khác (ví dụ 3307): `mysql://root:mypass123@localhost:3307/online_learning`

## Bước 4: Chạy Migration

Sau khi setup xong, chạy:

```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate
```

Lệnh `prisma:migrate` sẽ tự động tạo tất cả các tables trong database.

## Kiểm tra kết nối

Sau khi migrate xong, bạn có thể:
1. Mở MySQL Workbench hoặc phpMyAdmin
2. Xem database `online_learning`
3. Sẽ thấy các tables: User, Course, Lesson, Quiz, etc.

## Troubleshooting

### Lỗi: "Access denied for user"
- Kiểm tra lại username và password trong DATABASE_URL
- Đảm bảo MySQL service đang chạy

### Lỗi: "Unknown database"
- Đảm bảo đã tạo database trước
- Kiểm tra tên database trong DATABASE_URL có đúng không

### Lỗi: "Can't connect to MySQL server"
- Kiểm tra MySQL service có đang chạy không
- Kiểm tra port (mặc định 3306)
- Thử ping localhost
