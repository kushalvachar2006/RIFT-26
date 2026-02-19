import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 120000, // 2 minutes for 10K transactions
})

/**
 * POST /upload-csv — upload transaction CSV and receive RIFT AMLDetectionResponse
 * Matches RIFT backend schema:
 *   suspicious_accounts[].account_id
 *   suspicious_accounts[].suspicion_score  (0–100)
 *   suspicious_accounts[].detected_patterns (list of pattern flags)
 *   suspicious_accounts[].ring_id (RING_XXX or null)
 *   fraud_rings[].ring_id
 *   fraud_rings[].member_accounts
 *   fraud_rings[].pattern_type (cycle|smurfing|shell_chain)
 *   fraud_rings[].risk_score
 *   summary.total_accounts_analyzed
 *   summary.suspicious_accounts_flagged
 *   summary.fraud_rings_detected
 *   summary.processing_time_seconds
 */
export const uploadCSV = async (file, onProgress) => {
  const formData = new FormData()
  formData.append('file', file)

  try {
    const response = await apiClient.post('/api/v1/upload-csv', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 300000, // 5 minutes for 10K transactions (RIFT requirement: ≤30s processing)
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          onProgress(pct)
        }
      }
    })

    // RIFT backend response - normalize to frontend expectations
    const data = response.data
    return {
      ...data,
      summary: {
        ...data.summary,
        // Alias for legacy MetricCards compatibility
        total_transactions: data.summary?.total_accounts_analyzed || 0,
        processing_time: data.summary?.processing_time_seconds?.toFixed(2) ?? '0.00',
        suspicious_account_count: data.summary?.suspicious_accounts_flagged || 0,
        fraud_rings_detected: data.summary?.fraud_rings_detected || 0,
        critical_count: data.suspicious_accounts?.filter(a => a.suspicion_score >= 80).length ?? 0,
        high_risk_count: data.suspicious_accounts?.filter(a => a.suspicion_score >= 60 && a.suspicion_score < 80).length ?? 0,
      },
      // Map RIFT backend structure to frontend expectations
      suspicious_accounts: data.suspicious_accounts?.map(acc => ({
        account_id: acc.account_id,
        suspicion_score: acc.suspicion_score,
        patterns_detected: acc.detected_patterns || [],
        ring_id: acc.ring_id,
        is_mule: acc.is_mule || false,
        mule_role: acc.mule_role || null,
        // Legacy compatibility
        risk_level: acc.suspicion_score >= 80 ? 'CRITICAL' :
          acc.suspicion_score >= 60 ? 'HIGH' :
            acc.suspicion_score >= 40 ? 'MEDIUM' : 'LOW',
        total_volume: 0, // Not provided by RIFT backend
        total_incoming: 0, // Not provided by RIFT backend
        total_outgoing: 0, // Not provided by RIFT backend
      })) ?? [],
      // Map RIFT fraud_rings: member_accounts → accounts for graph/table consumption
      fraud_rings: data.fraud_rings?.map(ring => ({
        ring_id: ring.ring_id,
        member_accounts: ring.member_accounts,
        accounts: ring.member_accounts,
        risk_score: ring.risk_score ?? 0, // Include risk_score from backend
        risk_level: ring.risk_score >= 80 ? 'CRITICAL' :
          ring.risk_score >= 60 ? 'HIGH' :
            ring.risk_score >= 40 ? 'MEDIUM' : 'LOW',
        cycle_length: ring.member_accounts?.length || 0,
        total_volume: (ring.risk_score ?? 0) * 1000, // Estimated volume
        pattern_type: ring.pattern_type,
        transaction_count: ring.member_accounts?.length || 0
      })) ?? []
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
