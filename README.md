# 🔍 Production Graph-Based AML Detection Engine

A production-grade Anti-Money Laundering (AML) detection system using graph intelligence, temporal analysis, and risk propagation to identify sophisticated financial crime patterns.

![System Architecture](https://img.shields.io/badge/Architecture-Microservices-blue)
![Backend](https://img.shields.io/badge/Backend-FastAPI-green)
![Frontend](https://img.shields.io/badge/Frontend-React-cyan)
![Graph Engine](https://img.shields.io/badge/Graph-NetworkX-orange)

## 🎯 Key Features

### Detection Capabilities
- **🕸️ Mule Network Detection** - Identifies complex money mule networks using graph cycles
- **💧 Smurfing Detection** - Detects structured transactions with fan-in/fan-out patterns
- **🔄 Layering Detection** - Finds rapid transaction chains and pass-through accounts
- **👥 Fraud Ring Detection** - Uncovers coordinated fraud groups
- **🏢 Shell Account Detection** - Identifies suspicious pass-through entities

### Intelligence Features
- **⏰ Temporal Analysis** - Time-decay weighted edges for recency ranking
- **📊 Risk Propagation** - Personalized PageRank for network-wide risk scoring
- **🎯 False Positive Reduction** - Smart filtering for merchants, payroll, high-degree hubs
- **⚡ Performance Optimized** - Processes 10K+ transactions in <90 seconds
- **📈 Real-time Visualization** - Interactive graph visualization with Cytoscape

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    React Frontend                        │
│  (Vite, Tailwind, Cytoscape, Recharts, Zustand)        │
│                                                          │
│  - CSV Upload Interface                                 │
│  - Detection Results Dashboard                          │
│  - Interactive Graph Visualization                      │
│  - Risk Metrics & Analytics                             │
└────────────────┬────────────────────────────────────────┘
                 │
                 │ HTTP/JSON (Port 5173 → 8000)
                 │
┌────────────────▼────────────────────────────────────────┐
│                  FastAPI Backend                         │
│        (FastAPI, Pandas, NetworkX, NumPy)               │
│                                                          │
│  ┌─────────────────────────────────────────────┐       │
│  │         AML Detection Pipeline               │       │
│  │                                              │       │
│  │  1. Data Cleaning & Validation               │       │
│  │  2. Temporal Graph Construction              │       │
│  │  3. Pattern Detection                        │       │
│  │     - Cycle Detection (Mule Networks)        │       │
│  │     - Fan Patterns (Smurfing)                │       │
│  │     - Velocity Profiling (Layering)          │       │
│  │     - Pass-Through Detection (Shells)        │       │
│  │  4. Risk Scoring & Propagation               │       │
│  │  5. False Positive Filtering                 │       │
│  │  6. Response Generation                      │       │
│  └─────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- **Python 3.9+** - Backend runtime
- **Node.js 18+** - Frontend runtime
- **npm** - Package manager

### Option 1: Automated Startup (Windows)

```powershell
# Run the startup script
.\start-dev.ps1
```

This opens two terminal windows:
- Backend on http://localhost:8000
- Frontend on http://localhost:5173

### Option 2: Manual Startup

**Terminal 1 - Backend:**
```bash
cd backend
pip install -r requirements.txt
python main.py
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm install
npm run dev
```

### Option 3: Docker Compose

```bash
docker-compose up
```

## 📚 Documentation

- **[START_SERVICES.md](START_SERVICES.md)** - Detailed startup instructions for all platforms
- **[INTEGRATION.md](INTEGRATION.md)** - Complete integration guide and API documentation
- **[backend/README.md](backend/README.md)** - Backend architecture and algorithms
- **[frontend/README.md](frontend/README.md)** - Frontend components and state management

## 🔗 Service URLs

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:5173 | Main web application |
| **Backend API** | http://localhost:8000 | REST API endpoints |
| **API Docs** | http://localhost:8000/docs | Interactive Swagger docs |
| **Health Check** | http://localhost:8000/health | Service status |

## 🧪 Testing the System

1. **Start both services** (see Quick Start above)
2. **Open frontend** at http://localhost:5173
3. **Upload CSV file** with transaction data
4. **View results** in the dashboard

### Sample CSV Format

```csv
transaction_id,sender_account,receiver_account,transaction_amount,timestamp
TXN001,ACC_A,ACC_B,5000.00,2024-01-15 10:30:00
TXN002,ACC_B,ACC_C,4900.00,2024-01-15 11:00:00
```

**Required columns:**
- `transaction_id` - Unique transaction identifier
- `sender_account` - Source account ID
- `receiver_account` - Destination account ID
- `transaction_amount` - Transaction amount (numeric)
- `timestamp` - Transaction timestamp (YYYY-MM-DD HH:MM:SS)

## 📊 Detection Algorithms

### 1. Cycle Detection (Mule Networks)
- Identifies circular transaction patterns
- Optimized to check top 100 nodes by degree
- Max 10 cycles per node, early exit after 50 cycles
- Detects structured money laundering networks

### 2. Fan Pattern Detection (Smurfing)
- **Fan-In**: Multiple sources → Single destination (Collection)
- **Fan-Out**: Single source → Multiple destinations (Distribution)
- 72-hour time window analysis
- Identifies structured transactions to avoid reporting thresholds

### 3. Velocity Profiling (Layering)
- Analyzes transaction frequency and speed
- Detects rapid movement of funds
- High-velocity accounts flagged for layering risk

### 4. Pass-Through Detection (Shell Accounts)
- Identifies accounts with balanced in/out flows
- Flags accounts that act as intermediaries
- Shell company and nominee account detection

### 5. Risk Propagation
- Personalized PageRank with seed scores
- Network-wide risk scoring
- Damping factor 0.85, max 100 iterations
- Propagates suspicion across connected accounts

## 🎯 Risk Scoring

Accounts are scored based on weighted factors:

| Factor | Weight | Description |
|--------|--------|-------------|
| Cycle Participation | 25% | Involvement in circular patterns |
| Velocity Risk | 20% | Transaction frequency/speed |
| Fan Pattern | 20% | Structured distribution/collection |
| Pass-Through | 20% | Intermediary behavior |
| Propagated Risk | 15% | Network-wide suspicion |

**Risk Levels:**
- **CRITICAL** - Score ≥ 80 (Immediate investigation)
- **HIGH** - Score ≥ 60 (Priority review)
- **MEDIUM** - Score ≥ 40 (Standard review)
- **LOW** - Score < 40 (Monitor)

## ⚡ Performance

- **Throughput**: ~116 transactions/second
- **10K transactions**: ~86 seconds
- **Graph Construction**: O(E) where E = edges
- **Cycle Detection**: Optimized with degree-based pruning
- **Memory**: ~500MB for 10K transactions

## 🛠️ Tech Stack

### Backend
- **FastAPI 0.104.1** - Modern async web framework
- **NetworkX 3.2.1** - Graph algorithms and analysis
- **Pandas 2.1.3** - Data manipulation and CSV processing
- **NumPy 1.26.2** - Numerical computations
- **Uvicorn** - ASGI server

### Frontend
- **React 18.2.0** - UI framework
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first styling
- **Cytoscape 3.28.1** - Graph visualization
- **Axios** - HTTP client
- **Zustand** - State management
- **Recharts** - Data visualization

## 🔒 API Endpoints

### POST `/api/v1/upload-csv`
Upload CSV file for AML detection.

**Request:**
- Content-Type: `multipart/form-data`
- Body: `file` (CSV file)

**Response:**
```json
{
  "status": "success",
  "summary": {
    "total_transactions": 9981,
    "total_accounts": 532,
    "suspicious_accounts": 321,
    "suspicious_account_count": 321,
    "fraud_rings_detected": 12,
    "processing_time_seconds": 85.87
  },
  "suspicious_accounts": [
    {
      "account_id": "ACC_123",
      "suspicion_score": 85.5,
      "risk_level": "CRITICAL",
      "patterns": ["cycle", "high_velocity", "fan_in"]
    }
  ],
  "fraud_rings": [
    {
      "ring_id": "RING_001",
      "accounts": ["ACC_123", "ACC_456"],
      "transaction_count": 15,
      "total_amount": 150000.00,
      "pattern_type": "cycle"
    }
  ]
}
```

### GET `/health`
Health check endpoint.

## 🐳 Docker Deployment

### Build Images
```bash
docker-compose build
```

### Start Services
```bash
docker-compose up -d
```

### View Logs
```bash
docker-compose logs -f
```

### Stop Services
```bash
docker-compose down
```

## 🧹 Development Workflow

1. **Make changes** to backend or frontend code
2. **Auto-reload** - Changes reflect immediately
   - Backend: Uvicorn auto-reload
   - Frontend: Vite HMR (Hot Module Replacement)
3. **Test** in browser at http://localhost:5173
4. **View logs** in terminal windows
5. **Debug** with browser DevTools + backend logs

## 🐛 Troubleshooting

### Port Already in Use

**Backend (8000):**
```powershell
# Windows
netstat -ano | findstr :8000
taskkill /PID <process_id> /F

# Linux/Mac
lsof -ti:8000 | xargs kill -9
```

**Frontend (5173):**
```powershell
# Windows
netstat -ano | findstr :5173
taskkill /PID <process_id> /F

# Linux/Mac
lsof -ti:5173 | xargs kill -9
```

### CORS Errors
- Ensure backend CORS allows frontend origin
- Check `.env` file has correct `VITE_API_URL`
- Verify both services are running

### 502 Bad Gateway
- Backend not started or crashed
- Check backend logs for errors
- Verify port 8000 is accessible

### Slow Performance
- Reduce dataset size for testing
- Check cycle detection optimization settings
- Monitor memory usage
- Increase timeout in frontend (currently 180s)

## 📝 License

This is a production-grade AML detection system built for educational and legitimate compliance purposes.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📧 Support

For issues, questions, or feature requests, please check the documentation or create an issue.

---

**Built with ❤️ for financial crime prevention**
