# AML Detection System - Development Startup Script
Write-Host "Starting AML Detection System..." -ForegroundColor Green

# Check if we're in the right directory
if (-not (Test-Path "backend") -or -not (Test-Path "frontend")) {
    Write-Host "[ERROR] Must run from RIFT root directory" -ForegroundColor Red
    Write-Host "Current directory: $(Get-Location)" -ForegroundColor Yellow
    exit 1
}

# Start backend in new PowerShell window
Write-Host "`nStarting Backend (FastAPI) on http://localhost:8000..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\backend'; Write-Host 'Backend Starting...' -ForegroundColor Green; python main.py"

# Wait for backend to initialize
Write-Host "Waiting for backend to start (3 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Start frontend in new PowerShell window
Write-Host "`nStarting Frontend (React) on http://localhost:5173..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\frontend'; Write-Host 'Frontend Starting...' -ForegroundColor Green; npm run dev"

# Display success message
Write-Host "`nBoth services are starting in separate windows!" -ForegroundColor Green
Write-Host "`nService URLs:" -ForegroundColor White
Write-Host "   Frontend:  " -NoNewline; Write-Host "http://localhost:5173" -ForegroundColor Yellow
Write-Host "   Backend:   " -NoNewline; Write-Host "http://localhost:8000" -ForegroundColor Yellow
Write-Host "   API Docs:  " -NoNewline; Write-Host "http://localhost:8000/docs" -ForegroundColor Yellow
Write-Host "`nTips:" -ForegroundColor White
Write-Host "   - Each service runs in its own window"
Write-Host "   - Press Ctrl+C in each window to stop"
Write-Host "   - Wait 5-10 seconds for services to fully start"
Write-Host "   - View logs in each service window"
Write-Host "`nHappy coding!" -ForegroundColor Magenta
