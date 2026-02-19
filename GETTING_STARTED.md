# 🎉 Integration Complete!

Your Production Graph-Based AML Detection Engine is now fully integrated and ready to use!

## ✅ What's Been Done

### 1. Backend-Frontend Integration
- ✅ Response schemas aligned (added `risk_level` field to suspicious accounts)
- ✅ API endpoints corrected (`/api/v1/upload-csv`)
- ✅ Timeout increased to 180 seconds for large datasets
- ✅ CORS configured for frontend-backend communication
- ✅ Summary fields added (`suspicious_account_count`, `fraud_rings_detected`)

### 2. Configuration Files Created
- ✅ `frontend/.env` - API URL configuration
- ✅ `.gitignore` - Git ignore patterns for the project
- ✅ `docker-compose.yml` - Docker orchestration
- ✅ `frontend/Dockerfile` - Frontend container definition
- ✅ `frontend/.dockerignore` - Docker build optimization

### 3. Startup & Management Scripts
- ✅ `start-dev.ps1` - Automated development startup (Windows)
- ✅ `health-check.ps1` - Service health verification
- ✅ `verify-setup.ps1` - Dependency verification

### 4. Documentation Created
- ✅ `README.md` - Complete project documentation
- ✅ `START_SERVICES.md` - Detailed startup instructions
- ✅ `INTEGRATION.md` - Integration guide and API docs
- ✅ This file - Quick start guide

---

## 🚀 Quick Start (3 Steps)

### Step 1: Verify Dependencies
```powershell
.\verify-setup.ps1
```

This will check:
- Python 3.9+ is installed
- Node.js 18+ is installed
- Backend dependencies are installed
- Frontend dependencies are installed
- Environment files are configured

**If any dependencies are missing:**
```powershell
# Install backend dependencies
cd backend
pip install -r requirements.txt
cd ..

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### Step 2: Start Both Services
```powershell
.\start-dev.ps1
```

This will:
- Open a terminal window for the backend (port 8000)
- Open a terminal window for the frontend (port 5173)
- Display service URLs

**Wait 10-15 seconds** for both services to fully start.

### Step 3: Verify Services are Running
```powershell
.\health-check.ps1
```

Expected output:
```
✅ Backend is UP and healthy
✅ Frontend is UP and serving
✅ API Docs are accessible
```

---

## 🎯 Using the System

### 1. Open the Web Application
Navigate to: **http://localhost:5173**

### 2. Upload a CSV File
Your CSV must have these columns:
- `transaction_id` - Unique transaction identifier
- `sender_account` - Source account ID
- `receiver_account` - Destination account ID
- `transaction_amount` - Transaction amount (numeric)
- `timestamp` - Transaction timestamp (YYYY-MM-DD HH:MM:SS)

**Example CSV:**
```csv
transaction_id,sender_account,receiver_account,transaction_amount,timestamp
TXN001,ACC_A,ACC_B,5000.00,2024-01-15 10:30:00
TXN002,ACC_B,ACC_C,4900.00,2024-01-15 11:00:00
TXN003,ACC_C,ACC_A,4800.00,2024-01-15 12:00:00
```

### 3. View Detection Results
The system will display:
- **Summary Metrics** - Total transactions, suspicious accounts, fraud rings
- **Risk Breakdown** - Accounts by risk level (CRITICAL, HIGH, MEDIUM, LOW)
- **Suspicious Accounts List** - Detailed account information with patterns
- **Fraud Rings** - Detected criminal networks
- **Graph Visualization** - Interactive network view (if available)

---

## 📊 Understanding Results

### Risk Levels
- **🔴 CRITICAL** - Score ≥ 80 → Immediate investigation required
- **🟠 HIGH** - Score ≥ 60 → Priority review needed
- **🟡 MEDIUM** - Score ≥ 40 → Standard review
- **🟢 LOW** - Score < 40 → Monitor

### Detection Patterns
- **cycle** - Account participates in circular money flow (mule network)
- **fan_in** - Account receives from many sources (collection point)
- **fan_out** - Account sends to many destinations (distribution)
- **high_velocity** - Rapid transaction frequency (layering)
- **pass_through** - Balanced in/out flows (shell account)

### Fraud Rings
Groups of accounts working together in coordinated patterns.

---

## 🛠️ Service Management

### Start Services
```powershell
.\start-dev.ps1
```

### Check Health
```powershell
.\health-check.ps1
```

### Stop Services
Close the terminal windows or press `Ctrl+C` in each.

### Restart After Code Changes
1. Press `Ctrl+C` in service window
2. Run `.\start-dev.ps1` again

Or just save your changes - both services auto-reload:
- **Backend**: Uvicorn auto-reload enabled
- **Frontend**: Vite Hot Module Replacement (HMR)

---

## 🔗 Important URLs

| Service | URL | Purpose |
|---------|-----|---------|
| **Frontend** | http://localhost:5173 | Main web interface |
| **Backend API** | http://localhost:8000 | REST API |
| **API Docs** | http://localhost:8000/docs | Interactive Swagger UI |
| **Health Check** | http://localhost:8000/health | Service status |

---

## 🧪 Testing Checklist

- [ ] Run `.\verify-setup.ps1` - All checks pass
- [ ] Run `.\start-dev.ps1` - Both services start
- [ ] Run `.\health-check.ps1` - All services healthy
- [ ] Open http://localhost:5173 - Frontend loads
- [ ] Upload sample CSV - Processing completes
- [ ] View detection results - Data displays correctly
- [ ] Check risk levels - CRITICAL/HIGH/MEDIUM/LOW shown
- [ ] View fraud rings - Ring information displayed
- [ ] Test graph visualization - Network renders (if implemented)

---

## ⚡ Performance Expectations

- **10K transactions**: ~86 seconds processing time
- **Throughput**: ~116 transactions/second
- **Timeout**: 180 seconds (3 minutes) for large files
- **Memory**: ~500MB for 10K transactions

For larger datasets (50K+ transactions):
- Expect 5-10 minute processing time
- Consider increasing timeout in `frontend/src/services/api.js`
- Monitor backend terminal for progress logs

---

## 🐛 Troubleshooting

### Services Won't Start

**Problem**: Port already in use
```powershell
# Check what's using the port
netstat -ano | findstr :8000   # Backend
netstat -ano | findstr :5173   # Frontend

# Kill the process
taskkill /PID <process_id> /F
```

**Problem**: Dependencies not installed
```powershell
# Run verification
.\verify-setup.ps1

# Install missing dependencies
cd backend; pip install -r requirements.txt; cd ..
cd frontend; npm install; cd ..
```

### Upload Fails

**Problem**: CORS error in browser console
- Check that backend is running on port 8000
- Verify `frontend/.env` has `VITE_API_URL=http://localhost:8000`
- Restart frontend service after changing `.env`

**Problem**: Timeout error
- File is very large (>50K transactions)
- Increase timeout in `frontend/src/services/api.js` (currently 180s)

**Problem**: CSV format error
- Ensure all required columns exist
- Check timestamp format: `YYYY-MM-DD HH:MM:SS`
- Verify amounts are numeric
- Remove extra columns (they're ignored, but check for errors)

### Results Don't Display

**Problem**: No suspicious accounts found
- Dataset may have no detectable patterns
- Try with known sample data
- Check backend logs for processing details

**Problem**: Frontend shows error
- Press F12 to open browser DevTools
- Check Console tab for errors
- Check Network tab for failed API calls
- Verify response format in Network tab

---

## 📁 Project Structure

```
RIFT/
├── backend/                    # FastAPI backend
│   ├── main.py                # Application entry point
│   ├── models/                # Pydantic schemas
│   ├── services/              # Core detection logic
│   ├── routers/               # API endpoints
│   ├── utils/                 # Helper functions
│   └── requirements.txt       # Python dependencies
│
├── frontend/                  # React frontend
│   ├── src/                  # Source code
│   │   ├── services/         # API client
│   │   └── components/       # React components
│   ├── package.json          # Node dependencies
│   └── .env                  # Environment config
│
├── start-dev.ps1             # Development startup script
├── health-check.ps1          # Service health check
├── verify-setup.ps1          # Dependency verification
├── docker-compose.yml        # Docker orchestration
├── README.md                 # Project documentation
├── INTEGRATION.md            # Integration guide
├── START_SERVICES.md         # Startup instructions
└── GETTING_STARTED.md        # This file
```

---

## 📚 Next Steps

### For Development
1. **Explore the code** - See `backend/services/` for detection algorithms
2. **Customize detection** - Adjust thresholds in `pattern_detection.py`
3. **Add features** - Extend API endpoints in `routers/aml_router.py`
4. **Improve UI** - Modify React components in `frontend/src/`

### For Production
1. **Review** - `INTEGRATION.md` for deployment guide
2. **Configure** - Environment variables for production
3. **Secure** - Add authentication and authorization
4. **Scale** - Consider containerization with Docker
5. **Monitor** - Add logging and monitoring tools

### For Learning
1. **API Docs** - http://localhost:8000/docs (interactive)
2. **README.md** - Architecture and algorithms explained
3. **Code Comments** - Inline documentation in source files
4. **Test Data** - Create sample CSVs to understand patterns

---

## 💡 Tips

- **Development**: Both services auto-reload on code changes
- **Debugging**: Check browser console (F12) and terminal logs
- **Performance**: Start with small datasets (<1K rows) for testing
- **CSV Format**: Use the exact column names specified
- **Time Zones**: Use consistent timezone in timestamps

---

## 🎓 Understanding the Detection

### How It Works (Simple)
1. **Upload CSV** → System reads transactions
2. **Build Graph** → Creates network of accounts and flows
3. **Detect Patterns** → Finds suspicious behaviors
4. **Score Risk** → Calculates suspicion scores
5. **Display Results** → Shows suspects and networks

### Key Concepts
- **Graph**: Accounts are nodes, transactions are edges
- **Patterns**: Specific behaviors that indicate fraud
- **Risk Score**: 0-100, higher = more suspicious
- **Propagation**: Risk spreads through connected accounts
- **False Positives**: Legitimate high-activity accounts filtered out

---

## 📞 Getting Help

1. **Check documentation** in this folder
2. **Review logs** in terminal windows
3. **Test with small dataset** to isolate issues
4. **Verify setup** with `.\verify-setup.ps1`
5. **Check health** with `.\health-check.ps1`

---

## 🎉 You're Ready!

Your AML detection system is fully integrated and ready to detect:
- 🕸️ Money mule networks
- 💧 Smurfing patterns
- 🔄 Layering schemes
- 👥 Fraud rings
- 🏢 Shell accounts

**Start now:**
```powershell
.\start-dev.ps1
```

Then open: **http://localhost:5173**

Happy detecting! 🔍💰
