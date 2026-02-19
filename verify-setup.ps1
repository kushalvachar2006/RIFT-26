# Dependency Verification Script
Write-Host "Verifying AML System Dependencies" -ForegroundColor Cyan
Write-Host ("=" * 60) -ForegroundColor Gray

$allGood = $true

# Check Python
Write-Host "`nChecking Python..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>&1
    if ($pythonVersion -match "Python (\d+)\.(\d+)") {
        $major = [int]$Matches[1]
        $minor = [int]$Matches[2]
        if ($major -ge 3 -and $minor -ge 9) {
            Write-Host "[OK] Python $pythonVersion installed" -ForegroundColor Green
        } else {
            Write-Host "[WARN] Python version too old: $pythonVersion (need 3.9+)" -ForegroundColor Yellow
            $allGood = $false
        }
    }
} catch {
    Write-Host "[ERROR] Python not found. Install Python 3.9+ from python.org" -ForegroundColor Red
    $allGood = $false
}

# Check Node.js
Write-Host "`nChecking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version 2>&1
    if ($nodeVersion -match "v(\d+)\.") {
        $major = [int]$Matches[1]
        if ($major -ge 18) {
            Write-Host "[OK] Node.js $nodeVersion installed" -ForegroundColor Green
        } else {
            Write-Host "[WARN] Node.js version too old: $nodeVersion (need v18+)" -ForegroundColor Yellow
            $allGood = $false
        }
    }
} catch {
    Write-Host "[ERROR] Node.js not found. Install from nodejs.org" -ForegroundColor Red
    $allGood = $false
}

# Check npm
Write-Host "`nChecking npm..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version 2>&1
    Write-Host "[OK] npm $npmVersion installed" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] npm not found (should come with Node.js)" -ForegroundColor Red
    $allGood = $false
}

# Check Backend Dependencies
Write-Host "`nChecking Backend Dependencies..." -ForegroundColor Yellow
if (Test-Path "backend/requirements.txt") {
    Write-Host "[OK] backend/requirements.txt found" -ForegroundColor Green
    
    # Try to import key modules
    $modules = @("fastapi", "pandas", "networkx", "numpy", "uvicorn")
    foreach ($module in $modules) {
        $installed = python -c "import $module; print('OK')" 2>&1
        if ($installed -like "*OK*") {
            Write-Host "   [OK] $module installed" -ForegroundColor Green
        } else {
            Write-Host "   [MISSING] $module not installed" -ForegroundColor Red
            $needsBackendInstall = $true
            $allGood = $false
        }
    }
    
    if ($needsBackendInstall) {
        Write-Host "`n   [TIP] Install with: cd backend; pip install -r requirements.txt" -ForegroundColor Yellow
    }
} else {
    Write-Host "[WARN] backend/requirements.txt not found" -ForegroundColor Yellow
}

# Check Frontend Dependencies
Write-Host "`nChecking Frontend Dependencies..." -ForegroundColor Yellow
if (Test-Path "frontend/package.json") {
    Write-Host "[OK] frontend/package.json found" -ForegroundColor Green
    
    if (Test-Path "frontend/node_modules") {
        Write-Host "   [OK] node_modules folder exists" -ForegroundColor Green
    } else {
        Write-Host "   [MISSING] node_modules not installed" -ForegroundColor Red
        Write-Host "   [TIP] Install with: cd frontend; npm install" -ForegroundColor Yellow
        $allGood = $false
    }
} else {
    Write-Host "[WARN] frontend/package.json not found" -ForegroundColor Yellow
}

# Check Environment Files
Write-Host "`nChecking Environment Configuration..." -ForegroundColor Yellow
if (Test-Path "frontend/.env") {
    Write-Host "[OK] frontend/.env found" -ForegroundColor Green
    $envContent = Get-Content "frontend/.env" -Raw
    if ($envContent -match "VITE_API_URL") {
        Write-Host "   [OK] VITE_API_URL is configured" -ForegroundColor Green
    }
} else {
    Write-Host "[WARN] frontend/.env not found" -ForegroundColor Yellow
    Write-Host "   [TIP] Create from frontend/.env.example" -ForegroundColor Yellow
    $allGood = $false
}

# Check Directory Structure
Write-Host "`nChecking Project Structure..." -ForegroundColor Yellow
$requiredDirs = @("backend", "frontend")
foreach ($dir in $requiredDirs) {
    if (Test-Path $dir) {
        Write-Host "[OK] $dir/ exists" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] $dir/ not found" -ForegroundColor Red
        $allGood = $false
    }
}

# Check Key Files
$requiredFiles = @(
    "backend/main.py",
    "frontend/package.json",
    "start-dev.ps1"
)
foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Host "[OK] $file exists" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] $file not found" -ForegroundColor Red
        $allGood = $false
    }
}

# Final Summary
Write-Host "`n" -NoNewline
Write-Host ("=" * 60) -ForegroundColor Gray
if ($allGood) {
    Write-Host "All dependencies verified! Ready to start." -ForegroundColor Green
    Write-Host "`n[NEXT STEPS]"
    Write-Host "   1. Run: .\start-dev.ps1"
    Write-Host "   2. Wait for both services to start"
    Write-Host "   3. Open: http://localhost:5173"
} else {
    Write-Host "Some dependencies are missing. Please install them first." -ForegroundColor Yellow
    Write-Host "`n[QUICK INSTALL]"
    Write-Host "   Backend:  cd backend; pip install -r requirements.txt"
    Write-Host "   Frontend: cd frontend; npm install"
}
Write-Host ("=" * 60) -ForegroundColor Gray
