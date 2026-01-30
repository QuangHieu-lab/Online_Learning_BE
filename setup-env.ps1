# Script tạo .env từ template và merge VNPAY từ credentials/vnpay
# Chạy: .\setup-env.ps1

$backendDir = $PSScriptRoot
$vnpayEnv = Join-Path $backendDir "..\credentials\vnpay\.env"
$targetEnv = Join-Path $backendDir ".env"
$templateEnv = Join-Path $backendDir "ENV_TEMPLATE.txt"

Write-Host "=== Setup Backend .env ===" -ForegroundColor Cyan

# 1. Copy template nếu chưa có .env
if (-not (Test-Path $targetEnv)) {
    Write-Host "Tao .env tu ENV_TEMPLATE.txt..." -ForegroundColor Yellow
    Copy-Item $templateEnv $targetEnv
    Write-Host "Da tao backend\.env" -ForegroundColor Green
} else {
    Write-Host "File .env da ton tai, giu nguyen." -ForegroundColor Yellow
}

# 2. Merge VNPAY từ credentials/vnpay/.env
if (Test-Path $vnpayEnv) {
    Write-Host "`nMerge VNPAY config tu credentials\vnpay\.env..." -ForegroundColor Yellow
    $vnpayContent = Get-Content $vnpayEnv -Raw
    $lines = $vnpayContent -split "`n" | Where-Object { $_ -match "VNP_" }
    
    $envContent = Get-Content $targetEnv -Raw
    
    foreach ($line in $lines) {
        if ($line -match "^(VNP_\w+)=(.+)$") {
            $key = $matches[1]
            $value = $matches[2]
            # Sua VNP_RETURN_URL cho backend
            if ($key -eq "VNP_RETURN_URL") {
                $value = "http://localhost:5000/api/payments/vnpay-return"
            }
            # Xoa dong cu neu co
            $envContent = $envContent -replace "$key=.*", ""
            # Them vao cuoi
            $envContent = $envContent.TrimEnd() + "`n$key=$value"
        }
    }
    
    Set-Content $targetEnv $envContent -NoNewline
    Write-Host "Da them VNPAY vao .env" -ForegroundColor Green
} else {
    Write-Host "`nKhong tim thay credentials\vnpay\.env - them VNPAY thu cong vao .env" -ForegroundColor Yellow
}

Write-Host "`n=== Buoc tiep theo ===" -ForegroundColor Cyan
Write-Host "1. Sua DATABASE_URL trong .env (MySQL)" -ForegroundColor White
Write-Host "2. Them FIREBASE_* cho Google sign-in (xem SETUP_VNPAY_GOOGLE.md)" -ForegroundColor White
Write-Host "3. Chay: npm run dev:no-reset" -ForegroundColor White
