# Health Check Script - Verify both services are running
Write-Host "AML Detection System - Health Check" -ForegroundColor Cyan
Write-Host ("=" * 50) -ForegroundColor Gray

# Check Backend
Write-Host "`nChecking Backend (http://localhost:8000)..." -ForegroundColor Yellow
try {
    $backendResponse = Invoke-WebRequest -Uri "http://localhost:8000/health" -TimeoutSec 5 -ErrorAction Stop
    if ($backendResponse.StatusCode -eq 200) {
        Write-Host "[OK] Backend is UP and healthy" -ForegroundColor Green
        Write-Host "   Status: $($backendResponse.StatusCode)"
        Write-Host "   Response: $($backendResponse.Content)"
    }
} catch {
    Write-Host "[ERROR] Backend is DOWN" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)"
    $backendHealthy = $false
}

# Check Frontend
Write-Host "`nChecking Frontend (http://localhost:5173)..." -ForegroundColor Yellow
try {
    $frontendResponse = Invoke-WebRequest -Uri "http://localhost:5173" -TimeoutSec 5 -ErrorAction Stop
    if ($frontendResponse.StatusCode -eq 200) {
        Write-Host "[OK] Frontend is UP and serving" -ForegroundColor Green
        Write-Host "   Status: $($frontendResponse.StatusCode)"
    }
} catch {
    Write-Host "[ERROR] Frontend is DOWN" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)"
    $frontendHealthy = $false
}

# Check API Docs
Write-Host "`nChecking API Documentation (http://localhost:8000/docs)..." -ForegroundColor Yellow
try {
    $docsResponse = Invoke-WebRequest -Uri "http://localhost:8000/docs" -TimeoutSec 5 -ErrorAction Stop
    if ($docsResponse.StatusCode -eq 200) {
        Write-Host "[OK] API Docs are accessible" -ForegroundColor Green
    }
} catch {
    Write-Host "[WARN] API Docs unavailable (backend may be down)" -ForegroundColor Yellow
}

# Summary
Write-Host "`n" -NoNewline
Write-Host ("=" * 50) -ForegroundColor Gray
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "   Frontend:  http://localhost:5173"
Write-Host "   Backend:   http://localhost:8000"
Write-Host "   API Docs:  http://localhost:8000/docs"
Write-Host "`nIf services are down, run: .\start-dev.ps1"
Write-Host ("=" * 50) -ForegroundColor Gray
