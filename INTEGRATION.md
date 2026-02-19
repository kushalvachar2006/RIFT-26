# 🔗 Frontend-Backend Integration Guide

## Overview
This guide explains how to run the complete AML Detection System with both frontend (React) and backend (FastAPI) integrated.

---

## Architecture

```
┌─────────────────┐         HTTP/REST API        ┌──────────────────┐
│                 │ ────────────────────────────► │                  │
│  React Frontend │         Port 5173            │  FastAPI Backend │
│  (Vite + React) │ ◄──────────────────────────── │  (Python)        │
│                 │         CORS Enabled          │                  │
└─────────────────┘                               └──────────────────┘
     Port 5173                                          Port 8000
```

### Components:
- **Frontend**: React app with Vite, Tailwind CSS, Cytoscape for graph visualization
- **Backend**: FastAPI service with NetworkX for graph analysis
- **Communication**: REST API with JSON responses

---

## Quick Start (Development)

### Prerequisites
- **Node.js** 18+ and npm
- **Python** 3.9+
- **pip** package manager

### Step 1: Start Backend

```bash
# Navigate to backend directory
cd backend

# Install Python dependencies (first time only)
pip install -r requirements.txt

# Start the FastAPI server
python main.py
```

**Backend will run on:** http://localhost:8000
**API Documentation:** http://localhost:8000/docs

### Step 2: Start Frontend

Open a **new terminal**:

```bash
# Navigate to frontend directory
cd frontend

# Install Node dependencies (first time only)
npm install

# Start the development server
npm run dev
```

**Frontend will run on:** http://localhost:5173

### Step 3: Access the Application

Open your browser and go to:
```
http://localhost:5173
```

---

## API Endpoints

### Backend Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Health check |
| `/api/v1/upload-csv` | POST | Upload CSV and run AML detection |
| `/api/v1/status` | GET | Service status |

### Request/Response Format

**Upload CSV:**
```javascript
POST /api/v1/upload-csv
Content-Type: multipart/form-data

Response:
{
  "suspicious_accounts": [
    {
      "account_id": "ACC_0123",
      "suspicion_score": 87.5,
      "patterns": ["cycle_length_3", "high_velocity"],
      "risk_level": "HIGH"
    }
  ],
  "fraud_rings": [
    {
      "ring_id": "RING_001",
      "accounts": ["ACC_100", "ACC_200", "ACC_300"],
      "risk_level": "HIGH",
      "cycle_length": 3,
      "total_volume": 125000.50
    }
  ],
  "summary": {
    "total_transactions": 10000,
    "unique_accounts": 500,
    "suspicious_account_count": 321,
    "fraud_rings_detected": 5,
    "high_risk_accounts": 45,
    "processing_time_seconds": 85.5
  }
}
```

---

## Configuration

### Frontend Configuration

Edit `frontend/.env`:
```env
VITE_API_URL=http://localhost:8000
```

For production:
```env
VITE_API_URL=https://your-api-domain.com
```

### Backend Configuration

Edit `backend/config.py`:
```python
# Server Configuration
host = "0.0.0.0"
port = 8000

# Detection Thresholds
high_risk_threshold = 60.0

# Risk Scoring Weights
weight_cycle = 0.25
weight_velocity = 0.20
# ... etc
```

---

## CORS Configuration

The backend is configured to allow all origins by default:

```python
# backend/main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

For production, restrict to specific origins:
```python
allow_origins=["https://your-frontend-domain.com"],
```

---

## Building for Production

### Build Frontend

```bash
cd frontend
npm run build
```

This creates an optimized production build in `frontend/dist/`.

### Options for Deployment:

#### Option 1: Separate Deployment
- Deploy frontend to Vercel, Netlify, or S3
- Deploy backend to AWS, Google Cloud, or DigitalOcean
- Update `VITE_API_URL` to point to production backend

#### Option 2: Single Server (Backend Serves Frontend)

Update `backend/main.py`:

```python
from fastapi.staticfiles import StaticFiles

# Serve static files from frontend build
app.mount("/", StaticFiles(directory="../frontend/dist", html=True), name="static")
```

Build and deploy:
```bash
# Build frontend
cd frontend && npm run build

# Deploy backend (which now serves frontend)
cd ../backend
python main.py
```

---

## Docker Deployment

### Using Docker Compose

Create `docker-compose.yml` in the root directory:

```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - PYTHONUNBUFFERED=1
    volumes:
      - ./backend:/app
    restart: unless-stopped

  frontend:
    build: ./frontend
    ports:
      - "5173:5173"
    environment:
      - VITE_API_URL=http://localhost:8000
    depends_on:
      - backend
    restart: unless-stopped
```

Create `frontend/Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]
```

Run with Docker:
```bash
docker-compose up
```

### Production Docker Deployment

For production, use multi-stage build for frontend:

```dockerfile
# frontend/Dockerfile.prod
FROM node:18-alpine as build

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

---

## Testing the Integration

### Test 1: Health Check

```bash
# Backend health
curl http://localhost:8000/health

# Should return:
# {"status": "healthy", "service": "AML Detection Engine", "version": "1.0.0"}
```

### Test 2: Upload CSV from Frontend

1. Open http://localhost:5173
2. Upload `backend/sample_transactions.csv`
3. Wait for processing (~85-90 seconds)
4. View results in the dashboard

### Test 3: API Direct Test

```bash
cd backend
python quick_test.py
```

---

## Troubleshooting

### Issue: Frontend can't connect to backend

**Check:**
1. Backend is running on port 8000
2. CORS is properly configured
3. `.env` file has correct `VITE_API_URL`

**Solution:**
```bash
# Verify backend is running
curl http://localhost:8000/health

# Check frontend environment
cd frontend
cat .env
```

### Issue: "Network Error" or "CORS Error"

**Solution:**
- Restart backend server
- Clear browser cache
- Check `allow_origins` in backend CORS configuration

### Issue: Upload timeout

**Cause:** Large CSV files take >180 seconds

**Solution:**
- Increase timeout in `frontend/src/services/api.js`:
  ```javascript
  timeout: 300000, // 5 minutes
  ```

### Issue: Frontend build fails

**Solution:**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run build
```

---

## Performance Optimization

1. **Backend Caching**: Cache graph construction for repeated uploads
2. **Frontend Code Splitting**: Lazy load components
3. **API Response Compression**: Enable gzip in backend
4. **CDN**: Serve frontend static assets from CDN

---

## Monitoring

### Backend Logs

```bash
# View backend logs
cd backend
python main.py

# Logs show:
# - Incoming requests
# - Processing time
# - Detection results
```

### Frontend Console

Open browser DevTools → Console to see:
- API request/response
- Upload progress
- Error messages

---

## Security Considerations

### Production Checklist:

- [ ] Update CORS to specific origins
- [ ] Add authentication (JWT/OAuth2)
- [ ] Enable HTTPS (TLS/SSL)
- [ ] Add rate limiting
- [ ] Validate and sanitize file uploads
- [ ] Set up logging and monitoring
- [ ] Use environment variables for secrets
- [ ] Enable security headers
- [ ] Regular dependency updates

---

## File Upload Limits

**Backend:** 100 MB (configurable in `config.py`)
**Frontend:** Uses FormData (no client-side limit)

To change backend limit:
```python
# backend/config.py
max_file_size_mb = 200  # Increase to 200MB
```

---

## API Response Times

| Transactions | Expected Time |
|-------------|---------------|
| 100 | < 1 second |
| 1,000 | 2-5 seconds |
| 10,000 | 85-90 seconds |
| 50,000 | 5-8 minutes |

---

## Next Steps

1. ✅ **Test Integration**: Upload sample CSV and verify results
2. ✅ **Customize UI**: Modify frontend components as needed
3. ✅ **Adjust Detection**: Tune thresholds in backend config
4. ✅ **Deploy**: Choose deployment strategy
5. ✅ **Monitor**: Set up logging and alerting

---

## Support Files

| File | Purpose |
|------|---------|
| `backend/README.md` | Backend documentation |
| `frontend/package.json` | Frontend dependencies |
| `backend/config.py` | Backend configuration |
| `frontend/.env` | Frontend environment variables |

---

## Quick Command Reference

```bash
# Start both services (in separate terminals)
cd backend && python main.py
cd frontend && npm run dev

# Build for production
cd frontend && npm run build

# Run tests
cd backend && python validate_system.py

# Generate sample data
cd backend && python generate_sample_data.py

# Deploy with Docker
docker-compose up
```

---

**Integration Status: ✅ READY**

Both frontend and backend are configured and ready to work together!

*Last Updated: February 19, 2026*
