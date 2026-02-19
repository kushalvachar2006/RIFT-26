import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAMLStore } from '../context/store'
import Navbar from '../components/Layout/Navbar'
import MetricCards from '../components/UI/MetricCards'
import NodeDetailPanel from '../components/UI/NodeDetailPanel'
import TransactionGraph from '../components/Graph/TransactionGraph'
import SuspiciousAccountsTable from '../components/Tables/SuspiciousAccountsTable'
import FraudRingsTable from '../components/Tables/FraudRingsTable'
import AnalyticsCharts from '../components/Charts/AnalyticsCharts'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { analysisResult, selectedNode, heatmapMode } = useAMLStore()
  const [rightTab, setRightTab] = useState('accounts')

  if (!analysisResult) {
    navigate('/')
    return null
  }

  const { suspicious_accounts, fraud_rings, summary } = analysisResult

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col">
      <div className="scan-overlay" />
      <Navbar showControls />

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
          <MetricCards summary={summary} />

          {/* Node Detail (when selected) */}
          {selectedNode && <NodeDetailPanel />}

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
          className="flex-1 flex flex-col overflow-hidden"
        >
          {/* Graph container */}
          <div className="flex-1 relative grid-bg border-b border-slate-800/40">
            <TransactionGraph analysisResult={analysisResult} />
          </div>

          {/* Analytics bottom strip */}
          <div className="h-56 flex-shrink-0 p-4 border-t border-slate-800/60 overflow-hidden">
            <AnalyticsCharts analysisResult={analysisResult} />
          </div>
        </motion.div>

        {/* RIGHT PANEL */}
        <motion.div
          initial={{ x: 30, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="w-80 flex-shrink-0 border-l border-slate-800/60 flex flex-col"
        >
          {/* Tab selector */}
          <div className="flex border-b border-slate-800/60">
            {['accounts', 'rings'].map(tab => (
              <button
                key={tab}
                onClick={() => setRightTab(tab)}
                className={`flex-1 py-3 text-xs font-mono tracking-widest uppercase transition-all duration-200 ${
                  rightTab === tab
                    ? 'text-neon-blue border-b-2 border-neon-blue bg-neon-blue/5'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {tab === 'accounts' ? `Accounts (${suspicious_accounts.length})` : `Rings (${fraud_rings.length})`}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-hidden p-4">
            {rightTab === 'accounts' ? (
              <SuspiciousAccountsTable accounts={suspicious_accounts} />
            ) : (
              <FraudRingsTable rings={fraud_rings} />
            )}
          </div>

          {/* Bottom export actions */}
          <div className="p-4 border-t border-slate-800/60 flex gap-2">
            <button
              onClick={() => {
                const data = JSON.stringify(analysisResult, null, 2)
                const blob = new Blob([data], { type: 'application/json' })
                const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
                a.download = 'aml_report.json'; a.click()
              }}
              className="flex-1 py-2 px-3 rounded-lg border border-neon-blue/20 text-neon-blue text-xs font-mono tracking-widest hover:bg-neon-blue/10 transition-colors"
            >
              EXPORT JSON
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
