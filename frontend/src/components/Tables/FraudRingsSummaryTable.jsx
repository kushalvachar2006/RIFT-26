import React from 'react'
import { useAMLStore } from '../../context/store'

const RiskBadge = ({ level }) => {
  if (level === 'CRITICAL') return <span className="risk-badge-high" style={{ background: 'rgba(236,72,153,0.15)', color: '#f472b6', borderColor: 'rgba(236,72,153,0.4)' }}>CRITICAL</span>
  if (level === 'HIGH')     return <span className="risk-badge-high">HIGH</span>
  if (level === 'MEDIUM')   return <span className="risk-badge-medium">MEDIUM</span>
  return <span className="risk-badge-low">LOW</span>
}

export default function FraudRingsSummaryTable({ rings = [] }) {
  const { selectedRing, setSelectedRing } = useAMLStore()

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-display font-bold text-white tracking-widest">FRAUD RING SUMMARY</h3>
        <span className="risk-badge-high">{rings.length} RINGS DETECTED</span>
      </div>

      {/* RIFT Fault 3: Mandatory Fraud Ring Summary Table - Ring ID, Pattern Type, Member Count, Risk Score, Member Account IDs */}
      <div className="overflow-y-auto flex-1">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-dark-900">
            <tr className="text-left">
              <th className="font-mono text-slate-500 pb-2 pr-3 tracking-widest">RING ID</th>
              <th className="font-mono text-slate-500 pb-2 pr-3 tracking-widest">PATTERN TYPE</th>
              <th className="font-mono text-slate-500 pb-2 pr-3 tracking-widest">MEMBER COUNT</th>
              <th className="font-mono text-slate-500 pb-2 pr-3 tracking-widest">RISK SCORE</th>
              <th className="font-mono text-slate-500 pb-2 tracking-widest">MEMBER ACCOUNT IDs</th>
            </tr>
          </thead>
          <tbody>
            {rings.map((ring, i) => {
              const isSelected = selectedRing === ring.ring_id
              return (
                <tr
                  key={i}
                  className={`table-row-hover border-t border-slate-800/50 cursor-pointer ${
                    isSelected ? 'bg-neon-blue/5 border-neon-blue/30' : ''
                  }`}
                  onClick={() => setSelectedRing(isSelected ? null : ring.ring_id)}
                >
                  <td className="py-2 pr-3 font-mono text-white">
                    {ring.ring_id}
                  </td>
                  <td className="py-2 pr-3">
                    <span className="text-xs font-mono text-neon-blue">
                      {ring.pattern_type || 'Unknown'}
                    </span>
                  </td>
                  <td className="py-2 pr-3">
                    <span className="font-mono text-white">
                      {(ring.accounts || ring.member_accounts)?.length ?? 0}
                    </span>
                  </td>
                  <td className="py-2 pr-3">
                    <div className="flex items-center gap-2">
                      <RiskBadge level={ring.risk_level} />
                      <span className="font-mono text-white text-xs">
                        {typeof ring.risk_score === 'number' ? ring.risk_score.toFixed(1) : (ring.risk_score ?? 'N/A')}
                      </span>
                    </div>
                  </td>
                  <td className="py-2">
                    <div className="max-w-[160px]">
                      <span 
                        className="text-xs font-mono text-slate-300"
                        title={(ring.accounts || ring.member_accounts || []).join(', ')}
                      >
                        {(ring.accounts || ring.member_accounts || []).join(', ')}
                      </span>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        
        {rings.length === 0 && (
          <div className="text-center py-8 text-slate-600 font-mono text-xs">
            No fraud rings detected
          </div>
        )}
      </div>

      {/* Ring details when selected */}
      {selectedRing && (() => {
        const selectedRingData = rings.find(r => r.ring_id === selectedRing)
        if (!selectedRingData) return null

        const totalAmount = selectedRingData.total_volume ?? 0
        const timeWindowLabel = selectedRingData.time_window || 'Not available'

        return (
          <div className="mt-3 p-3 rounded-lg bg-neon-blue/5 border border-neon-blue/20">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-display font-bold text-neon-blue">
                {selectedRingData.ring_id} Details
              </h4>
              <button
                onClick={() => setSelectedRing(null)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Pattern Type:</span>
                <span className="font-mono text-white">{selectedRingData.pattern_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Risk Score:</span>
                <span className="font-mono text-white">
                  {typeof selectedRingData.risk_score === 'number' 
                    ? selectedRingData.risk_score.toFixed(1) 
                    : (selectedRingData.risk_score ?? 'N/A')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Member Count:</span>
                <span className="font-mono text-white">
                  {(selectedRingData.accounts || selectedRingData.member_accounts)?.length ?? 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Amount (estimated):</span>
                <span className="font-mono text-white">
                  ${totalAmount.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Time Window:</span>
                <span className="font-mono text-white">{timeWindowLabel}</span>
              </div>
            </div>

            <p className="text-xs font-mono text-neon-blue mt-2">
              ↗ Ring highlighted in graph visualization
            </p>
          </div>
        )
      })()}
    </div>
  )
}
