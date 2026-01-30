# Hướng Dẫn Setup File .env

## Backend (.env)

Tạo file `backend/.env` và thêm các giá trị sau:

```env
# Server
PORT=3000
FRONTEND_URL=http://127.0.0.1:5173

# Database (giữ nguyên giá trị hiện tại của bạn)
DATABASE_URL=postgresql://user:password@localhost:5432/online_learning

# JWT (giữ nguyên giá trị hiện tại của bạn)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Gemini AI (giữ nguyên giá trị hiện tại của bạn)
GEMINI_API_KEY=your-gemini-api-key-here

# Firebase Configuration
FIREBASE_PROJECT_ID=e-learning-4f0e7
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC9446l98+ydNjg\nvu9eoks6O+nACDbQvVKeDXX6i0xRbS9xiK4BiFZG3VzRcqjeCTwGWcbaEzIMAq2O\npEBV/DPDPbt4NOtcqe+/ofhMOHivIzVRUsJSKSsNYWgFgEEXSDO0TOLcoN1v0ZAy\ns7v1bh2RSsL7amEAH5a74IFc/GnqkdgAHSAgKkyW+/zHk3IO4IemFbRkm3LED0rR\nePsA6u6PLEZ2m8FCT0jJM8a3YBKA2nnxM3hzeNCVr2IsjnpAsg6Tca2G7QZrjNI8\nWpUi7vL8roDQ2FyxHaBqPvwB38HRDSZR2iRgFNfBB4+pNkIlUk/2calawJ4Zwzpy\nDZDIu+FnAgMBAAECggEAD8Z9TfNMSv9QGtb7j4YciWyVNJuG4+KTbLpuwbwCDbjs\nOk3Oy77/qlV7mSu7m1UMqo5macZmEv9dKD69clp7rM21Hf08TG94+BerR1HHUCC0\n4XOzQ+lUDU5S7c1EGxYOTZbrOSvk5mqnkYuP1iNdMeCr82a/Qw5cxgqWh+exOO50\nomgxdHCSe6gtaXqYkISLpR5kDJBiDKfpDoXl+sgZqnql4jUq3kxsdgB9/DEM4uhn\n1NwxcYLGx/aH8ES6dvAojSKFZG4qsm3x35a2Yk/HIQq7voU9EEf1a8vq+AQOurfy\nPZ2wb413d2ePWhEXVH0a8MUjbrrNc/OvRfxS9c8CiQKBgQDddgJMS1glrS+m5DyA\n9L5EVHGAIq2kabY8eLcumIHmQyTgkL2selu+NpObUqz9gbOMlfLQED0MMD10X6Cn\nrlrRySHDi5V/dhKBka/+b/piv5fKBndHz4x/z1aOv1VPWCEvOkBBRyqhMmPUWtKC\nPd/tXoB7L64ML2SbLT7M4c1mAwKBgQDbgQKQDncKxpP8D2fPaYs65kRaQq4CjTlx\nzMO7F3fI5b9neaL5gcQvg7HSMbqtN9pMYP9Ep8IT16/KtJuK1hNKa+KUS+prDG43\nivUWQrj9BWCqkCRorqm7eoYomK2x+jh5/rs4n39Y5+1zQMCJhdVlgVJ9qjXfahrD\nVqf+8T+7zQKBgCipXzik6NVaHBK3e0huJ3UiUAin1VwHsNcfjvq2M7uUfnPg/4Jo\noOmm2ak+H9cX9mCMs51yLdNMFCyG1leTUseL93AQ8+0IP9OcbUT5SG7TIMqOL153\nBCP/bLQe+0nrM4SZXGzf5Trdpqi52Ebjl3bc0BhOI9XG6eD4CLzThMQDAoGBAIgK\n2zXBYVJSZOFyAtrwBRTKJk7yyLpYIORBDoZkMx9WFVzibHnLTXZNXuZxX8t/tFJm\nQ4+fkY+OvCsb6NMRfv8/Ajz7GBykpaLTArd7Pv/CV3kewRIIPrYtZ/y9M9n8xQgH\nMq4TXHATvn0SAsK5KdsxXZj4507CijfK+2/swZ15AoGBALbFqD16Zp7vtPuJuTcq\nr8m1M8vHidZKq2tEgsIYylSppg2OhZUroIVMJT0jkdwIPvlwK4wvJg0pzS0pe98D\nrBdDlX7s8nX1kqpVkXjFx5kcCtNalCl+aPzpM3NCi39yimHTCxdkTvV6OMF2iGYf\nmjmVWbzYN6JeOpuagm/WD+tY\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@e-learning-4f0e7.iam.gserviceaccount.com
FIREBASE_STORAGE_BUCKET=e-learning-4f0e7.firebasestorage.app
```

**Lưu ý**: Copy toàn bộ `private_key` từ file JSON (giữ nguyên dấu ngoặc kép và `\n`)

## Frontend (.env)

Tạo file `frontend/.env` và thêm:

```env
VITE_API_URL=http://localhost:3000/api

VITE_FIREBASE_API_KEY=AIzaSyBEATZUWd0lH-diVkdxNh129ynrNoEjypo
VITE_FIREBASE_AUTH_DOMAIN=e-learning-4f0e7.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=e-learning-4f0e7
VITE_FIREBASE_STORAGE_BUCKET=e-learning-4f0e7.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=176747100572
VITE_FIREBASE_APP_ID=1:176747100572:web:51302e63ccd5982ee1b059
```

## Bước tiếp theo

1. Tạo file `.env` trong `backend/` và `frontend/` với nội dung trên
2. Chạy migration Prisma để thêm field `firebaseUid`:
   ```bash
   cd backend
   npm run prisma:migrate
   ```
3. Cài đặt dependencies:
   ```bash
   # Backend
   cd backend
   npm install
   
   # Frontend
   cd frontend
   npm install
   ```
4. Khởi động lại server:
   ```bash
   # Backend
   cd backend
   npm run dev
   
   # Frontend
   cd frontend
   npm run dev
   ```
