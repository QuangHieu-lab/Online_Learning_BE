# Script to update Gemini API Key in .env file
# Usage: .\update_gemini_key.ps1

$envPath = Join-Path $PSScriptRoot ".env"

if (-not (Test-Path $envPath)) {
    Write-Host "❌ File .env not found!" -ForegroundColor Red
    exit 1
}

Write-Host "🤖 Gemini API Key Updater" -ForegroundColor Cyan
Write-Host ""

# Read current .env content
$envContent = Get-Content $envPath -Raw

# Prompt for API key
$apiKey = Read-Host "Enter your Gemini API Key (or press Enter to use default)"

if ([string]::IsNullOrWhiteSpace($apiKey)) {
    # Use the API key from the image description
    $apiKey = "AlzaSyCEydTY-bhgOrP_Zc_d2Ycyrpcl5-0wNaw"
    Write-Host "Using API key from image..." -ForegroundColor Yellow
}

# Replace GEMINI_API_KEY line
$pattern = 'GEMINI_API_KEY="[^"]*"'
$replacement = "GEMINI_API_KEY=`"$apiKey`""

if ($envContent -match $pattern) {
    $envContent = $envContent -replace $pattern, $replacement
    Set-Content -Path $envPath -Value $envContent -NoNewline
    Write-Host "✅ API Key updated successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Please restart your backend server for changes to take effect." -ForegroundColor Yellow
} else {
    Write-Host "❌ Could not find GEMINI_API_KEY in .env file" -ForegroundColor Red
}
