import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAMLStore } from '../context/store'
import Navbar from '../components/Layout/Navbar'
import MetricCards from '../components/UI/MetricCards'
import NodeDetailPanel from '../components/UI/NodeDetailPanel'
import TransactionGraph from '../components/Graph/TransactionGraph'
import SuspiciousAccountsTable from '../components/Tables/SuspiciousAccountsTable'
import FraudRingsSummaryTable from '../components/Tables/FraudRingsSummaryTable'
import AnalyticsCharts from '../components/Charts/AnalyticsCharts'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { analysisResult, selectedNode, heatmapMode, toggleHeatmapMode } = useAMLStore()
  const [rightTab, setRightTab] = useState('accounts')
  const [highlightFraudPatterns, setHighlightFraudPatterns] = useState(true)

  if (!analysisResult) {
    navigate('/')
    return null
  }

  const { suspicious_accounts, fraud_rings, summary } = analysisResult

  return (
    <div className="h-screen bg-dark-950 flex flex-col overflow-hidden">
      <div className="scan-overlay" />
      <Navbar showControls />

      {/* RIFT Title and Controls */}
      <div className="bg-dark-900 border-b border-slate-800/60 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-white mb-1">
              Graph-Based Money Muling Network Analysis
            </h1>
            <p className="text-xs font-mono text-slate-400">
              RIFT 2026 Hackathon • Financial Crime Detection Dashboard
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-xs font-mono text-slate-400">Raw Graph</label>
              <button
                onClick={() => setHighlightFraudPatterns(!highlightFraudPatterns)}
                className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${highlightFraudPatterns ? 'bg-neon-blue' : 'bg-slate-700'
                  }`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ${highlightFraudPatterns ? 'translate-x-7' : 'translate-x-1'
                  }`} />
              </button>
              <label className="text-xs font-mono text-slate-400">Highlight Fraud Patterns</label>
            </div>
            <button
              onClick={toggleHeatmapMode}
              className={`px-3 py-1.5 rounded-lg border text-xs font-mono tracking-widest transition-all duration-200 ${heatmapMode
                ? 'bg-neon-red/10 border-neon-red/30 text-neon-red'
                : 'border-slate-600 text-slate-400 hover:border-slate-400'
                }`}
            >
              {heatmapMode ? 'HEATMAP ON' : 'HEATMAP OFF'}
            </button>
          </div>
        </div>
      </div>

      {/* Heatmap mode banner */}
      {heatmapMode && (
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: 'auto' }}
          className="bg-neon-red/10 border-b border-neon-red/30 px-6 py-2 flex items-center gap-3"
        >
          <div className="w-2 h-2 rounded-full bg-neon-red animate-pulse" />
          <span className="text-xs font-mono text-neon-red tracking-widest">
            FRAUD PROPAGATION HEATMAP MODE ACTIVE — Node colors represent propagated risk intensity
          </span>
        </motion.div>
      )}

      {/* Main 3-column layout */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT PANEL */}
        <motion.div
          initial={{ x: -30, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="w-72 flex-shrink-0 border-r border-slate-800/60 p-4 flex flex-col gap-4 overflow-y-auto"
        >
          {/* Status */}
          <div className="glass-card p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-neon-green/10 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-neon-green animate-pulse" />
            </div>
            <div>
              <p className="text-xs font-mono text-neon-green tracking-widest">SCAN COMPLETE</p>
              <p className="text-xs text-slate-500 font-mono">{new Date().toLocaleTimeString()}</p>
            </div>
          </div>

          {/* Metrics */}
          <MetricCards
            summary={summary}
            onSuspiciousClick={() => setRightTab('accounts')}
          />

          {/* Node Detail (when selected) */}
          {selectedNode && (
            <div className="glass-card flex-shrink-0 min-h-[180px] max-h-72 overflow-y-auto overflow-x-hidden">
              <NodeDetailPanel />
            </div>
          )}

          {/* Source file info */}
          <div className="glass-card p-4 mt-auto">
            <p className="text-xs font-mono text-slate-500 tracking-widest mb-2">DETECTION ALGORITHMS</p>
            {['Cycle Detection (Johnson\'s 3–5)', 'Fan-In/Out (72h Window)', 'Velocity Profiling (<30min)', 'Pass-Through / Shell Chain', 'Smurfing Detection', 'PageRank Risk Propagation', 'False Positive Reduction'].map((a, i) => (
              <div key={i} className="flex items-center gap-2 py-1">
                <div className="w-1 h-1 rounded-full bg-neon-blue" />
                <span className="text-xs font-mono text-slate-400">{a}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* CENTER — Graph */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="flex-1 flex flex-col overflow-y-auto"
        >
          {/* Graph container */}
          <div className="flex-1 min-h-[300px] relative grid-bg border-b border-slate-800/40 flex items-center justify-center">
            <TransactionGraph
              analysisResult={analysisResult}
              highlightFraudPatterns={highlightFraudPatterns}
            />
          </div>

          {/* Analytics bottom strip */}
          <div className="h-56 flex-shrink-0 p-4 border-t border-slate-800/60">
            <AnalyticsCharts analysisResult={analysisResult} />
          </div>
        </motion.div>

        {/* RIGHT PANEL */}
        <motion.div
          initial={{ x: 30, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="w-80 flex-shrink-0 border-l border-slate-800/60 flex flex-col overflow-hidden"
        >
          {/* Tab selector */}
          <div className="flex border-b border-slate-800/60">
            {['accounts', 'rings'].map(tab => (
              <button
                key={tab}
                onClick={() => setRightTab(tab)}
                className={`flex-1 py-3 text-xs font-mono tracking-widest uppercase transition-all duration-200 ${rightTab === tab
                  ? 'text-neon-blue border-b-2 border-neon-blue bg-neon-blue/5'
                  : 'text-slate-500 hover:text-slate-300'
                  }`}
              >
                {tab === 'accounts' ? `Accounts (${suspicious_accounts.length})` : `Rings (${fraud_rings.length})`}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {rightTab === 'accounts' ? (
              <SuspiciousAccountsTable accounts={suspicious_accounts} />
            ) : (
              <FraudRingsSummaryTable rings={fraud_rings} />
            )}
          </div>

          {/* Bottom export actions */}
          <div className="p-4 border-t border-slate-800/60 flex gap-2">
            <button
        onClick={() => {
          // Build strict RIFT-compliant JSON payload from analysisResult
          const riftPayload = {
            suspicious_accounts: (analysisResult.suspicious_accounts || []).map(acc => ({
              account_id: acc.account_id,
              suspicion_score: typeof acc.suspicion_score === 'number' ? parseFloat(acc.suspicion_score.toFixed(1)) : acc.suspicion_score,
              detected_patterns: acc.patterns_detected || acc.detected_patterns || [],
              ring_id: acc.ring_id ?? null,
              is_mule: acc.is_mule ?? null,
              mule_role: acc.mule_role ?? null,
            })),
            fraud_rings: (analysisResult.fraud_rings || []).map(ring => ({
              ring_id: ring.ring_id,
              member_accounts: ring.member_accounts || ring.accounts || [],
              pattern_type: ring.pattern_type,
              risk_score: typeof ring.risk_score === 'number' ? parseFloat(ring.risk_score.toFixed(1)) : (ring.risk_score ?? 0),
            })),
            summary: {
              total_accounts_analyzed: analysisResult.summary?.total_accounts_analyzed ?? 0,
              suspicious_accounts_flagged: analysisResult.summary?.suspicious_accounts_flagged ?? 0,
              fraud_rings_detected: analysisResult.summary?.fraud_rings_detected ?? 0,
              processing_time_seconds: analysisResult.summary?.processing_time_seconds ?? 0,
            },
          }

          const data = JSON.stringify(riftPayload, null, 2)
          const blob = new Blob([data], { type: 'application/json' })
          const a = document.createElement('a')
          a.href = URL.createObjectURL(blob)
          a.download = 'rift_fraud_analysis_report.json'
          a.click()
        }}
        className="flex-1 py-2 px-3 rounded-lg border border-neon-blue/20 text-neon-blue text-xs font-mono tracking-widest hover:bg-neon-blue/10 transition-colors"
      >
        Download JSON Report
      </button>
            <button
              onClick={() => window.print()}
              className="flex-1 py-2 px-3 rounded-lg border border-slate-600 text-slate-400 text-xs font-mono tracking-widest hover:border-slate-400 transition-colors"
            >
              PRINT REPORT
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
