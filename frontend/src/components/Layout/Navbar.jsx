import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAMLStore } from '../../context/store'

export default function Navbar({ showControls = false }) {
  const navigate = useNavigate()
  const { toggleHeatmapMode, heatmapMode, reset } = useAMLStore()

  const handleNewScan = () => {
    reset()
    navigate('/')
  }

  return (
    <nav className="border-b border-slate-800/80 bg-dark-950/90 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-full px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded border border-neon-blue/40 flex items-center justify-center">
            <div className="w-3 h-3 bg-neon-blue rounded-sm rotate-45" />
          </div>
          <div>
            <span className="font-display text-sm font-bold text-white tracking-widest">FINGUARD</span>
            <span className="font-display text-sm font-bold text-neon-blue tracking-widest"> AI</span>
          </div>
          <div className="ml-2 px-2 py-0.5 bg-neon-red/10 border border-neon-red/30 rounded">
            <span className="text-xs font-mono text-neon-red tracking-widest">AML ENGINE</span>
          </div>
        </div>

        {/* Center status */}
        {showControls && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
            <span className="text-xs font-mono text-neon-green tracking-widest">SYSTEM ACTIVE</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3">
          {showControls && (
            <button
              onClick={toggleHeatmapMode}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg border text-xs font-mono tracking-widest transition-all duration-300 ${
                heatmapMode
                  ? 'border-neon-red/50 bg-neon-red/10 text-neon-red'
                  : 'border-slate-600 text-slate-400 hover:border-neon-blue/40'
              }`}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${heatmapMode ? 'bg-neon-red animate-pulse' : 'bg-slate-500'}`} />
              HEATMAP {heatmapMode ? 'ON' : 'OFF'}
            </button>
          )}
          
          <button
            onClick={handleNewScan}
            className="px-4 py-1.5 rounded-lg border border-neon-blue/30 text-neon-blue text-xs font-mono tracking-widest hover:bg-neon-blue/10 transition-colors"
          >
            NEW SCAN
          </button>
        </div>
      </div>
    </nav>
  )
}
