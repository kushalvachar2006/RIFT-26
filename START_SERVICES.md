# 🚀 Quick Start Scripts
# These scripts help you start both frontend and backend together

## Windows PowerShell

### start-dev.ps1 - Start both services in development mode

```powershell
# start-dev.ps1
Write-Host "Starting AML Detection System..." -ForegroundColor Green

# Start backend in background
Write-Host "`nStarting Backend (FastAPI)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; python main.py" -WindowStyle Normal

# Wait for backend to start
Start-Sleep -Seconds 3

# Start frontend
Write-Host "Starting Frontend (React)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev" -WindowStyle Normal

Write-Host "`n✅ Services starting..." -ForegroundColor Green
Write-Host "Backend: http://localhost:8000" -ForegroundColor Yellow
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Yellow
Write-Host "API Docs: http://localhost:8000/docs" -ForegroundColor Yellow
```

**To use:**
```powershell
# Run this command in PowerShell
.\start-dev.ps1
```

---

## bash/Linux/Mac

### start-dev.sh - Start both services in development mode

```bash
#!/bin/bash

echo "🚀 Starting AML Detection System..."

# Start backend in background
echo ""
echo "📡 Starting Backend (FastAPI)..."
cd backend
python main.py &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Start frontend in new terminal (for macOS/Linux)
echo "🎨 Starting Frontend (React)..."
cd ../frontend

# Try to open in new terminal window based on OS
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    osascript -e 'tell app "Terminal" to do script "cd '$(pwd)' && npm run dev"'
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux - try gnome-terminal or xterm
    if command -v gnome-terminal &> /dev/null; then
        gnome-terminal -- bash -c "npm run dev; exec bash"
    else
        xterm -e "npm run dev; bash" &
    fi
fi

echo ""
echo "✅ Services started!"
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:5173"
echo "API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop the backend"
wait $BACKEND_PID
```

**To use:**
```bash
# Make executable
chmod +x start-dev.sh

# Run
./start-dev.sh
```

---

## Simple Manual Start (All Platforms)

### Terminal 1 - Backend
```bash
cd backend
python main.py
```

### Terminal 2 - Frontend
```bash
cd frontend
npm run dev
```

---

## Docker Compose (Recommended for Production-like setup)

See `docker-compose.yml` in root directory.

```bash
# Start both services with Docker
docker-compose up

# Start in background
docker-compose up -d

# Stop services
docker-compose down
```

---

## Verify Services are Running

### Check Backend
```bash
curl http://localhost:8000/health
```

### Check Frontend
Open browser: http://localhost:5173

### Check API Documentation
Open browser: http://localhost:8000/docs

---

## Stop Services

### PowerShell
Close the terminal windows or press `Ctrl+C` in each

### bash
```bash
# Find and kill backend
pkill -f "python main.py"

# Find and kill frontend
pkill -f "vite"

# Or if you started with &
kill $BACKEND_PID
```

### Docker
```bash
docker-compose down
```

---

## Troubleshooting Startup

### Port Already in Use

**Backend (Port 8000):**
```powershell
# Windows
netstat -ano | findstr :8000
taskkill /PID <process_id> /F

# Linux/Mac
lsof -ti:8000 | xargs kill -9
```

**Frontend (Port 5173):**
```powershell
# Windows
netstat -ano | findstr :5173
taskkill /PID <process_id> /F

# Linux/Mac
lsof -ti:5173 | xargs kill -9
```

### Dependencies Not Installed

**Backend:**
```bash
cd backend
pip install -r requirements.txt
```

**Frontend:**
```bash
cd frontend
npm install
```

---

## Environment Check

Run this before starting:

```bash
# Check Python
python --version  # Should be 3.9+

# Check Node
node --version    # Should be 18+

# Check npm
npm --version
```

---

## Development Workflow

1. **Start both services** (using script or manually)
2. **Make changes** to frontend or backend
3. **Hot reload** - Changes auto-reflect
   - Frontend: Instant with Vite HMR
   - Backend: Auto-reload enabled (`reload=True`)
4. **Test** in browser at http://localhost:5173
5. **View logs** in terminal windows
6. **Debug** using browser DevTools + backend logs

---

## Quick Links

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | http://localhost:5173 | Main application |
| Backend API | http://localhost:8000 | REST API |
| API Docs | http://localhost:8000/docs | Interactive API documentation |
| Health Check | http://localhost:8000/health | Service status |

---

*Choose the method that works best for your development environment!*
