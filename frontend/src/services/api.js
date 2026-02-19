import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 60000,
})

/**
 * POST /upload-csv — upload transaction CSV and receive AnalysisResponse
 * Matches backend schema:
 *   suspicious_accounts[].account_id
 *   suspicious_accounts[].suspicion_score  (0–100)
 *   suspicious_accounts[].patterns         (list of pattern flags)
 *   suspicious_accounts[].risk_level       (LOW/MEDIUM/HIGH/CRITICAL)
 *   fraud_rings[].ring_id
 *   fraud_rings[].accounts
 *   fraud_rings[].risk_level
 *   fraud_rings[].pattern_type
 *   fraud_rings[].transaction_count
 *   summary.total_transactions
 *   summary.suspicious_account_count
 *   summary.fraud_rings_detected
 *   summary.processing_time_seconds
 */
export const uploadCSV = async (file, onProgress) => {
  const formData = new FormData()
  formData.append('file', file)

  try {
    const response = await apiClient.post('/api/v1/upload-csv', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 180000, // 3 minutes for large datasets
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          onProgress(pct)
        }
      }
    })

    // Normalize backend response to match frontend expectations
    const data = response.data
    return {
      ...data,
      summary: {
        ...data.summary,
        // Alias for legacy MetricCards compatibility
        processing_time: data.summary?.processing_time_seconds?.toFixed(2) ?? '0.00',
        critical_count: data.suspicious_accounts?.filter(a => a.risk_level === 'CRITICAL').length ?? 0,
        high_risk_count: data.suspicious_accounts?.filter(a => a.risk_level === 'HIGH').length ?? 0,
      },
      // Backend uses 'patterns' key, frontend uses 'patterns_detected'
      suspicious_accounts: data.suspicious_accounts?.map(acc => ({
        ...acc,
        patterns_detected: acc.patterns_detected || acc.patterns || [],
        total_volume: acc.total_volume || ((acc.total_incoming || 0) + (acc.total_outgoing || 0)),
      })) ?? [],
    }
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'API request failed')
  }
}

/** GET /health — backend health check */
export const checkHealth = async () => {
  try {
    const response = await apiClient.get('/health')
    return response.data // { status: "healthy", version: "1.0.0" }
  } catch {
    return null
  }
}

export default apiClient
