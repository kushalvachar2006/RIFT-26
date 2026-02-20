# 🔍 RIFT 2026 - Graph-Based Financial Crime Detection Engine

**RIFT 2026 Hackathon Submission** | Graph Theory / Financial Crime Detection Track

A production-grade Anti-Money Laundering (AML) detection system using graph intelligence, temporal analysis, and risk propagation to identify sophisticated financial crime networks and money laundering patterns.

## 🌐 Live Demo

**🚀 Frontend**: [https://rift-aml-frontend.onrender.com](https://rift-aml-frontend.onrender.com)
**🔧 Backend API**: [https://rift-26-api.onrender.com](https://rift-26-api.onrender.com)
**📖 API Docs**: [https://rift-26-api.onrender.com/docs](https://rift-26-api.onrender.com/docs)
**💚 Health Check**: [https://rift-26-api.onrender.com/health](https://rift-26-api.onrender.com/health)

*Note: Application is publicly accessible with CSV upload functionality on homepage.*

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
| **Frontend** | https://rift-aml-frontend.onrender.com | Main web application |
| **Backend API** | https://rift-26-api.onrender.com | REST API endpoints |
| **API Docs** | https://rift-26-api.onrender.com/docs | Interactive Swagger docs |
| **Health Check** | https://rift-26-api.onrender.com/health | Service status |

## 🧪 Testing the System

### Live Testing (Production)
1. **Visit frontend** at https://rift-aml-frontend.onrender.com
2. **Upload CSV file** with transaction data
3. **View results** in the dashboard
4. **Check API health** at https://rift-26-api.onrender.com/health

### Local Development
1. **Start both services** (see Quick Start above)
2. **Open frontend** at http://localhost:5173
3. **Upload CSV file** with transaction data
4. **View results** in the dashboard

### Sample CSV Format (RIFT 2026 Exact Specification)

```csv
transaction_id,sender_id,receiver_id,amount,timestamp
TXN001,ACC_A,ACC_B,5000.00,2024-01-15 10:30:00
TXN002,ACC_B,ACC_C,4900.00,2024-01-15 11:00:00
```

**Required columns (RIFT spec):**
- `transaction_id` - Unique transaction identifier
- `sender_id` - Account ID of sender (source node)
- `receiver_id` - Account ID of receiver (destination node)
- `amount` - Transaction amount (float)
- `timestamp` - DateTime format: YYYY-MM-DD HH:MM:SS

*Alternative column names accepted: source_account/destination_account, sender/receiver, etc.*

## 📊 Detection Algorithms & Complexity Analysis

### 1. Circular Fund Routing (Cycles) - Money Mule Networks
**Pattern**: Money flows in loops (A → B → C → A) to obscure origin

**Algorithm**:
- Uses NetworkX `simple_cycles()` with bounded depth (lengths 3-5)
- Optimized subgraph construction for large graphs (>500 nodes)
- Temporal validation ensures edges exist in chronological order

**Complexity**:
- **Time**: O(V × C) where V = nodes, C = average cycles per node
  - For graphs ≤500 nodes: O(V²) worst case
  - For graphs >500 nodes: O(100 × C) using top-degree subgraph
- **Space**: O(V + E) for graph storage
- **Optimization**: Early exit after 50 cycles, degree-based pruning

**Detection**: Cycles of length 3-5, all members flagged with same `ring_id`

### 2. Smurfing Patterns (Fan-in / Fan-out)
**Pattern**: Many small transactions aggregated/dispersed to avoid reporting thresholds

**Algorithm**:
- **Fan-In**: Count unique senders → receiver within 72-hour window
- **Fan-Out**: Count unique receivers ← sender within 72-hour window
- Uses pandas `groupby` for efficient temporal aggregation
- Threshold: ≥3 unique counterparties (configurable)

**Complexity**:
- **Time**: O(E) - single pass through transactions with grouping
- **Space**: O(V) - account-level counters
- **Temporal Window**: O(E × W) where W = window size (72 hours)

**Detection**: Fan-in ≥3 senders OR fan-out ≥3 receivers within 72h

### 3. Layered Shell Networks (Multi-hop Chains)
**Pattern**: Money passes through intermediate "shell" accounts with low activity

**Algorithm**:
- Finds simple paths of length ≥3 edges (4 nodes: A→B→C→D)
- Validates intermediate nodes have degree ≤3 (low activity)
- Uses NetworkX `all_simple_paths()` with cutoff=5
- Limited candidate pairs (12×12 for small graphs, 20×20 for medium)

**Complexity**:
- **Time**: O(C × P) where C = candidate pairs, P = paths per pair
  - Exponential worst case, but limited by:
    - Candidate selection (top-degree nodes)
    - Path cutoff (max length 5)
    - Graph size limit (disabled for >250 nodes)
- **Space**: O(V + E) for graph, O(P) for path storage

**Detection**: Chains of 3+ hops with intermediate nodes having ≤3 transactions

### 4. High Velocity Fund Transfers
**Pattern**: Rapid transaction bursts indicating layering activity

**Algorithm**:
- Groups transactions by source account
- Sliding window: counts transactions within 60-minute windows
- Flags accounts with ≥3 transactions in any 60-minute window

**Complexity**:
- **Time**: O(E × log E) - sort by timestamp + window scan
- **Space**: O(V) - per-account transaction lists

**Detection**: ≥3 outbound transactions within 60-minute window

### 5. Pass-Through / Rapid Forwarding Behavior
**Pattern**: Accounts that forward funds rapidly (money mule behavior)

**Algorithm**:
- Computes ratio: `outgoing_amount / incoming_amount`
- Validates forwarding occurs within 30 minutes of receipt
- Flags if ratio > 0.9 AND forwarding latency < 30 minutes

**Complexity**:
- **Time**: O(E) - single pass with grouped aggregation
- **Space**: O(V) - per-account in/out totals

**Detection**: Pass-through ratio ≥0.9 + forwarding within 30 minutes

### 6. Risk Propagation
**Pattern**: Suspicion spreads to connected accounts (guilt by association)

**Algorithm**:
- One-hop propagation from high-risk accounts (score ≥70)
- Decay factor: 0.4 (propagated score = seed × 0.4)
- Minimum threshold: 20.0 (prevents weak propagation)

**Complexity**:
- **Time**: O(V × D) where D = average degree
  - For each high-risk account: O(D) neighbor checks
- **Space**: O(V) - per-account propagated scores

**Detection**: Neighbors of high-risk accounts (score ≥70) receive propagated risk

## 🎯 Suspicion Score Methodology

### Dynamic Pattern Scoring

Suspicion scores are computed using **dynamic pattern scoring** that adapts to account behavior rather than fixed weights:

#### Base Pattern Scores (Ranges)
- **Cycles**: 85-95
  - `cycle_length_3`: Base 90 + log(txn_count)×1.5 + amount_cv×5 + temporal_density×0.1
  - `cycle_length_4`: Base 87 + adjustments
  - `cycle_length_5`: Base 85 + adjustments
- **Pass-Through (Mules)**: 75-90
  - Base 78 + log(txn_count)×2 + amount_cv×8 + temporal_density×0.15
- **High Velocity**: 60-75
  - Base 62 + log(txn_count)×2.5 + temporal_density×0.2 + degree_centrality×5
- **Fan Patterns**: 40-65
  - Base 50 + log(txn_count)×2 + amount_cv×6 + temporal_density×0.12 + degree_centrality×4
- **Shell Chains**: 50-65
  - Base 55 + log(txn_count)×1.2
- **Risk Propagation**: 25-40
  - Base 30 + log(txn_count) + amount_cv×3

#### Score Aggregation Formula

```
base_score = max(pattern_scores)  // Highest pattern score
combo_boost = (num_patterns - 1) × 2.5  // Multi-pattern bonus
raw_score = base_score + combo_boost

// Apply caps
if ring_id exists:
    final_score = clamp(raw_score, 85.0, 95.0)  // Ring members: 85-95
else:
    if num_patterns < 4:
        final_score = min(raw_score, 95.0)
    else:
        final_score = min(raw_score, 100.0)  // 4+ patterns can reach 100
```

#### Risk Propagation

- **Source**: Accounts with suspicion_score ≥ 70
- **Decay**: 0.4 (propagated = seed × 0.4)
- **Minimum**: 20.0 (weak propagation filtered)
- **Scope**: One-hop neighbors only (direct transaction connections)

#### False Positive Reduction

Scores are adjusted by reduction factors for legitimate patterns:

| Pattern | Characteristics | Reduction Factor |
|---------|----------------|------------------|
| **Merchants** | High in-degree, high diversity, in/out ratio > 2 | 0.3 (70% reduction) |
| **Payroll** | High out-degree, periodic patterns, out/in ratio > 2 | 0.4 (60% reduction) |
| **Business Hubs** | High total degree (>20), high diversity | 0.5 (50% reduction) |
| **High Consistency** | Low amount variance (CV < 0.3) | 0.8 (20% reduction) |

**Final Score Calculation**:
```
adjusted_score = original_score × reduction_factor
final_score = clamp(adjusted_score, 0.0, 100.0)
```

#### Risk Level Thresholds

- **CRITICAL** (80-100): Immediate investigation required
- **HIGH** (60-79): Priority review
- **MEDIUM** (40-59): Standard review
- **LOW** (0-39): Monitor only

#### Strong Pattern Override

Accounts with **strong structural patterns** bypass minimum thresholds:
- Cycle participation (`cycle_length_3/4/5`)
- Pass-through behavior (`pass_through`)
- Shell chain membership (`shell_chain`)
- Risk propagation (`risk_propagation`)

These accounts are flagged even if final score < 30, ensuring **recall ≥ 60%**.

## ⚡ Performance

### Performance Targets (RIFT 2026 Requirements)
- **Processing Time**: ≤ 30 seconds for 10K transactions
- **Precision Target**: ≥ 70% (minimize false positives)
- **Recall Target**: ≥ 60% (catch most fraud rings)

### Current Performance Metrics
- **Graph Construction**: O(E) - single-pass edge building with pandas groupby
- **Node Attributes**: O(V) - vectorized value_counts for transaction counting
- **Cycle Detection**: O(V × C) - optimized with subgraph pruning for large graphs
- **Fan Pattern Detection**: O(E) - single-pass temporal grouping
- **Shell Chain Detection**: O(C × P) - limited candidate pairs, exponential but bounded
- **Memory Usage**: ~500MB for 10K transactions

### Optimizations Implemented
1. **O(E) Graph Construction**: Pre-grouped transactions, single timestamp sort
2. **Vectorized Operations**: pandas `value_counts()` instead of iterrows()
3. **Subgraph Pruning**: Cycle detection uses top-degree nodes for large graphs
4. **Candidate Limiting**: Shell chains limited to 12×12 or 20×20 candidate pairs
5. **Early Exit**: Cycle detection stops after 50 cycles found
6. **Performance Logging**: Tracks `graph_build_time`, `detection_time`, `total_time`

### Known Performance Limitations
- Shell chain detection disabled for graphs >250 nodes (exponential complexity)
- Cycle detection uses subgraph for graphs >500 nodes (may miss some cycles)
- Large datasets (>10K transactions) may exceed 30-second target

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

## ⚠️ Known Limitations

### Detection Limitations
1. **Shell Chain Detection**: Disabled for graphs with >250 nodes due to exponential path-finding complexity
2. **Cycle Detection**: Uses subgraph pruning for graphs >500 nodes, may miss cycles involving low-degree nodes
3. **Temporal Analysis**: Fixed 72-hour window for smurfing; may not adapt to all transaction patterns
4. **Risk Propagation**: One-hop only; multi-hop propagation not implemented

### Performance Limitations
1. **Large Datasets**: Processing time may exceed 30 seconds for datasets >10K transactions
2. **Memory Usage**: ~500MB for 10K transactions; may be limiting for very large datasets
3. **Concurrent Requests**: Single-threaded processing; multiple uploads queue sequentially

### False Positive Considerations
1. **Legitimate High-Volume Accounts**: May still flag some legitimate merchants if patterns match closely
2. **New Account Patterns**: False positive reduction based on heuristics; may not catch all edge cases
3. **Temporal Patterns**: Fixed time windows may not suit all transaction patterns

### Data Quality Dependencies
1. **Timestamp Accuracy**: Requires accurate timestamps for temporal analysis
2. **Account ID Consistency**: Assumes consistent account ID formatting across transactions
3. **Missing Data**: Drops rows with null values; may reduce detection coverage

## 👥 Team Members

**⚠️ UPDATE THIS SECTION WITH ACTUAL TEAM INFORMATION**

- **Team Member 1**: [Name] - [Role] - [LinkedIn/GitHub]
- **Team Member 2**: [Name] - [Role] - [LinkedIn/GitHub]
- **Team Member 3**: [Name] - [Role] - [LinkedIn/GitHub]

*Add all team members who contributed to this project.*

## 📝 License

This is a production-grade AML detection system built for educational and legitimate compliance purposes as part of the RIFT 2026 Hackathon.

## 📧 Support

For issues, questions, or feature requests related to this RIFT 2026 submission:
- Check the documentation in this README
- Review `RIFT_COMPLIANCE_CHECKLIST.md` for compliance status
- Create an issue in the GitHub repository

---

**Built for RIFT 2026 Hackathon | Graph Theory / Financial Crime Detection Track**

**Follow the money. 🕵️**
