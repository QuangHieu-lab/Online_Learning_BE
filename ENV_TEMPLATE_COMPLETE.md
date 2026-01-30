# Complete Environment Variables Template

## Backend `.env` File

Copy và điền các giá trị vào file `backend/.env`:

```env
# ============================================
# SERVER CONFIGURATION
# ============================================
PORT=3000
FRONTEND_URL=http://127.0.0.1:5173
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
NODE_ENV=development

# ============================================
# DATABASE CONFIGURATION
# ============================================
DATABASE_URL=postgresql://user:password@localhost:5432/online_learning?schema=public

# ============================================
# FIREBASE CONFIGURATION (Backend Admin SDK)
# ============================================
# Lấy từ Firebase Console > Project Settings > Service Accounts
FIREBASE_PROJECT_ID=e-learning-4f0e7
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@e-learning-4f0e7.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET=e-learning-4f0e7.firebasestorage.app

# ============================================
# GOOGLE OAUTH CONFIGURATION (for Google Sign-In)
# ============================================
# Lấy từ Google Cloud Console > APIs & Services > Credentials
# Lưu ý: Đây là cho đăng nhập Google, KHÔNG phải cho gửi email
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback

# ============================================
# EMAIL CONFIGURATION (SMTP - for sending emails)
# ============================================
# Cách 1: Dùng EMAIL_* variables (khuyến nghị)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=your-email@gmail.com
EMAIL_FROM_NAME=E-Learning Platform

# Cách 2: Dùng SMTP_* variables (fallback, tương đương)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com
# SMTP_PASS=your-app-password
# SMTP_FROM=your-email@gmail.com

# ============================================
# GMAIL OAUTH CONFIGURATION (Optional - Advanced)
# ============================================
# Nếu muốn dùng OAuth thay vì App Password (phức tạp hơn)
# GMAIL_USER=your-email@gmail.com
# GMAIL_REFRESH_TOKEN=your-refresh-token-here
# Cần GOOGLE_CLIENT_ID và GOOGLE_CLIENT_SECRET ở trên
```

## Frontend `.env` File

Copy và điền các giá trị vào file `frontend/.env`:

```env
# ============================================
# API CONFIGURATION
# ============================================
VITE_API_URL=http://localhost:3000/api

# ============================================
# FIREBASE CONFIGURATION (Frontend Client SDK)
# ============================================
# Lấy từ Firebase Console > Project Settings > General > Your apps > Web app
VITE_FIREBASE_API_KEY=AIzaSyBEATZUWd0lH-diVkdxNh129ynrNoEjypo
VITE_FIREBASE_AUTH_DOMAIN=e-learning-4f0e7.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=e-learning-4f0e7
VITE_FIREBASE_STORAGE_BUCKET=e-learning-4f0e7.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=176747100572
VITE_FIREBASE_APP_ID=1:176747100572:web:51302e63ccd5982ee1b059
```

## Giải thích các biến

### Google OAuth vs Email SMTP

**GOOGLE_CLIENT_ID và GOOGLE_CLIENT_SECRET:**
- Dùng cho **đăng nhập Google** (Google Sign-In)
- Lấy từ Google Cloud Console
- KHÔNG dùng để gửi email

**EMAIL_* hoặc SMTP_*:**
- Dùng để **gửi email thông báo**
- Có thể dùng App Password hoặc OAuth (phức tạp hơn)
- EMAIL_* và SMTP_* là tương đương, hệ thống sẽ ưu tiên EMAIL_*

### Cách lấy thông tin

1. **Firebase Admin SDK** (backend):
   - Firebase Console > Project Settings > Service Accounts
   - Download JSON file và copy các giá trị

2. **Firebase Client SDK** (frontend):
   - Firebase Console > Project Settings > General > Your apps
   - Copy config từ Web app

3. **Google OAuth** (cho đăng nhập Google):
   - Google Cloud Console > APIs & Services > Credentials
   - Tạo OAuth 2.0 Client ID

4. **Gmail App Password** (cho gửi email):
   - Google Account > Security > App passwords
   - Tạo password mới cho "Mail"

## Lưu ý quan trọng

- ✅ **Bắt buộc**: DATABASE_URL, JWT_SECRET, FIREBASE_* (backend), VITE_FIREBASE_* (frontend)
- ✅ **Khuyến nghị**: EMAIL_* để gửi email thông báo
- ⚠️ **Tùy chọn**: GOOGLE_CLIENT_ID/SECRET (nếu không dùng Google Sign-In)
- ⚠️ **Tùy chọn**: GMAIL_REFRESH_TOKEN (chỉ nếu dùng OAuth cho email, phức tạp)

## Kiểm tra cấu hình

Sau khi điền `.env`, chạy:
```bash
# Backend
cd backend
node check-firebase-env.js

# Nếu thiếu biến Firebase, sẽ hiển thị hướng dẫn
```
