/**
 * AML Analysis Engine — Client-side simulation matching the backend plan:
 *
 * Weighted composite scoring:
 *   Cycle detection   25%
 *   Velocity analysis 20%
 *   Fan-in / Fan-out  20%
 *   Pass-through      20%
 *   PageRank proxy    15%
 *
 * Risk classification:
 *   LOW      < 30
 *   MEDIUM  30–60
 *   HIGH    60–80
 *   CRITICAL > 80
 *
 * Pattern flags (match backend detector labels):
 *   cycle         — bounded Johnson's cycle detection (length 3–5)
 *   high_velocity — receive-to-send latency < 30 min / burstiness
 *   fan_in        — ≥5 distinct senders in 72h window
 *   fan_out       — ≥5 distinct receivers in 72h window
 *   shell_chain   — pass-through ratio ∈ [0.85, 1.15]
 */
export function analyzeCsvData(rows) {
  const startTime = Date.now()

  // ── 1. Parse & validate transactions (csv_cleaner equivalent) ──────────────
  const transactions = rows
    .map((row, i) => {
      const sender   = row.sender   || row.sender_account   || row.from  || null
      const receiver = row.receiver || row.receiver_account || row.to    || null
      const amount   = parseFloat(row.amount || row.value || 0)
      const ts       = row.timestamp || row.date || null
      if (!sender || !receiver || isNaN(amount) || !ts) return null
      return {
        id:        row.transaction_id || row.id || `TXN_${i}`,
        sender,
        receiver,
        amount,
        timestamp: ts,
        _ts:       new Date(ts).getTime(),
      }
    })
    .filter(Boolean)
    .sort((a, b) => a._ts - b._ts)

  // ── 2. Build account map (graph_builder equivalent) ───────────────────────
  const accountMap = {}
  transactions.forEach(tx => {
    for (const id of [tx.sender, tx.receiver]) {
      if (!accountMap[id]) {
        accountMap[id] = { sent: [], received: [], neighbors: new Set() }
      }
    }
    accountMap[tx.sender].sent.push(tx)
    accountMap[tx.receiver].received.push(tx)
    accountMap[tx.sender].neighbors.add(tx.receiver)
    accountMap[tx.receiver].neighbors.add(tx.sender)
  })

  const accountIds = Object.keys(accountMap)

  // ── 3. Cycle detection — bounded BFS cycles of length 3–5 ─────────────────
  const cycleParticipants = new Set()
  const fraudRings = _detectCycles(transactions, accountIds, cycleParticipants)

  // ── 4. Fan-in / Fan-out — 72h sliding window, threshold ≥5 ────────────────
  const fanFlags = _detectFanPatterns(accountMap)

  // ── 5. Velocity profiling — rapid chain & burstiness ──────────────────────
  const velocityFlags = _detectVelocity(accountMap)

  // ── 6. Pass-through / shell chain ─────────────────────────────────────────
  const passthroughFlags = _detectPassthrough(accountMap)

  // ── 7. PageRank proxy — spread suspicion via neighbor graph ───────────────
  const pageRankScores = _computePageRankProxy(accountMap, accountIds, cycleParticipants, fanFlags, velocityFlags, passthroughFlags)

  // ── 8. False-positive reduction ───────────────────────────────────────────
  const fpDiscounts = _computeFPDiscounts(accountMap, accountIds, transactions)

  // ── 9. Composite risk scoring ─────────────────────────────────────────────
  const suspiciousAccounts = []

  accountIds.forEach(id => {
    const acc = accountMap[id]
    const patterns = []

    // Component scores (0–100 each, weighted)
    const cycleScore      = cycleParticipants.has(id) ? 100 : 0          // 25%
    const velocityScore   = velocityFlags.has(id)     ? 100 : 0          // 20%
    const fanScore        = (fanFlags.fanIn.has(id) || fanFlags.fanOut.has(id)) ? 100 : 0 // 20%
    const passthroughScore= passthroughFlags.has(id)  ? 100 : 0          // 20%
    const prScore         = Math.min((pageRankScores[id] || 0) * 500, 100) // 15%

    if (cycleParticipants.has(id))   patterns.push('cycle')
    if (velocityFlags.has(id))       patterns.push('high_velocity')
    if (fanFlags.fanIn.has(id))      patterns.push('fan_in')
    if (fanFlags.fanOut.has(id))     patterns.push('fan_out')
    if (passthroughFlags.has(id))    patterns.push('shell_chain')

    const rawScore =
      cycleScore      * 0.25 +
      velocityScore   * 0.20 +
      fanScore        * 0.20 +
      passthroughScore* 0.20 +
      prScore         * 0.15

    // Apply false-positive discount
    const discount = fpDiscounts[id] || 0
    let finalScore = Math.max(0, Math.min(100, rawScore - discount))

    // Only flag if score > 0 or has patterns
    if (finalScore < 1 && patterns.length === 0) return

    // Classify
    const risk_level =
      finalScore > 80 ? 'CRITICAL' :
      finalScore > 60 ? 'HIGH' :
      finalScore > 30 ? 'MEDIUM' : 'LOW'

    const totalIn  = acc.received.reduce((s, t) => s + t.amount, 0)
    const totalOut = acc.sent.reduce((s, t) => s + t.amount, 0)

    suspiciousAccounts.push({
      account_id:        id,
      suspicion_score:   Math.round(finalScore),
      patterns_detected: patterns.length ? patterns : ['high_velocity'],
      transaction_count: acc.sent.length + acc.received.length,
      total_volume:      totalIn + totalOut,
      total_incoming:    totalIn,
      total_outgoing:    totalOut,
      risk_level,
    })
  })

  suspiciousAccounts.sort((a, b) => b.suspicion_score - a.suspicion_score)

  const processingTime = ((Date.now() - startTime) / 1000).toFixed(2)

  return {
    suspicious_accounts: suspiciousAccounts.slice(0, 100),
    fraud_rings:         fraudRings,
    transactions,
    summary: {
      total_transactions:       transactions.length,
      total_accounts:           accountIds.length,
      suspicious_account_count: suspiciousAccounts.filter(a => a.suspicion_score >= 30).length,
      fraud_rings_detected:     fraudRings.length,
      processing_time_seconds:  parseFloat(processingTime),
      // Legacy alias kept for MetricCards compatibility
      processing_time:          processingTime,
      critical_count: suspiciousAccounts.filter(a => a.risk_level === 'CRITICAL').length,
      high_risk_count: suspiciousAccounts.filter(a => a.risk_level === 'HIGH').length,
      medium_risk_count: suspiciousAccounts.filter(a => a.risk_level === 'MEDIUM').length,
    },
  }
}

// ── Internal detectors ────────────────────────────────────────────────────────

/** Bounded BFS cycle detection, lengths 3–5, max 1000 cycles */
function _detectCycles(transactions, accountIds, cycleParticipants) {
  const graph = {}
  const edgeTimes = {}
  transactions.forEach(tx => {
    if (!graph[tx.sender]) graph[tx.sender] = []
    graph[tx.sender].push(tx.receiver)
    const key = `${tx.sender}→${tx.receiver}`
    edgeTimes[key] = Math.max(edgeTimes[key] || 0, tx._ts)
  })

  const rings = []
  const usedAccounts = new Set()
  let ringId = 1
  const patternTypes = ['Layering', 'Round-tripping', 'Smurfing', 'Cycle']

  for (const start of accountIds) {
    if (rings.length >= 1000) break
    // BFS
    const queue = [[start, [start], 0]]
    while (queue.length > 0) {
      if (rings.length >= 1000) break
      const [cur, path, lastTs] = queue.shift()
      const neighbors = graph[cur] || []
      for (const nb of neighbors) {
        if (nb === start && path.length >= 3 && path.length <= 6) {
          // Temporal validation: edges must progress in time
          let valid = true
          for (let i = 1; i < path.length; i++) {
            const t1 = edgeTimes[`${path[i-1]}→${path[i]}`] || 0
            const t2 = edgeTimes[`${path[i]}→${path[0]}`] || 0
            if (t2 < t1) { valid = false; break }
          }
          if (valid && !rings.find(r => path.every(a => r.accounts.includes(a)))) {
            const id = `RING_${String(ringId).padStart(3, '0')}`
            rings.push({
              ring_id:           id,
              accounts:          [...path],
              risk_level:        'CRITICAL',
              pattern_type:      patternTypes[(ringId - 1) % patternTypes.length],
              transaction_count: path.length,
            })
            path.forEach(a => { cycleParticipants.add(a); usedAccounts.add(a) })
            ringId++
          }
          break
        } else if (!path.includes(nb) && path.length < 5) {
          const edgeTs = edgeTimes[`${cur}→${nb}`] || 0
          queue.push([nb, [...path, nb], edgeTs])
        }
      }
    }
  }
  return rings
}

/** 72h sliding window fan-in / fan-out detection, threshold ≥5 */
function _detectFanPatterns(accountMap) {
  const WINDOW_MS  = 72 * 3600 * 1000
  const THRESHOLD  = 5
  const fanIn  = new Set()
  const fanOut = new Set()

  for (const [id, acc] of Object.entries(accountMap)) {
    // Fan-in
    const inByWindow = {}
    acc.received.forEach(tx => {
      const bucket = Math.floor(tx._ts / WINDOW_MS)
      if (!inByWindow[bucket]) inByWindow[bucket] = new Set()
      inByWindow[bucket].add(tx.sender)
    })
    if (Object.values(inByWindow).some(s => s.size >= THRESHOLD)) fanIn.add(id)

    // Fan-out
    const outByWindow = {}
    acc.sent.forEach(tx => {
      const bucket = Math.floor(tx._ts / WINDOW_MS)
      if (!outByWindow[bucket]) outByWindow[bucket] = new Set()
      outByWindow[bucket].add(tx.receiver)
    })
    if (Object.values(outByWindow).some(s => s.size >= THRESHOLD)) fanOut.add(id)
  }
  return { fanIn, fanOut }
}

/** Velocity profiler: receive-to-send < 30 min or high burstiness */
function _detectVelocity(accountMap) {
  const RAPID_MS = 30 * 60 * 1000
  const flagged  = new Set()

  for (const [id, acc] of Object.entries(accountMap)) {
    // Rapid chain: receive → send < 30 min
    for (const rxTx of acc.received) {
      for (const txTx of acc.sent) {
        if (txTx._ts > rxTx._ts && txTx._ts - rxTx._ts < RAPID_MS) {
          flagged.add(id)
          break
        }
      }
      if (flagged.has(id)) break
    }

    // Burstiness: coefficient of variation of inter-transaction times
    if (!flagged.has(id)) {
      const all = [...acc.sent, ...acc.received].sort((a, b) => a._ts - b._ts)
      if (all.length >= 4) {
        const diffs = []
        for (let i = 1; i < all.length; i++) diffs.push(all[i]._ts - all[i-1]._ts)
        const mean = diffs.reduce((s, d) => s + d, 0) / diffs.length
        const variance = diffs.reduce((s, d) => s + (d - mean) ** 2, 0) / diffs.length
        const cv = Math.sqrt(variance) / (mean || 1)
        if (cv > 2) flagged.add(id) // high burstiness
      }
    }
  }
  return flagged
}

/** Pass-through: ratio ∈ [0.85, 1.15] with adequate transaction count */
function _detectPassthrough(accountMap) {
  const flagged = new Set()
  for (const [id, acc] of Object.entries(accountMap)) {
    if (acc.received.length < 2 || acc.sent.length < 2) continue
    const totalIn  = acc.received.reduce((s, t) => s + t.amount, 0)
    const totalOut = acc.sent.reduce((s, t) => s + t.amount, 0)
    if (totalIn === 0) continue
    const ratio = totalOut / totalIn
    if (ratio >= 0.85 && ratio <= 1.15) flagged.add(id)
  }
  return flagged
}

/** Personalized PageRank proxy seeded from flagged accounts, alpha=0.85, 2 hops */
function _computePageRankProxy(accountMap, accountIds, cycleParticipants, fanFlags, velocityFlags, passthroughFlags) {
  const scores = {}
  accountIds.forEach(id => { scores[id] = 0 })

  // Seed scores
  accountIds.forEach(id => {
    let seed = 0
    if (cycleParticipants.has(id)) seed += 0.4
    if (velocityFlags.has(id))     seed += 0.2
    if (fanFlags.fanIn.has(id))    seed += 0.2
    if (fanFlags.fanOut.has(id))   seed += 0.2
    if (passthroughFlags.has(id))  seed += 0.2
    scores[id] = seed
  })

  // Propagate 2 hops with alpha=0.85 decay
  const alpha = 0.85
  for (let hop = 0; hop < 2; hop++) {
    const next = { ...scores }
    accountIds.forEach(id => {
      const neighbors = Array.from(accountMap[id].neighbors)
      if (neighbors.length === 0) return
      const contribution = (scores[id] * alpha) / neighbors.length
      neighbors.forEach(nb => { next[nb] = (next[nb] || 0) + contribution })
    })
    Object.assign(scores, next)
  }
  return scores
}

/** False-positive reduction: merchant/payroll/hub discounts */
function _computeFPDiscounts(accountMap, accountIds, transactions) {
  const discounts = {}
  const totalTx = transactions.length || 1

  accountIds.forEach(id => {
    const acc = accountMap[id]
    let discount = 0

    // Transaction Diversity Index — high variety of counterparties = likely merchant
    const counterparties = new Set([
      ...acc.sent.map(t => t.receiver),
      ...acc.received.map(t => t.sender),
    ])
    const diversityRatio = counterparties.size / (acc.sent.length + acc.received.length + 1)
    if (diversityRatio > 0.8 && counterparties.size > 10) discount += 20

    // Amount Consistency Score — periodic same-amount inflows = likely payroll
    const inAmounts = acc.received.map(t => Math.round(t.amount))
    const amountFreq = {}
    inAmounts.forEach(a => { amountFreq[a] = (amountFreq[a] || 0) + 1 })
    const maxFreq = Math.max(...Object.values(amountFreq), 0)
    if (maxFreq >= 3 && maxFreq / (acc.received.length || 1) > 0.6) discount += 15

    // Degree Normalization — high degree hub with normal velocity = likely business
    const degree = acc.neighbors.size
    if (degree > 20 && acc.sent.length > 0) {
      const avgTimeBetween = (
        (acc.sent[acc.sent.length - 1]?._ts || 0) - (acc.sent[0]?._ts || 0)
      ) / (acc.sent.length || 1)
      if (avgTimeBetween > 3600000) discount += 15 // avg >1h between sends
    }

    discounts[id] = discount
  })
  return discounts
}

export function buildCytoscapeElements(transactions, suspiciousAccounts, selectedRingAccounts = []) {
  const accountScoreMap = {}
  suspiciousAccounts.forEach(acc => {
    accountScoreMap[acc.account_id] = acc
  })

  const nodeIds = new Set()
  const edges = []

  transactions.forEach((tx, i) => {
    nodeIds.add(tx.sender)
    nodeIds.add(tx.receiver)
    edges.push({
      data: {
        id: `edge_${i}`,
        source: tx.sender,
        target: tx.receiver,
        amount: tx.amount,
        timestamp: tx.timestamp,
        weight: Math.min(tx.amount / 10000, 8) + 1
      }
    })
  })

  const nodes = Array.from(nodeIds).map(id => {
    const accData = accountScoreMap[id]
    const score = accData?.suspicion_score || 0
    const inRing = selectedRingAccounts.includes(id)

    // Match backend risk classification
    const riskLevel =
      score > 80 ? 'critical' :
      score > 60 ? 'high' :
      score > 30 ? 'medium' : 'low'

    return {
      data: {
        id,
        label: id.length > 10 ? id.slice(0, 10) + '...' : id,
        score,
        riskLevel,
        patterns: accData?.patterns_detected || [],
        transactionCount: accData?.transaction_count || 0,
        volume: accData?.total_volume || 0,
        inRing
      }
    }
  })

  return { nodes, edges }
}

export function getRiskColor(score) {
  if (score > 80) return '#ff003c'   // CRITICAL
  if (score > 60) return '#ff6a00'   // HIGH
  if (score > 30) return '#f59e0b'   // MEDIUM
  return '#00ff88'                   // LOW
}

export function formatAmount(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount)
}
