import React from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'

const COLORS = ['#ff003c', '#ff6a00', '#00ff88', '#00f0ff']

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-card px-3 py-2">
        <p className="text-xs font-mono text-slate-400">{label}</p>
        {payload.map((p, i) => (
          <p key={i} className="text-xs font-mono font-bold" style={{ color: p.color }}>{p.value}</p>
        ))}
      </div>
    )
  }
  return null
}

export default function AnalyticsCharts({ analysisResult }) {
  if (!analysisResult) return null

  const { suspicious_accounts, fraud_rings, summary } = analysisResult

  // Risk score distribution — 4-level classification matching backend
  const scoreDistribution = [
    { range: 'LOW\n0–39',    count: suspicious_accounts.filter(a => a.suspicion_score < 40).length,  fill: '#00ff88' },
    { range: 'MED\n40–59',   count: suspicious_accounts.filter(a => a.suspicion_score >= 40 && a.suspicion_score < 60).length, fill: '#f59e0b' },
    { range: 'HIGH\n60–79',  count: suspicious_accounts.filter(a => a.suspicion_score >= 60 && a.suspicion_score < 80).length,  fill: '#ff6a00' },
    { range: 'CRIT\n80–100', count: suspicious_accounts.filter(a => a.suspicion_score >= 80).length,  fill: '#ff003c' },
  ]

  // Top suspicious accounts by score for visualization
  const topAccounts = [...suspicious_accounts]
    .sort((a, b) => b.suspicion_score - a.suspicion_score)
    .slice(0, 10)
    .map(acc => ({
      account: acc.account_id.slice(-4), // Last 4 chars for readability
      score: acc.suspicion_score.toFixed(1)
    }))

  // Pattern frequency — map backend label to readable name
  const patternLabels = {
    cycle:         'Cycle',
    high_velocity: 'Velocity',
    fan_in:        'Fan-In',
    fan_out:       'Fan-Out',
    pass_through:  'Pass-Through',
    shell_chain:   'Shell',
    smurfing:      'Smurf',
    layering:      'Layer',
  }
  const patternCount = {}
  suspicious_accounts.forEach(acc => {
    const patterns = acc.patterns_detected || acc.patterns || []
    patterns.forEach(p => {
      const label = patternLabels[p] || p
      patternCount[label] = (patternCount[label] || 0) + 1
    })
  })
  const patternData = Object.entries(patternCount).map(([name, value]) => ({ name, value }))

  const chartStyle = {
    fontSize: '10px',
    fontFamily: 'JetBrains Mono',
    fill: '#64748b'
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      {/* Risk Score Distribution */}
      <div className="glass-card p-4">
        <h3 className="text-xs font-display text-slate-400 tracking-widest mb-4">RISK SCORE DISTRIBUTION</h3>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={scoreDistribution} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <XAxis dataKey="range" tick={chartStyle} axisLine={false} tickLine={false} />
            <YAxis tick={chartStyle} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {scoreDistribution.map((entry, i) => (
                <Cell key={i} fill={entry.fill} fillOpacity={0.8} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top Suspicious Accounts */}
      <div className="glass-card p-4">
        <h3 className="text-xs font-display text-slate-400 tracking-widest mb-4">TOP SUSPICIOUS ACCOUNTS</h3>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={topAccounts} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
            <XAxis type="number" tick={chartStyle} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="account" tick={chartStyle} axisLine={false} tickLine={false} width={40} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="score" fill="#ff003c" fillOpacity={0.8} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Pattern Frequency */}
      <div className="glass-card p-4">
        <h3 className="text-xs font-display text-slate-400 tracking-widest mb-4">PATTERN FREQUENCY</h3>
        <ResponsiveContainer width="100%" height={160}>
          <PieChart>
            <Pie
              data={patternData.length ? patternData : [{ name: 'No patterns', value: 1 }]}
              cx="50%"
              cy="50%"
              innerRadius={35}
              outerRadius={60}
              paddingAngle={3}
              dataKey="value"
            >
              {(patternData.length ? patternData : [{ name: 'No patterns', value: 1 }]).map((entry, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} fillOpacity={0.8} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              iconSize={8}
              iconType="circle"
              wrapperStyle={{ fontSize: '9px', fontFamily: 'JetBrains Mono', color: '#64748b' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
