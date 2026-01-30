 = Get-Content ..\e-learning-4f0e7-firebase-adminsdk-fbsvc-699a11e62c.json | ConvertFrom-Json;  = if (Test-Path .env) { Get-Content .env -Raw } else { \ \ }; if ( -notmatch \FIREBASE_PROJECT_ID\) { Add-Content -Path .env -Value \
# Firebase Configuration
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_STORAGE_BUCKET=e-learning-4f0e7.firebasestorage.app
FIREBASE_PRIVATE_KEY=\\
\; Write-Host \Firebase variables added successfully!\ -ForegroundColor Green } else { Write-Host \Firebase variables already exist in .env\ -ForegroundColor Yellow }
