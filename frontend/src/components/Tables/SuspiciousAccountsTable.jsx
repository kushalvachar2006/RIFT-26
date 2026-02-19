import React, { useState, useMemo } from 'react'
import { useAMLStore } from '../../context/store'

const RiskBadge = ({ level }) => {
  if (!level) return <span className="text-slate-600">—</span>
  if (level === 'CRITICAL') return <span className="risk-badge-high inline-block" style={{ background: 'rgba(236,72,153,0.15)', color: '#f472b6', borderColor: 'rgba(236,72,153,0.4)', overflow: 'visible' }}>CRIT</span>
  if (level === 'HIGH') return <span className="risk-badge-high inline-block" style={{ overflow: 'visible' }}>HIGH</span>
  if (level === 'MEDIUM') return <span className="risk-badge-medium inline-block" style={{ overflow: 'visible' }}>MED</span>
  return <span className="risk-badge-low inline-block" style={{ overflow: 'visible' }}>LOW</span>
}

const MuleBadge = ({ isMule, role }) => {
  if (!isMule) return <span className="text-slate-600">—</span>
  const roleLabel = role ? role.toLowerCase() : 'mule'
  return (
    <span className="inline-block text-[10px] font-mono px-1.5 py-0.5 rounded border bg-orange-500/10 text-orange-300 border-orange-500/40 whitespace-nowrap" style={{ overflow: 'visible' }}>
      {roleLabel}
    </span>
  )
}

export default function SuspiciousAccountsTable({ accounts = [] }) {
  const { setSelectedNode, setSelectedRing } = useAMLStore()
  const [sortBy, setSortBy] = useState('suspicion_score')

  // Memoize sorted accounts for performance
  const sortedAccounts = useMemo(() => {
    return [...accounts].sort((a, b) => {
      const aVal = a[sortBy] ?? 0
      const bVal = b[sortBy] ?? 0
      return bVal - aVal
    })
  }, [accounts, sortBy])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-display font-bold text-white tracking-widest">SUSPICIOUS ACCOUNTS</h3>
        <span className="risk-badge-medium">{accounts.length} FLAGGED</span>
      </div>

      <div className="overflow-y-auto flex-1 overflow-x-visible">
        <table className="w-full text-xs" style={{ tableLayout: 'auto' }}>
          <thead className="sticky top-0 bg-dark-900">
            <tr className="text-left">
              <th className="font-mono text-slate-500 pb-2 pr-2 tracking-widest">ACCOUNT</th>
              <th className="font-mono text-slate-500 pb-2 pr-2 tracking-widest">SCORE</th>
              <th className="font-mono text-slate-500 pb-2 pr-2 tracking-widest">PATTERNS</th>
              <th className="font-mono text-slate-500 pb-2 pr-2 tracking-widest">MULE</th>
              <th className="font-mono text-slate-500 pb-2 pr-2 tracking-widest">RISK</th>
            </tr>
          </thead>
          <tbody>
            {sortedAccounts.map((acc, i) => (
              <tr
                key={i}
                className="table-row-hover border-t border-slate-800/50 cursor-pointer"
                onClick={() => {
                  // Update selected node details panel
                  const patterns = acc.patterns_detected || acc.detected_patterns || []
                  setSelectedNode({
                    id: acc.account_id,
                    score: acc.suspicion_score,
                    riskLevel: acc.risk_level?.toLowerCase(),
                    patterns: patterns,
                    transactionCount: acc.transaction_count || 0,
                    volume: acc.total_volume || 0,
                    isMule: acc.is_mule || false,
                    muleRole: acc.mule_role || null,
                    ringId: acc.ring_id || null
                  })
                  // If account is part of a fraud ring, also select that ring
                  if (acc.ring_id) {
                    setSelectedRing(acc.ring_id)
                  }
                }}
              >
                <td className="py-2 pr-3 font-mono text-slate-300" style={{ overflow: 'visible' }}>
                  {acc.account_id}
                </td>
                <td className="py-2 pr-3" style={{ overflow: 'visible' }}>
                  <div className="flex items-center gap-2">
                    <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${acc.suspicion_score > 80 ? 'bg-pink-400' :
                          acc.suspicion_score > 60 ? 'bg-neon-red' :
                            acc.suspicion_score > 30 ? 'bg-orange-400' : 'bg-neon-green'
                          }`}
                        style={{ width: `${Math.min(Math.max(acc.suspicion_score || 0, 0), 100)}%` }}
                      />
                    </div>
                    <span className={`font-mono font-bold text-xs ${acc.suspicion_score > 80 ? 'text-pink-400' :
                      acc.suspicion_score > 60 ? 'text-neon-red' :
                        acc.suspicion_score > 30 ? 'text-orange-400' : 'text-neon-green'
                      }`}>
                      {typeof acc.suspicion_score === 'number' ? acc.suspicion_score.toFixed(1) : acc.suspicion_score}
                    </span>
                  </div>
                </td>
                <td className="py-2 pr-3 text-slate-400 font-mono" style={{ overflow: 'visible' }}>
                  {(acc.patterns_detected || acc.detected_patterns || []).join(', ')}
                </td>
                <td className="py-2 pr-3" style={{ overflow: 'visible' }}>
                  <MuleBadge isMule={acc.is_mule} role={acc.mule_role} />
                </td>
                <td className="py-2 pr-3" style={{ overflow: 'visible' }}>
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
