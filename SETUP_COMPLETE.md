# ✅ Setup Hoàn Tất!

## Đã cấu hình:

✅ **File .env đã được tạo** với thông tin:
- Database: `online_learning`
- Username: `root`
- Password: `Luncantat1@`
- Host: `localhost:3306`

## Bước tiếp theo:

### 1. Tạo Database trong MySQL

**Cách 1: Dùng script tự động (nếu MySQL trong PATH):**
```powershell
.\create_db.ps1
```

**Cách 2: Tạo thủ công bằng MySQL Command Line:**
```bash
mysql -u root -p
```
Nhập password: `Luncantat1@`

Sau đó chạy:
```sql
CREATE DATABASE online_learning CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

**Cách 3: Dùng MySQL Workbench:**
1. Mở MySQL Workbench
2. Kết nối với server (password: `Luncantat1@`)
3. Chạy lệnh SQL:
```sql
CREATE DATABASE online_learning CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

**Cách 4: Dùng file SQL:**
```bash
mysql -u root -p < create_database.sql
```

### 2. Chạy Prisma Migrations

Sau khi database đã được tạo:

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
```

Lệnh `prisma:migrate` sẽ tự động tạo tất cả các tables:
- User
- Course
- Lesson
- Quiz
- Question
- Answer
- Submission
- Progress
- AISession
- VideoPost
- Enrollment

### 3. Kiểm tra Database

Xem database đã được tạo chưa:
```bash
npm run prisma:studio
```

Mở browser tại http://localhost:5555 để xem database

### 4. Chạy Server

```bash
npm run dev
```

Server sẽ chạy tại http://localhost:5000

## Troubleshooting

### Lỗi: "Access denied for user 'root'"
- Kiểm tra password có đúng `Luncantat1@` không
- Kiểm tra MySQL service có đang chạy không

### Lỗi: "Unknown database 'online_learning'"
- Đảm bảo đã tạo database trước khi chạy migration
- Kiểm tra tên database trong `.env` có đúng không

### Lỗi: "Can't connect to MySQL server"
- Kiểm tra MySQL service có đang chạy không
- Thử restart MySQL service
- Kiểm tra port 3306 có đang được sử dụng không

## Thông tin đã cấu hình:

```
Database Name: online_learning
Username: root
Password: Luncantat1@
Host: localhost
Port: 3306
```

File `.env` đã được tạo tại: `backend/.env`
