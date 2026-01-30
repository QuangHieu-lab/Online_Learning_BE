# PowerShell script to create MySQL database
# This script will create the database using MySQL command line

Write-Host "🚀 Creating MySQL Database..." -ForegroundColor Cyan
Write-Host ""

$dbName = "online_learning"
$dbUser = "root"
$dbPassword = "Luncantat1@"
$dbHost = "localhost"
$dbPort = "3306"

Write-Host "Database: $dbName" -ForegroundColor Yellow
Write-Host "User: $dbUser" -ForegroundColor Yellow
Write-Host "Host: ${dbHost}:${dbPort}" -ForegroundColor Yellow
Write-Host ""

# Check if MySQL is available
$mysqlPath = Get-Command mysql -ErrorAction SilentlyContinue
if (-not $mysqlPath) {
    Write-Host "❌ MySQL command not found in PATH" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please create the database manually:" -ForegroundColor Yellow
    Write-Host "1. Open MySQL Command Line or MySQL Workbench" -ForegroundColor White
    Write-Host "2. Run this SQL command:" -ForegroundColor White
    Write-Host "   CREATE DATABASE online_learning CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" -ForegroundColor Green
    Write-Host ""
    Write-Host "Or run the SQL file:" -ForegroundColor Yellow
    Write-Host "   mysql -u root -p < create_database.sql" -ForegroundColor White
    exit 1
}

# Create database using MySQL command
$sqlCommand = "CREATE DATABASE IF NOT EXISTS ``$dbName`` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

try {
    $env:MYSQL_PWD = $dbPassword
    $sqlCommand | & mysql -u $dbUser -h $dbHost -P $dbPort 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Database '$dbName' created successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Cyan
        Write-Host "1. Run: npm run prisma:generate" -ForegroundColor White
        Write-Host "2. Run: npm run prisma:migrate" -ForegroundColor White
    } else {
        Write-Host "❌ Failed to create database. Please check MySQL connection." -ForegroundColor Red
        Write-Host ""
        Write-Host "Try creating manually:" -ForegroundColor Yellow
        Write-Host "   mysql -u root -p" -ForegroundColor White
        Write-Host "   CREATE DATABASE online_learning CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please create the database manually using MySQL Workbench or Command Line" -ForegroundColor Yellow
}
