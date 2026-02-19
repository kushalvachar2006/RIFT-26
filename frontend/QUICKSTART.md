# 🛡️ FinGuard AI — AML Detection Engine

> **AI-Powered Money Muling Detection Dashboard**  
> Built with Vite + React · Cytoscape.js · Tailwind CSS · Recharts · Framer Motion

---

## ⚡ Quick Start (3 Steps)

### 1. Install dependencies
```bash
cd aml-dashboard
npm install
```

### 2. Configure environment (optional — for real backend)
```bash
cp .env.example .env
# Edit VITE_API_URL if you have a backend
```

### 3. Start dev server
```bash
npm run dev
```
Open **http://localhost:3000** in your browser.

---

## 🚀 Without a Backend (Demo Mode)

The app works **fully offline** without any backend:

1. Open the app at `http://localhost:3000`
2. Click the **"DEMO"** button — it auto-loads a synthetic fraud dataset
3. Click **"RUN DETECTION"** — local engine analyzes the data
4. Explore the interactive graph, fraud rings, and risk scores

---

## 🗂️ Project Structure

```
aml-dashboard/
├── src/
│   ├── pages/
│   │   ├── UploadPage.jsx       # Landing / CSV upload
│   │   └── DashboardPage.jsx    # Main 3-panel dashboard
│   ├── components/
│   │   ├── Graph/
│   │   │   └── TransactionGraph.jsx   # Cytoscape.js graph
│   │   ├── Tables/
│   │   │   ├── SuspiciousAccountsTable.jsx
│   │   │   └── FraudRingsTable.jsx
│   │   ├── Charts/
│   │   │   └── AnalyticsCharts.jsx    # Recharts analytics
│   │   ├── UI/
│   │   │   ├── MetricCards.jsx        # KPI cards
│   │   │   └── NodeDetailPanel.jsx    # Click-to-explain panel
│   │   └── Layout/
│   │       └── Navbar.jsx
│   ├── context/
│   │   └── store.js             # Zustand global state
│   ├── services/
│   │   └── api.js               # Axios API client
│   └── utils/
│       ├── amlEngine.js         # Local fraud detection engine
│       └── sampleData.js        # Demo CSV generator
├── tailwind.config.js
├── vite.config.js
└── index.html
```

---

## 📄 CSV Format

Upload a CSV with these columns (flexible — extra columns ignored):

```csv
transaction_id,sender_account,receiver_account,amount,timestamp
TXN_0001,ACC_0001,ACC_0002,15000.00,2024-01-15T10:30:00Z
TXN_0002,ACC_0002,ACC_0003,14500.00,2024-01-15T10:45:00Z
```

**Minimum required:** `sender_account` + `receiver_account` (or `from`/`to`, `sender`/`receiver`)  
**Optional:** `amount`, `timestamp`, `transaction_id`

---

## 🔌 Real Backend Integration

### Expected API Endpoint
```
POST /upload-csv
Content-Type: multipart/form-data

Response:
{
  "suspicious_accounts": [
    {
      "account_id": "ACC_001",
      "suspicion_score": 92,
      "patterns_detected": ["velocity", "cycle"],
      "transaction_count": 47,
      "total_volume": 234500.00,
      "risk_level": "HIGH"
    }
  ],
  "fraud_rings": [
    {
      "ring_id": "RING_001",
      "accounts": ["ACC_001", "ACC_002", "ACC_003"],
      "risk_level": "HIGH",
      "pattern_type": "Cycle",
      "transaction_count": 12
    }
  ],
  "transactions": [...],
  "summary": {
    "total_transactions": 1200,
    "suspicious_account_count": 23,
    "fraud_rings_detected": 4,
    "processing_time": "2.34",
    "high_risk_count": 8
  }
}
```

### Switching to Real API

In `src/pages/UploadPage.jsx`, replace the local `analyzeCsvData()` call:

```js
// Replace this:
const result = analyzeCsvData(csvData)

// With this:
import { uploadCSV } from '../services/api'
const result = await uploadCSV(csvFile, setProcessingProgress)
```

---

## 🎮 Dashboard Features

| Feature | Description |
|---|---|
| **Interactive Graph** | Zoom, pan, drag nodes. Built with Cytoscape.js |
| **Click Node** | Opens explainable AI panel with risk breakdown |
| **Fraud Ring Highlight** | Click ring in table → highlights ring in graph |
| **Heatmap Mode** | Toggle propagated risk coloring via navbar |
| **Analytics** | Bar, Line, Pie charts with Recharts |
| **Export JSON** | Download full analysis report |

---

## 🏗️ Build for Production

```bash
npm run build
# Output: /dist folder — deploy to any static host
```

---

## 🛠️ Tech Stack

| Package | Version | Role |
|---|---|---|
| React | 18 | UI framework |
| Vite | 5 | Build tool |
| Tailwind CSS | 3 | Styling |
| Cytoscape.js | 3.28 | Graph visualization |
| Recharts | 2.12 | Analytics charts |
| Framer Motion | 11 | Animations |
| Zustand | 4 | State management |
| Axios | 1.6 | HTTP client |
| PapaParse | 5.4 | CSV parsing |
| React Dropzone | 14 | File upload |
| React Router | 6 | Routing |

---

## 🎨 Design System

| Token | Value | Usage |
|---|---|---|
| `neon-blue` | `#00f0ff` | Primary accents, borders |
| `neon-red` | `#ff003c` | High-risk, alerts |
| `neon-green` | `#00ff88` | Low-risk, success |
| `neon-orange` | `#ff6a00` | Medium-risk |
| `dark-950` | `#010409` | Background |
| Font: Display | Orbitron | Headers, badges |
| Font: Body | Syne | UI text |
| Font: Mono | JetBrains Mono | Data, labels |

---

## 🔍 Fraud Detection Patterns

| Pattern | Description |
|---|---|
| `velocity` | Multiple transfers within <30 minute windows |
| `fan_in` | Many senders funneling to a single receiver |
| `shell_chain` | Pass-through accounts: in ≈ out, no retention |
| `cycle` | Circular transaction loop (RING detected) |
| `smurfing` | Multiple small transactions to avoid thresholds |

---

*Built for hackathons and production AML systems.*
