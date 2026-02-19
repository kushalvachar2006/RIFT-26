import React, { useState } from 'react'
import { useAMLStore } from '../../context/store'

const RiskBadge = ({ level }) => {
  if (level === 'CRITICAL') return <span className="risk-badge-high" style={{ background: 'rgba(236,72,153,0.15)', color: '#f472b6', borderColor: 'rgba(236,72,153,0.4)' }}>CRIT</span>
  if (level === 'HIGH')     return <span className="risk-badge-high">HIGH</span>
  if (level === 'MEDIUM')   return <span className="risk-badge-medium">MED</span>
  return <span className="risk-badge-low">LOW</span>
}

export default function SuspiciousAccountsTable({ accounts = [] }) {
  const { setSelectedNode } = useAMLStore()
  const [sortBy, setSortBy] = useState('suspicion_score')

  const sorted = [...accounts].sort((a, b) => b[sortBy] - a[sortBy])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-display font-bold text-white tracking-widest">SUSPICIOUS ACCOUNTS</h3>
        <span className="risk-badge-medium">{accounts.length} FLAGGED</span>
      </div>
      
      <div className="overflow-y-auto flex-1">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-dark-900">
            <tr className="text-left">
              <th className="font-mono text-slate-500 pb-2 pr-3 tracking-widest">ACCOUNT</th>
              <th className="font-mono text-slate-500 pb-2 pr-3 tracking-widest">SCORE</th>
              <th className="font-mono text-slate-500 pb-2 pr-3 tracking-widest">PATTERNS</th>
              <th className="font-mono text-slate-500 pb-2 tracking-widest">RISK</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((acc, i) => (
              <tr
                key={i}
                className="table-row-hover border-t border-slate-800/50"
                onClick={() => setSelectedNode({
                  id: acc.account_id,
                  score: acc.suspicion_score,
                  riskLevel: acc.risk_level?.toLowerCase(),
                  patterns: acc.patterns_detected,
                  transactionCount: acc.transaction_count,
                  volume: acc.total_volume
                })}
              >
                <td className="py-2 pr-3 font-mono text-slate-300 truncate max-w-[80px]">
                  {acc.account_id}
                </td>
                <td className="py-2 pr-3">
                  <div className="flex items-center gap-2">
                    <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          acc.suspicion_score > 80 ? 'bg-pink-400' :
                          acc.suspicion_score > 60 ? 'bg-neon-red' :
                          acc.suspicion_score > 30 ? 'bg-orange-400' : 'bg-neon-green'
                        }`}
                        style={{ width: `${acc.suspicion_score}%` }}
                      />
                    </div>
                    <span className={`font-mono font-bold ${
                      acc.suspicion_score > 80 ? 'text-pink-400' :
                      acc.suspicion_score > 60 ? 'text-neon-red' :
                      acc.suspicion_score > 30 ? 'text-orange-400' : 'text-neon-green'
                    }`}>{acc.suspicion_score}</span>
                  </div>
                </td>
                <td className="py-2 pr-3 text-slate-400 font-mono truncate max-w-[100px]">
                  {acc.patterns_detected?.slice(0, 2).join(', ')}
                </td>
                <td className="py-2">
                  <RiskBadge level={acc.risk_level} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {accounts.length === 0 && (
          <div className="text-center py-8 text-slate-600 font-mono text-xs">No suspicious accounts detected</div>
        )}
      </div>
    </div>
  )
}
