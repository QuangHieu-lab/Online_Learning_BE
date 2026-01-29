# PowerShell script for Windows to setup database
# Run this script: .\setup.ps1

Write-Host "🚀 Online Learning Platform - Database Setup" -ForegroundColor Cyan
Write-Host ""

# Check if .env exists
if (Test-Path ".env") {
    $overwrite = Read-Host "File .env already exists. Overwrite? (y/n)"
    if ($overwrite -ne "y") {
        Write-Host "Setup cancelled." -ForegroundColor Yellow
        exit
    }
}

Write-Host "`n📝 Please provide MySQL connection details:`n" -ForegroundColor Cyan

$dbUser = Read-Host "MySQL Username (default: root)"
if ([string]::IsNullOrWhiteSpace($dbUser)) { $dbUser = "root" }

$dbPassword = Read-Host "MySQL Password" -AsSecureString
$dbPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($dbPassword)
)

$dbHost = Read-Host "MySQL Host (default: localhost)"
if ([string]::IsNullOrWhiteSpace($dbHost)) { $dbHost = "localhost" }

$dbPort = Read-Host "MySQL Port (default: 3306)"
if ([string]::IsNullOrWhiteSpace($dbPort)) { $dbPort = "3306" }

$dbName = Read-Host "Database Name (default: online_learning)"
if ([string]::IsNullOrWhiteSpace($dbName)) { $dbName = "online_learning" }

$jwtSecret = Read-Host "`n🔐 JWT Secret (press Enter for random)"
if ([string]::IsNullOrWhiteSpace($jwtSecret)) {
    $jwtSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
}

$geminiKey = Read-Host "🤖 Gemini API Key (optional, press Enter to skip)"
if ([string]::IsNullOrWhiteSpace($geminiKey)) { $geminiKey = "" }

# Create .env file
$envContent = @"
# Database Connection
DATABASE_URL="mysql://$dbUser`:$dbPasswordPlain@$dbHost`:$dbPort/$dbName"

# JWT Secret Key
JWT_SECRET="$jwtSecret"

# Gemini AI API Key
GEMINI_API_KEY="$geminiKey"

# Server Port
PORT=5000

# Environment
NODE_ENV=development

# Frontend URL
FRONTEND_URL=http://localhost:3000
"@

$envContent | Out-File -FilePath ".env" -Encoding utf8
Write-Host "`n✅ Created .env file" -ForegroundColor Green

# Create database SQL script
$sqlContent = @"
-- Create Database
CREATE DATABASE IF NOT EXISTS ``$dbName`` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Use the database
USE ``$dbName``;

-- Note: Tables will be created by Prisma migrations
"@

$sqlContent | Out-File -FilePath "create_database.sql" -Encoding utf8
Write-Host "✅ Created create_database.sql file" -ForegroundColor Green

Write-Host "`n📋 Next steps:" -ForegroundColor Cyan
Write-Host "1. Create the database in MySQL:" -ForegroundColor Yellow
Write-Host "   - Open MySQL Command Line or MySQL Workbench" -ForegroundColor White
Write-Host "   - Run: CREATE DATABASE $dbName CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" -ForegroundColor White
Write-Host "   - OR run the SQL file: create_database.sql" -ForegroundColor White
Write-Host "`n2. Then run these commands:" -ForegroundColor Yellow
Write-Host "   npm install" -ForegroundColor White
Write-Host "   npm run prisma:generate" -ForegroundColor White
Write-Host "   npm run prisma:migrate" -ForegroundColor White
Write-Host "`n✨ Setup complete!" -ForegroundColor Green
