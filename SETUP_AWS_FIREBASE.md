# Hướng Dẫn Setup AWS S3 và Firebase

## 📋 Mục Lục
1. [Setup AWS S3](#1-setup-aws-s3)
2. [Setup Firebase](#2-setup-firebase)
3. [Cấu hình Environment Variables](#3-cấu-hình-environment-variables)
4. [Cài đặt Dependencies](#4-cài-đặt-dependencies)
5. [Kiểm tra Setup](#5-kiểm-tra-setup)

---

## 1. Setup AWS S3

### Bước 1: Tạo AWS Account
- Truy cập: https://aws.amazon.com/
- Đăng ký tài khoản (nếu chưa có)
- Đăng nhập vào AWS Console

### Bước 2: Tạo IAM User cho S3 Access
1. Vào **IAM** (Identity and Access Management)
2. Chọn **Users** → **Create user**
3. Đặt tên user (ví dụ: `s3-video-uploader`)
4. Chọn **Provide user access to the AWS Management Console** → **Next**
5. Chọn **Attach policies directly** → Tìm và chọn:
   - `AmazonS3FullAccess` (hoặc tạo custom policy chỉ cho bucket cụ thể)
6. **Create user**

### Bước 3: Tạo Access Keys
1. Click vào user vừa tạo
2. Tab **Security credentials**
3. **Create access key**
4. Chọn **Application running outside AWS**
5. **Next** → **Create access key**
6. **QUAN TRỌNG**: Copy và lưu lại:
   - **Access key ID**
   - **Secret access key** (chỉ hiển thị 1 lần!)

### Bước 4: Tạo S3 Bucket
1. Vào **S3** service
2. **Create bucket**
3. Đặt tên bucket (phải unique globally, ví dụ: `my-learning-videos-2024`)
4. Chọn **Region** (ví dụ: `ap-southeast-1` cho Singapore)
5. **Block Public Access settings**: 
   - Bỏ tick **Block all public access** (để video có thể stream)
   - Hoặc giữ nguyên và dùng presigned URLs
6. **Create bucket**

### Bước 5: Cấu hình Bucket Permissions (Optional)
1. Vào bucket vừa tạo
2. Tab **Permissions**
3. **Bucket policy** → Thêm policy sau (thay `your-bucket-name`):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::your-bucket-name/*"
    }
  ]
}
```

### Bước 6: Lấy thông tin cho .env
- `AWS_ACCESS_KEY_ID`: Từ bước 3
- `AWS_SECRET_ACCESS_KEY`: Từ bước 3
- `AWS_REGION`: Region bạn chọn (ví dụ: `ap-southeast-1`)
- `AWS_S3_BUCKET_NAME`: Tên bucket (ví dụ: `my-learning-videos-2024`)

---

## 2. Setup Firebase

### Bước 1: Tạo Firebase Project
1. Truy cập: https://console.firebase.google.com/
2. **Add project** (hoặc chọn project có sẵn)
3. Đặt tên project
4. Bật **Google Analytics** (optional)
5. **Create project**

### Bước 2: Enable Authentication (Google Sign-in)
1. Vào **Authentication** → **Get started**
2. Tab **Sign-in method**
3. Click **Google** → **Enable**
4. Chọn **Project support email**
5. **Save**

### Bước 2.5: Cấu hình Authorized Domains (Quan trọng cho OAuth)
Để Google Sign-in hoạt động trên localhost, bạn cần thêm domain vào danh sách authorized domains:

1. Vào **Authentication** → **Settings**
2. Tab **Authorized domains**
3. Click **Add domain**
4. Thêm các domain sau:
   - `127.0.0.1` (cho development local)
   - `localhost` (cho development local)
   - Domain production của bạn (ví dụ: `yourdomain.com`)
5. **Save**

**Lưu ý**: Nếu không thêm `127.0.0.1` và `localhost`, bạn sẽ thấy cảnh báo trong console và Google Sign-in sẽ không hoạt động trên localhost.

### Bước 3: Tạo Service Account (cho Backend)
1. Vào **Project Settings** (biểu tượng ⚙️)
2. Tab **Service accounts**
3. Click **Generate new private key**
4. **Generate key** → File JSON sẽ được download
5. Mở file JSON và copy các giá trị:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `private_key` → `FIREBASE_PRIVATE_KEY` (giữ nguyên dấu ngoặc kép và `\n`)
   - `client_email` → `FIREBASE_CLIENT_EMAIL`

### Bước 4: Lấy Web API Key (cho Frontend)
1. Vẫn trong **Project Settings**
2. Tab **General**
3. Scroll xuống **Your apps** → Chọn **Web app** (hoặc tạo mới)
4. Copy các giá trị:
   - `apiKey` → `FIREBASE_WEB_API_KEY`
   - `authDomain` → `FIREBASE_AUTH_DOMAIN`
   - `projectId` → Đã có từ service account
   - `storageBucket` → `FIREBASE_STORAGE_BUCKET`
   - `messagingSenderId` → `FIREBASE_MESSAGING_SENDER_ID`
   - `appId` → `FIREBASE_APP_ID`

### Bước 5: Enable Email Service (Optional - cho gửi email)
Firebase không có email service trực tiếp. Có 2 cách:

**Cách 1: Dùng Firebase Extensions (Recommended)**
1. Vào **Extensions** trong Firebase Console
2. Tìm **Trigger Email** extension
3. Cài đặt và cấu hình

**Cách 2: Dùng Nodemailer với Gmail SMTP**
- Sẽ được hướng dẫn trong code

---

## 3. Cấu hình Environment Variables

### Backend (.env)
1. Copy file `.env.example` thành `.env`:
   ```bash
   cd backend
   copy .env.example .env
   ```

2. Mở file `.env` và điền các giá trị:

```env
# Server
PORT=3000
FRONTEND_URL=http://127.0.0.1:5173

# Database (đã có sẵn)
DATABASE_URL=postgresql://user:password@localhost:5432/online_learning

# JWT (tạo random string mạnh)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Gemini AI (đã có sẵn)
GEMINI_API_KEY=your-gemini-api-key-here

# AWS S3
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_REGION=ap-southeast-1
AWS_S3_BUCKET_NAME=my-learning-videos-2024

# Firebase
FIREBASE_PROJECT_ID=my-learning-project
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@my-learning-project.iam.gserviceaccount.com

# Firebase Web (cho frontend)
FIREBASE_WEB_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
FIREBASE_AUTH_DOMAIN=my-learning-project.firebaseapp.com
FIREBASE_STORAGE_BUCKET=my-learning-project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789012
FIREBASE_APP_ID=1:123456789012:web:abcdef123456
```

### Frontend (.env)
1. Tạo file `.env` trong thư mục `frontend/`:

```env
VITE_FIREBASE_API_KEY=your-firebase-web-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-firebase-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
VITE_API_URL=http://localhost:3000/api
```

**Lưu ý**: Vite yêu cầu prefix `VITE_` cho các biến môi trường!

---

## 4. Cài đặt Dependencies

### Backend
```bash
cd backend
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner firebase-admin nodemailer
npm install --save-dev @types/nodemailer
```

### Frontend
```bash
cd frontend
npm install firebase
```

---

## 5. Kiểm tra Setup

### Kiểm tra AWS S3
1. Chạy backend:
   ```bash
   cd backend
   npm run dev
   ```
2. Thử upload video qua API
3. Kiểm tra trong S3 Console xem file đã upload chưa

### Kiểm tra Firebase
1. Chạy frontend:
   ```bash
   cd frontend
   npm run dev
   ```
2. Vào trang Login
3. Click "Sign in with Google"
4. Kiểm tra xem có popup Google Sign-in không

---

## 🔒 Bảo Mật

### ⚠️ QUAN TRỌNG:
1. **KHÔNG commit file `.env` lên Git**
   - File `.env` đã có trong `.gitignore`
   - Chỉ commit `.env.example`

2. **Rotate keys định kỳ**
   - Đổi AWS Access Keys mỗi 3-6 tháng
   - Đổi Firebase Service Account keys nếu bị lộ

3. **Sử dụng IAM Roles thay vì Access Keys** (nếu deploy lên AWS)
   - An toàn hơn cho production

4. **Giới hạn quyền S3**
   - Chỉ cho phép upload/read trong bucket cụ thể
   - Không dùng `AmazonS3FullAccess` trong production

---

## 📞 Hỗ Trợ

Nếu gặp vấn đề:
1. Kiểm tra lại các biến môi trường
2. Kiểm tra logs trong console
3. Kiểm tra permissions trong AWS/Firebase Console

---

## ✅ Checklist Setup

- [ ] AWS Account đã tạo
- [ ] IAM User và Access Keys đã tạo
- [ ] S3 Bucket đã tạo và cấu hình
- [ ] Firebase Project đã tạo
- [ ] Google Authentication đã enable
- [ ] Service Account JSON đã download
- [ ] Backend `.env` đã điền đầy đủ
- [ ] Frontend `.env` đã điền đầy đủ
- [ ] Dependencies đã cài đặt
- [ ] Đã test upload video lên S3
- [ ] Đã test Google Sign-in
