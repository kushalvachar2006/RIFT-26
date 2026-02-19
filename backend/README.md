# Production Graph-Based AML Detection Engine

A production-grade microservice for detecting money laundering patterns using graph-based machine learning and temporal analysis.

## 🎯 Features

### Detection Capabilities
- **Fraud Ring Detection**: Identifies circular transaction patterns (cycles) indicating coordinated fraud
- **Smurfing/Layering Detection**: Detects fan-in/fan-out patterns characteristic of money laundering
- **Money Mule Identification**: Finds pass-through accounts that rapidly move funds
- **High-Velocity Chains**: Flags rapid transaction sequences
- **Risk Propagation**: Uses Personalized PageRank to spread suspicion through network connections

### Advanced Analytics
- **Temporal Graph Analysis**: Time-aware graph modeling with decay weights
- **False Positive Reduction**: Intelligent filtering of legitimate business patterns (merchants, payroll, hubs)
- **Multi-Factor Risk Scoring**: Weighted scoring across 5 detection dimensions (0-100 scale)
- **Explainable Results**: Each detection includes pattern explanations

### Performance
- ✅ Processes **10K+ transactions in <20 seconds**
- ✅ Memory-efficient graph modeling with NetworkX
- ✅ Optimized cycle detection with bounded algorithms
- ✅ Production-ready FastAPI service

## 🏗️ Architecture

```
RIFT/
├── main.py                 # FastAPI application entry point
├── requirements.txt        # Python dependencies
│
├── models/                 # Pydantic data models
│   ├── __init__.py
│   └── schemas.py         # Request/response schemas
│
├── services/              # Core business logic
│   ├── __init__.py
│   ├── graph_engine.py    # Temporal graph construction
│   ├── pattern_detection.py  # Pattern detection algorithms
│   ├── risk_scoring.py    # Risk scoring & propagation
│   └── aml_pipeline.py    # Pipeline orchestrator
│
├── routers/               # API endpoints
│   ├── __init__.py
│   └── aml_router.py      # AML detection routes
│
└── utils/                 # Utility functions
    ├── __init__.py
    └── helpers.py         # Data generation & validation
```

## 🚀 Quick Start

### Installation

```bash
# Install dependencies
pip install -r requirements.txt
```

### Run the Service

```bash
# Start the server (http://localhost:8000)
python main.py
```

### API Documentation

Once running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 📡 API Endpoints

### POST `/api/v1/upload-csv`

Upload transaction CSV and run detection.

**CSV Format:**
```csv
transaction_id,source_account,destination_account,amount,timestamp
TXN_001,ACC_0001,ACC_0002,5000.00,2024-01-15T10:30:00
TXN_002,ACC_0002,ACC_0003,4500.00,2024-01-15T11:45:00
```

**Response:**
```json
{
  "suspicious_accounts": [
    {
      "account_id": "ACC_0123",
      "suspicion_score": 87.5,
      "patterns": ["cycle_length_3", "high_velocity", "fan_out"]
    }
  ],
  "fraud_rings": [
    {
      "ring_id": "RING_001",
      "accounts": ["ACC_0100", "ACC_0200", "ACC_0300"],
      "risk_level": "HIGH",
      "cycle_length": 3,
      "total_volume": 125000.50
    }
  ],
  "summary": {
    "total_transactions": 10500,
    "unique_accounts": 2300,
    "rings_detected": 12,
    "high_risk_accounts": 45,
    "processing_time_seconds": 18.5
  }
}
```

### GET `/health`

Health check endpoint.

### GET `/api/v1/status`

Service status and metadata.

## 🧪 Generate Sample Data

```python
from utils import generate_sample_transactions, export_to_csv

# Generate test data with fraud patterns
df = generate_sample_transactions(
    num_transactions=10000,
    num_accounts=500,
    fraud_rings=5,
    mule_accounts=15
)

# Export to CSV
export_to_csv(df, "sample_transactions.csv")
```

Or run the included script:

```bash
python generate_sample_data.py
```

## 🔍 Detection Algorithms

### 1. Cycle Detection (Fraud Rings)
- **Algorithm**: Bounded DFS-based cycle search
- **Validates**: Temporal consistency of cycles
- **Detects**: Cycles of length 3-5
- **Risk Weight**: 25%

### 2. Fan-In/Fan-Out (Smurfing)
- **Window**: 72-hour sliding window
- **Detects**: Burst patterns in transaction clustering
- **Metrics**: Degree, volume, frequency, temporal burst
- **Risk Weight**: 20%

### 3. Velocity Profiling
- **Measures**: Transaction latency (incoming → outgoing)
- **Flags**: Chains with <30 min latency
- **Metrics**: Burstiness, time variance
- **Risk Weight**: 20%

### 4. Pass-Through Detection
- **Ratio**: `total_outgoing / total_incoming ≈ 1`
- **Validates**: High frequency + low retention time
- **Identifies**: Shell accounts, money mules
- **Risk Weight**: 20%

### 5. Risk Propagation
- **Algorithm**: Personalized PageRank with hop-decay
- **Spreads**: Suspicion to connected accounts
- **Decay**: 50% per network hop
- **Risk Weight**: 15%

## 🛡️ False Positive Reduction

Automatically filters legitimate patterns:

| Pattern | Characteristics | Reduction |
|---------|----------------|-----------|
| **Merchants** | High in-degree, high diversity, mostly receiving | 70% |
| **Payroll** | High out-degree, periodic patterns, mostly sending | 60% |
| **Business Hubs** | High total degree, high diversity | 50% |
| **Subscriptions** | High amount consistency (low CV) | 20% |

## 📊 Risk Score Breakdown

**Final Score (0-100):**
- 🔴 **80-100**: Critical Risk
- 🟠 **60-79**: High Risk  
- 🟡 **40-59**: Medium Risk
- 🟢 **0-39**: Low Risk

**Scoring Components:**
```
Cycle Participation:    25%
Velocity Risk:          20%
Fan Patterns:          20%
Pass-Through:          20%
Risk Propagation:      15%
```

## 🧬 Graph Model

**Temporal Directed Graph:**
- **Nodes**: Account IDs
- **Edges**: Aggregated transactions between accounts

**Edge Attributes:**
- `total_amount`: Sum of all transaction amounts
- `txn_count`: Number of transactions
- `avg_amount`: Average transaction amount
- `txn_frequency`: Transactions per day
- `rolling_velocity`: Amount per hour
- `time_decay_weight`: Exponential time decay
- `first_txn` / `last_txn`: Temporal boundaries

**Node Attributes:**
- `total_incoming/outgoing`: Aggregated flows
- `in_degree/out_degree`: Number of connections
- `pass_through_ratio`: Outgoing/Incoming ratio
- `diversity_index`: Transaction partner diversity

## 🔧 Configuration

Adjust detection sensitivity in:
- `services/pattern_detection.py` - Detection thresholds
- `services/risk_scoring.py` - Risk weights & thresholds
- `services/graph_engine.py` - Graph construction parameters

## 📈 Performance Benchmarks

| Transactions | Accounts | Processing Time | Memory Usage |
|-------------|----------|-----------------|--------------|
| 1,000 | 200 | ~2s | ~50 MB |
| 10,000 | 2,000 | ~18s | ~200 MB |
| 50,000 | 10,000 | ~95s | ~800 MB |

*Tested on Intel i7, 16GB RAM*

## 🛠️ Technology Stack

- **FastAPI**: Modern async web framework
- **NetworkX**: Graph algorithms and analysis
- **Pandas**: Data manipulation and cleaning
- **NumPy**: Numerical computations
- **Pydantic**: Data validation and serialization
- **Uvicorn**: ASGI server

## 📝 Example Usage

```python
import requests

# Upload CSV
url = "http://localhost:8000/api/v1/upload-csv"
files = {"file": open("transactions.csv", "rb")}
response = requests.post(url, files=files)

result = response.json()

# Print high-risk accounts
for account in result["suspicious_accounts"][:10]:
    print(f"{account['account_id']}: {account['suspicion_score']:.1f} - {account['patterns']}")

# Print fraud rings
for ring in result["fraud_rings"]:
    print(f"{ring['ring_id']}: {ring['risk_level']} - {len(ring['accounts'])} accounts")
```

## 📜 License

This project is provided as-is for educational and development purposes.

## 🤝 Contributing

This is a production-grade reference implementation. Customize detection logic, thresholds, and weights based on your specific use case and risk tolerance.

## ⚠️ Disclaimer

This is a detection tool that flags **suspicious patterns** for review. It is not a definitive fraud determination system. All flagged accounts should be reviewed by compliance experts before taking action.

---

**Built with ❤️ for fighting financial crime**
