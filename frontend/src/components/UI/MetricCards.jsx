import React from 'react'
import { motion } from 'framer-motion'

const metrics = (summary) => [
  {
    label: 'Total Transactions',
    value: summary?.total_transactions ?? 0,
    description: 'Number of transactions analyzed',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    ),
    color: 'blue',
    suffix: ''
  },
  {
    label: 'Suspicious Accounts',
    value: summary?.suspicious_account_count ?? 0,
    description: 'Accounts with unusual patterns detected',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    color: 'orange',
    suffix: ''
  },
  {
    label: 'Fraud Rings Detected',
    value: summary?.fraud_rings_detected ?? 0,
    description: 'Circular money flow networks (most critical)',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
    color: 'red',
    suffix: ''
  },
  {
    label: 'Critical Risk',
    value: summary?.critical_count ?? summary?.high_risk_count ?? 0,
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
    ),
    color: 'critical',
    suffix: ''
  },
  {
    label: 'Processing Time',
    value: summary?.processing_time_seconds ?? summary?.processing_time ?? '0.00',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    color: 'green',
    suffix: 's'
  }
]

const colorMap = {
  blue:     { text: 'text-neon-blue',   border: 'border-neon-blue/20',   bg: 'bg-neon-blue/10',   glow: 'shadow-neon-blue' },
  orange:   { text: 'text-orange-400',  border: 'border-orange-400/20',  bg: 'bg-orange-400/10',  glow: '' },
  red:      { text: 'text-neon-red',    border: 'border-neon-red/20',    bg: 'bg-neon-red/10',    glow: 'shadow-neon-red' },
  critical: { text: 'text-pink-400',    border: 'border-pink-400/20',    bg: 'bg-pink-400/10',    glow: '' },
  green:    { text: 'text-neon-green',  border: 'border-neon-green/20',  bg: 'bg-neon-green/10',  glow: '' },
}

export default function MetricCards({ summary }) {
  const cards = metrics(summary)

  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map((card, i) => {
        const c = colorMap[card.color]
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`glass-card metric-card p-4 border ${c.border}`}
          >
            <div className={`w-8 h-8 rounded-lg ${c.bg} flex items-center justify-center ${c.text} mb-3`}>
              {card.icon}
            </div>
            <div className={`text-2xl font-display font-black ${c.text} mb-1`}>
              {card.value}{card.suffix}
            </div>
            <div className="text-xs font-mono text-slate-400 tracking-widest uppercase">
              {card.label}
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
