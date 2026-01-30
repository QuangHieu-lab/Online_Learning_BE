# 🚀 Quick Start Guide

## Bước 1: Setup Database (Tự động)

### Windows (PowerShell):
```powershell
cd backend
.\setup.ps1
```

### Mac/Linux hoặc Windows (Node.js):
```bash
cd backend
npm install
node setup.js
```

Script sẽ hỏi bạn:
- MySQL username (mặc định: root)
- MySQL password
- MySQL host (mặc định: localhost)
- MySQL port (mặc định: 3306)
- Database name (mặc định: online_learning)
- JWT Secret (có thể để trống để tự generate)
- Gemini API Key (optional)

## Bước 2: Tạo Database trong MySQL

Sau khi chạy setup script, bạn cần tạo database trong MySQL:

### Cách 1: Dùng MySQL Command Line
```bash
mysql -u root -p
```
Sau đó chạy:
```sql
CREATE DATABASE online_learning CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Cách 2: Dùng MySQL Workbench
1. Mở MySQL Workbench
2. Kết nối với MySQL server
3. Chạy file `create_database.sql` hoặc chạy lệnh SQL:
```sql
CREATE DATABASE online_learning CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Cách 3: Dùng phpMyAdmin (nếu dùng XAMPP)
1. Mở http://localhost/phpmyadmin
2. Click "New" để tạo database mới
3. Tên: `online_learning`
4. Collation: `utf8mb4_unicode_ci`
5. Click "Create"

## Bước 3: Chạy Prisma Migrations

Sau khi tạo database, chạy:

```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate
```

Lệnh `prisma:migrate` sẽ tự động:
- Tạo tất cả các tables
- Tạo các relationships
- Setup indexes và constraints

## Bước 4: Kiểm tra

Sau khi migrate xong, bạn có thể:

1. **Xem database:**
   ```bash
   npm run prisma:studio
   ```
   Mở browser tại http://localhost:5555 để xem database

2. **Hoặc kiểm tra trong MySQL:**
   - Mở MySQL Workbench
   - Xem database `online_learning`
   - Sẽ thấy các tables: User, Course, Lesson, Quiz, etc.

## Bước 5: Chạy Backend

```bash
npm run dev
```

Server sẽ chạy tại http://localhost:5000

## Bước 6: Setup Frontend

Mở terminal mới:

```bash
cd frontend
npm install
```

Tạo file `.env`:
```env
VITE_API_URL=http://localhost:5000/api
```

Chạy frontend:
```bash
npm run dev
```

Frontend sẽ chạy tại http://localhost:3000

## Troubleshooting

### Lỗi: "Access denied for user"
- Kiểm tra lại username và password trong file `.env`
- Đảm bảo MySQL service đang chạy

### Lỗi: "Unknown database"
- Đảm bảo đã tạo database trước khi chạy migration
- Kiểm tra tên database trong `.env` có đúng không

### Lỗi: "Can't connect to MySQL server"
- Kiểm tra MySQL service có đang chạy không
- Kiểm tra port (mặc định 3306)
- Thử ping localhost

### Lỗi khi chạy setup script
- Đảm bảo đã cài Node.js
- Chạy `npm install` trước khi chạy setup script

## Cấu trúc file sau khi setup

```
backend/
├── .env                    # Database config (được tạo bởi setup script)
├── create_database.sql     # SQL script để tạo database
├── prisma/
│   ├── schema.prisma        # Database schema
│   └── migrations/          # Migration files (tự động tạo)
└── src/                     # Source code
```
