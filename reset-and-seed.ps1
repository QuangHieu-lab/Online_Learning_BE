# PowerShell script to reset database and seed fresh data
# Run: .\reset-and-seed.ps1

Write-Host "🔄 Resetting database and seeding fresh data..." -ForegroundColor Cyan
Write-Host ""

try {
    # Step 1: Generate Prisma Client
    Write-Host "📦 Step 1: Generating Prisma Client..." -ForegroundColor Yellow
    npm run prisma:generate
    Write-Host "✅ Prisma Client generated" -ForegroundColor Green
    Write-Host ""

    # Step 2: Reset database (drops all data and reruns migrations)
    Write-Host "🗑️  Step 2: Resetting database (this will delete all data)..." -ForegroundColor Yellow
    Write-Host "⚠️  This will delete ALL data in the database!" -ForegroundColor Red
    $confirm = Read-Host "Type 'yes' to continue"
    if ($confirm -ne 'yes') {
        Write-Host "❌ Cancelled" -ForegroundColor Red
        exit 1
    }
    
    npx prisma migrate reset --force
    Write-Host "✅ Database reset complete" -ForegroundColor Green
    Write-Host ""

    # Step 3: Seed database
    Write-Host "🌱 Step 3: Seeding database..." -ForegroundColor Yellow
    npm run prisma:seed
    Write-Host "✅ Database seeded successfully" -ForegroundColor Green
    Write-Host ""

    Write-Host "✨ Database reset and seed completed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📝 Test accounts:" -ForegroundColor Cyan
    Write-Host "   Admin: admin@example.com / password123"
    Write-Host "   Lecturer: lecturer@example.com / password123"
    Write-Host "   Student: student@example.com / password123"
    Write-Host "   Paid Student: paidstudent@example.com / password123"
    Write-Host ""
    Write-Host "💳 Test Payment:" -ForegroundColor Cyan
    Write-Host "   Course: Advanced English Course - IELTS Preparation (500,000 VND)"
    Write-Host "   Login as: student@example.com"
    Write-Host "   Enroll in the paid course to test payment flow"
    Write-Host ""

} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    exit 1
}
