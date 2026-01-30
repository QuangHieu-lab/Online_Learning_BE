# Script to migrate database and seed data
Write-Host "🔄 Running database migration..." -ForegroundColor Cyan
npm run prisma:generate
Write-Host ""
Write-Host "⚠️  Please run this command manually:" -ForegroundColor Yellow
Write-Host "   npm run prisma:migrate" -ForegroundColor White
Write-Host ""
Write-Host "When prompted, enter migration name: update_roles" -ForegroundColor Yellow
Write-Host ""
Write-Host "After migration, run seed:" -ForegroundColor Cyan
Write-Host "   npm run prisma:seed" -ForegroundColor White
