# Hướng dẫn Setup VNPAY và Google Sign-in

## 1. Setup VNPAY (Thanh toán)

### Bước 1: Đăng ký tài khoản VNPAY
- **Sandbox (test):** https://sandbox.vnpayment.vn/
- **Production:** Liên hệ VNPAY để đăng ký merchant

### Bước 2: Lấy thông tin
Sau khi đăng nhập Sandbox, vào **Thông tin tài khoản** để lấy:
- **Mã website (TMN Code):** `VNP_TMN_CODE`
- **Mã hash secret:** `VNP_HASH_SECRET`

### Bước 3: Thêm vào `backend/.env`
```env
VNP_TMN_CODE=RPNQZJRD
VNP_HASH_SECRET=1KJRZQTCPYJBYKWVHOS5LZRAV9QR6TZL
VNP_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNP_RETURN_URL=http://localhost:5000/api/payments/vnpay-return
```

**Lưu ý:** `VNP_RETURN_URL` phải trỏ đúng URL callback của backend. Nếu backend chạy port 5000 thì dùng `http://localhost:5000/api/payments/vnpay-return`.

---

## 2. Setup Google Sign-in (Firebase)

### Bước 1: Tạo project Firebase
1. Vào https://console.firebase.google.com
2. Tạo project mới hoặc chọn project có sẵn
3. Thêm app Web (nếu chưa có)

### Bước 2: Bật Google Authentication
1. Vào **Authentication** > **Sign-in method**
2. Bật **Google**
3. Chọn email hỗ trợ (Support email)
4. Lưu

### Bước 3: Lấy Service Account (cho Backend)
1. Vào **Project Settings** (icon bánh răng) > **Service accounts**
2. Click **Generate new private key**
3. Tải file JSON về
4. Mở file JSON, copy:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `private_key` → `FIREBASE_PRIVATE_KEY` (giữ nguyên `\n`, bọc trong dấu `"`)
   - `client_email` → `FIREBASE_CLIENT_EMAIL`

### Bước 4: Lấy Firebase Config (cho Frontend)
1. Vào **Project Settings** > **General** > **Your apps**
2. Copy các giá trị: `apiKey`, `authDomain`, `storageBucket`, `messagingSenderId`, `appId`
3. Thêm vào `frontend/.env`:
```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

### Bước 5: Thêm domain vào Firebase
1. Vào **Authentication** > **Settings** > **Authorized domains**
2. Thêm `localhost` và domain production của bạn

### Bước 6: Thêm vào `backend/.env`
```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
```

**Lưu ý:** `FIREBASE_PRIVATE_KEY` phải có dấu ngoặc kép `"..."` và giữ nguyên `\n` trong key.

---

## 3. Copy từ credentials có sẵn

Nếu đã có file `credentials/vnpay/.env`, có thể copy VNPAY config sang backend:

```powershell
# PowerShell - thêm VNPAY vào backend .env
$vnpay = Get-Content credentials\vnpay\.env
$vnpay = $vnpay -replace 'VNP_RETURN_URL=.*', 'VNP_RETURN_URL=http://localhost:5000/api/payments/vnpay-return'
Add-Content backend\.env "`n# VNPAY`n$vnpay"
```

Hoặc copy thủ công từ `credentials/vnpay/.env` sang `backend/.env`, sửa `VNP_RETURN_URL` thành:
```
VNP_RETURN_URL=http://localhost:5000/api/payments/vnpay-return
```

---

## 4. Kiểm tra

### Backend
```bash
cd backend
npm run dev:no-reset
```
- Thấy `✅ Firebase Admin SDK initialized successfully` → Google OK
- Test thanh toán VNPAY → Tạo payment, redirect sang VNPAY sandbox

### Frontend
- Đăng nhập bằng Google → Popup Google, chọn tài khoản
- Nếu lỗi CORS/COOP → Kiểm tra `FRONTEND_URL` trong backend .env khớp với URL frontend
