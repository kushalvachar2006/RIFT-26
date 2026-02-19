import React from 'react'
import { useAMLStore } from '../../context/store'

export default function FraudRingsTable({ rings = [] }) {
  const { selectedRing, setSelectedRing } = useAMLStore()

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-display font-bold text-white tracking-widest">FRAUD RINGS</h3>
        <span className="risk-badge-high">{rings.length} DETECTED</span>
      </div>

      <div className="overflow-y-auto flex-1 space-y-2">
        {rings.map((ring, i) => {
          const isSelected = selectedRing === ring.ring_id
          return (
            <div
              key={i}
              onClick={() => setSelectedRing(isSelected ? null : ring.ring_id)}
              className={`rounded-lg p-3 border cursor-pointer transition-all duration-200 ${
                isSelected
                  ? 'border-neon-blue/50 bg-neon-blue/10 shadow-neon-blue'
                  : 'border-slate-700/50 bg-slate-800/20 hover:border-neon-red/30 hover:bg-neon-red/5'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-xs font-display font-bold text-white">{ring.ring_id}</p>
                  <p className="text-xs font-mono text-slate-400 mt-0.5">{ring.pattern_type} · {ring.transaction_count} txns</p>
                </div>
                <span className="risk-badge-high" style={ring.risk_level === 'CRITICAL' ? { background: 'rgba(236,72,153,0.15)', color: '#f472b6', borderColor: 'rgba(236,72,153,0.4)' } : {}}>
                  {ring.risk_level}
                </span>
              </div>
              
              <div className="flex flex-wrap gap-1">
                {ring.accounts?.slice(0, 4).map((acc, j) => (
                  <span key={j} className="text-xs font-mono bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
                    {acc.length > 8 ? acc.slice(0, 8) + '…' : acc}
                  </span>
                ))}
                {ring.accounts?.length > 4 && (
                  <span className="text-xs font-mono text-slate-500">+{ring.accounts.length - 4} more</span>
                )}
              </div>

              {isSelected && (
                <p className="text-xs font-mono text-neon-blue mt-2">
                  ↗ Ring highlighted in graph
                </p>
              )}
            </div>
          )
        })}
        {rings.length === 0 && (
          <div className="text-center py-8 text-slate-600 font-mono text-xs">No fraud rings detected</div>
        )}
      </div>
    </div>
  )
}
