import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAMLStore } from '../../context/store'
import { formatAmount } from '../../utils/amlEngine'

const patternDescriptions = {
  cycle_length_3: 'Circular transaction pattern: 3-node cycle (funds returning to originating account)',
  cycle_length_4: 'Circular transaction pattern: 4-node cycle (funds returning to originating account)',
  cycle_length_5: 'Circular transaction pattern: 5-node cycle (funds returning to originating account)',
  cycle:         'Circular transaction pattern: funds returning to originating account (Johnson\'s cycle, length 3–5)',
  high_velocity: 'High-velocity transfers: ≥3 outbound transactions within 60-minute window',
  fan_in:        'Fan-in aggregation: ≥3 distinct senders within 72h sliding window',
  fan_out:       'Fan-out dispersal: ≥3 distinct receivers within 72h sliding window',
  pass_through:  'Pass-through mule behavior: outgoing/incoming ratio > 0.9 with forwarding within 30 minutes',
  shell_chain:   'Shell pass-through: multi-hop chain with low-degree intermediaries',
  transaction_burst: 'Transaction burst: ≥200% above baseline activity',
  risk_propagation: 'Risk propagation: connected to high-risk account (≥70 suspicion score)',
  smurfing:      'Smurfing: multiple structured transactions just below reporting threshold',
  layering:      'Layering: multi-hop fund movement obscuring the origin trail',
}

const PatternTag = ({ pattern }) => (
  <div className="flex items-start gap-2 py-2 border-b border-slate-800/60 last:border-0">
    <div className="w-1.5 h-1.5 rounded-full bg-neon-red mt-1.5 flex-shrink-0 animate-pulse" />
    <p className="text-xs font-mono text-slate-300">{patternDescriptions[pattern] || pattern}</p>
  </div>
)

export default function NodeDetailPanel() {
  const { selectedNode, setSelectedNode } = useAMLStore()

  if (!selectedNode) return null

  const { score, riskLevel, patterns, transactionCount, volume, id, ringId, isMule, muleRole } = selectedNode

  const riskColor = riskLevel === 'critical' ? 'pink-400' : riskLevel === 'high' ? 'neon-red' : riskLevel === 'medium' ? 'orange-400' : 'neon-green'
  const riskLabel = riskLevel === 'critical' ? 'CRITICAL' : riskLevel?.toUpperCase()

  const scorePercent = score || 0

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 30 }}
        transition={{ duration: 0.3 }}
        className="glass-card border border-neon-blue/15 overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-700/50 flex items-center justify-between bg-neon-blue/5">
          <div>
            <p className="text-xs font-mono text-slate-400 tracking-widest uppercase mb-1">Account Analysis</p>
            <p className="font-display text-sm text-white font-bold">{id}</p>
          </div>
          <button
            onClick={() => setSelectedNode(null)}
            className="w-7 h-7 rounded-lg bg-slate-700/50 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Risk Score Gauge */}
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-xs font-mono text-slate-400 tracking-widest">RISK SCORE</span>
              <span className={`text-sm font-display font-black text-${riskColor}`}>{scorePercent}/100</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${scorePercent}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className={`h-full rounded-full ${
                  scorePercent > 80 ? 'bg-gradient-to-r from-red-600 to-neon-red' :
                  scorePercent > 50 ? 'bg-gradient-to-r from-orange-600 to-orange-400' :
                  'bg-gradient-to-r from-green-600 to-neon-green'
                }`}
              />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-slate-800/40 rounded-lg p-3">
              <div className="text-xs text-slate-500 font-mono mb-1">RISK LEVEL</div>
              <div className={`text-sm font-display font-black text-${riskColor}`}>{riskLabel}</div>
            </div>
            <div className="bg-slate-800/40 rounded-lg p-3">
              <div className="text-xs text-slate-500 font-mono mb-1">SUSPICION SCORE</div>
              <div className="text-sm font-display font-black text-white">{typeof score === 'number' ? score.toFixed(1) : score}</div>
            </div>
            {ringId && (
              <div className="bg-slate-800/40 rounded-lg p-3">
                <div className="text-xs text-slate-500 font-mono mb-1">RING ID</div>
                <div className="text-sm font-display font-black text-neon-red">{ringId}</div>
              </div>
            )}
            {isMule && (
              <div className="bg-slate-800/40 rounded-lg p-3">
                <div className="text-xs text-slate-500 font-mono mb-1">MULE ROLE</div>
                <div className="text-sm font-display font-black text-orange-400">{muleRole || 'Mule'}</div>
              </div>
            )}
            {transactionCount > 0 && (
              <div className="bg-slate-800/40 rounded-lg p-3">
                <div className="text-xs text-slate-500 font-mono mb-1">TX COUNT</div>
                <div className="text-sm font-display font-black text-white">{transactionCount}</div>
              </div>
            )}
            {volume > 0 && (
              <div className="bg-slate-800/40 rounded-lg p-3">
                <div className="text-xs text-slate-500 font-mono mb-1">TOTAL VOLUME</div>
                <div className="text-sm font-display font-black text-neon-blue">{formatAmount(volume)}</div>
              </div>
            )}
          </div>

          {/* Why flagged */}
          {patterns?.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1 h-4 bg-neon-red rounded-full" />
                <p className="text-xs font-mono text-neon-red tracking-widest uppercase">Flagged Due To</p>
              </div>
              <div className="bg-slate-900/60 rounded-lg px-3 py-1">
                {patterns.map((p, i) => <PatternTag key={i} pattern={p} />)}
              </div>
            </div>
          )}

          {/* Recommendation */}
          <div className="bg-neon-red/5 border border-neon-red/20 rounded-lg p-3">
            <p className="text-xs font-mono text-neon-red tracking-widest mb-1">ACTION REQUIRED</p>
            <p className="text-xs text-slate-300">
              {scorePercent > 80
                ? 'CRITICAL: Immediate account freeze and SAR filing required.'
                : scorePercent > 60
                ? 'HIGH: Enhanced due diligence and escalation required.'
                : scorePercent > 30
                ? 'MEDIUM: Enhanced monitoring. Review within 48h.'
                : 'LOW: Flag for periodic review.'}
            </p>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
