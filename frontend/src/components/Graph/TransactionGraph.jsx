import React, { useEffect, useRef, useCallback, useMemo } from 'react'
import cytoscape from 'cytoscape'
import fcose from 'cytoscape-fcose'
import popper from 'cytoscape-popper'
import { useAMLStore } from '../../context/store'
import { getRiskColor } from '../../utils/amlEngine'

// Register plugins
cytoscape.use(fcose)
cytoscape.use(popper)

export default function TransactionGraph({ analysisResult, highlightFraudPatterns = true }) {
  const cyRef = useRef(null)
  const containerRef = useRef(null)
  const { setSelectedNode, selectedRing, heatmapMode } = useAMLStore()

  // Memoize graph data to prevent unnecessary re-renders
  const graphData = useMemo(() => {
    if (!analysisResult) return { nodes: [], edges: [] }

    const { suspicious_accounts, fraud_rings } = analysisResult
    const accountScoreMap = {}
    suspicious_accounts.forEach(acc => {
      accountScoreMap[acc.account_id] = acc
    })

    const nodes = []
    const edges = []
    const nodeIds = new Set()

    // If there's a selected ring, show only that ring
    const ringsToShow = selectedRing
      ? fraud_rings.filter(r => r.ring_id === selectedRing)
      : fraud_rings

    // Build nodes and edges from fraud_rings (member_accounts → accounts)
    ringsToShow.forEach((ring, ringIdx) => {
      const accounts = ring.accounts || ring.member_accounts || []

      // Add all accounts in this ring as nodes
      accounts.forEach(accId => {
        if (!nodeIds.has(accId)) {
          nodeIds.add(accId)
          const accData = accountScoreMap[accId] || {}
          const score = accData.suspicion_score || 0
          const isMule = accData.is_mule || false
          const muleRole = accData.mule_role || null
          const patterns = accData.patterns_detected || accData.detected_patterns || []

          nodes.push({
            data: {
              id: accId,
              label: accId.slice(-4),
              score: score,
              transactionCount: ring.transaction_count || 1,
              inRing: true,
              patterns,
              riskLevel: accData.risk_level || 'LOW',
              ringId: ring.ring_id,
              patternType: ring.pattern_type,
              isMule: isMule,
              muleRole: muleRole,
              // Criminal identification
              isCriminal: isMule && score >= 70, // High-scoring mules are criminals
              criminalType: isMule && score >= 90 ? 'MASTERMIND' :
                isMule && score >= 70 ? 'CRIMINAL' : null
            }
          })
        }
      })

      // Create directed circular connections between accounts in the ring
      for (let i = 0; i < accounts.length; i++) {
        const source = accounts[i]
        const target = accounts[(i + 1) % accounts.length]
        edges.push({
          data: {
            id: `edge_${ringIdx}_${i}`,
            source: source,
            target: target,
            amount: ring.total_amount || 0,
            weight: Math.min((ring.total_amount || 0) / 10000, 8) + 1,
            ringId: ring.ring_id
          }
        })
      }
    })

    // If no rings, show top suspicious accounts without connections
    if (nodes.length === 0) {
      suspicious_accounts.slice(0, 20).forEach(acc => {
        const isMule = acc.is_mule || false
        const patterns = acc.patterns_detected || acc.detected_patterns || []
        nodes.push({
          data: {
            id: acc.account_id,
            label: acc.account_id.slice(-4),
            score: acc.suspicion_score || 0,
            transactionCount: 1,
            inRing: false,
            patterns,
            riskLevel: acc.risk_level || 'LOW',
            isMule: isMule,
            muleRole: acc.mule_role || null,
            isCriminal: isMule && (acc.suspicion_score || 0) >= 70,
            criminalType: isMule && (acc.suspicion_score || 0) >= 90 ? 'MASTERMIND' :
              isMule && (acc.suspicion_score || 0) >= 70 ? 'CRIMINAL' : null
          }
        })
      })
    }

    return { nodes, edges }
  }, [analysisResult, selectedRing])

  const buildGraph = useCallback(() => {
    if (!containerRef.current || !analysisResult) return

    if (cyRef.current) {
      cyRef.current.destroy()
    }

    const cy = cytoscape({
      container: containerRef.current,
      elements: graphData,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': (ele) => {
              const score = ele.data('score')
              const patterns = ele.data('patterns') || []
              const inRing = ele.data('inRing')
              const patternType = ele.data('patternType')
              // Enhanced RIFT-compliant node colors
              if (heatmapMode) {
                const r = Math.round((score / 100) * 255)
                const b = Math.round(((100 - score) / 100) * 255)
                return `rgb(${r}, 0, ${b})`
              }

              // RIFT Fault 1 & 5: Strict visual priority - Ring > Suspicious > Normal
              // 1. Fraud Ring Members (highest) → Red (any ring: cycle, smurfing, shell_chain)
              if (inRing && highlightFraudPatterns) {
                return '#ff003c'
              }
              // 2. Suspicious (non-ring) → Orange
              if (ele.data('isMule') || patterns.includes('pass_through')) {
                return '#ff003c'
              }
              if (
                patterns.includes('fan_in') ||
                patterns.includes('fan_out') ||
                patterns.includes('high_velocity') ||
                patterns.includes('shell_chain')
              ) {
                return '#ff6b00'
              }
              if (score >= 40) {
                return '#f59e0b'
              }
              // 3. Normal accounts → Green
              return '#00ff88'
            },
            'width': (ele) => {
              const cnt = ele.data('transactionCount')
              const patterns = ele.data('patterns') || []
              // Emphasize smurfing hubs (star topology) with larger nodes
              const baseSize = patterns.includes('fan_in') || patterns.includes('fan_out') ? 40 : 20
              return Math.max(baseSize, Math.min(60, baseSize + cnt * 3))
            },
            'height': (ele) => {
              const cnt = ele.data('transactionCount')
              const patterns = ele.data('patterns') || []
              const baseSize = patterns.includes('fan_in') || patterns.includes('fan_out') ? 40 : 20
              return Math.max(baseSize, Math.min(60, baseSize + cnt * 3))
            },
            'label': 'data(label)',
            'font-family': 'JetBrains Mono',
            'font-size': '9px',
            'color': '#ffffff',
            'text-valign': 'bottom',
            'text-margin-y': 4,
            'border-width': (ele) => {
              if (ele.data('inRing') && highlightFraudPatterns) return 4
              return 1.5
            },
            'border-color': (ele) => {
              if (ele.data('inRing') && highlightFraudPatterns) {
                return '#ff003c'
              }
              return 'rgba(255,255,255,0.2)'
            },
            'border-opacity': 1,
            'box-shadow': (ele) => {
              if (ele.data('inRing') && highlightFraudPatterns) {
                return '0 0 20px rgba(255,0,60,0.8)'
              }
              if (!ele.data('inRing')) {
                const score = ele.data('score')
                if (score > 80) return '0 0 15px rgba(255,106,0,0.6)'
              }
              return 'none'
            },
            'transition-property': 'background-color, width, height, border-width, box-shadow',
            'transition-duration': '0.5s',
          }
        },
        {
          selector: 'node:selected',
          style: {
            'border-width': 3,
            'border-color': '#00f0ff',
            'box-shadow': '0 0 20px rgba(0,240,255,0.8)',
          }
        },
        {
          selector: 'node:hover',
          style: {
            'border-width': 2.5,
            'border-color': '#00f0ff',
            'opacity': 1,
          }
        },
        {
          selector: 'edge',
          style: {
            'width': (ele) => Math.max(2, Math.min(8, ele.data('weight') || 1)),
            'line-color': (ele) => {
              if (highlightFraudPatterns && ele.data('ringId')) {
                // Use orange for shell / layering chains, red for cycles
                const patternType = ele.target().data('patternType')
                if (patternType === 'shell_chain') {
                  return 'rgba(255,165,0,0.7)' // Orange for chains
                }
                return 'rgba(255,0,60,0.6)' // Red for cycles
              }
              return 'rgba(0, 240, 255, 0.3)'
            },
            'target-arrow-color': (ele) => {
              if (highlightFraudPatterns && ele.data('ringId')) {
                const patternType = ele.target().data('patternType')
                if (patternType === 'shell_chain') {
                  return '#ff9900'
                }
                return '#ff003c'
              }
              return 'rgba(0, 240, 255, 0.8)'
            },
            'target-arrow-shape': 'triangle',
            'arrow-scale': 1.5,
            'curve-style': 'bezier',
            'opacity': 0.8,
          }
        },
        {
          selector: 'edge:hover',
          style: {
            'line-color': 'rgba(0, 240, 255, 0.6)',
            'opacity': 1,
          }
        },
        {
          selector: '.highlighted',
          style: {
            'line-color': 'rgba(0, 240, 255, 0.8)',
            'target-arrow-color': '#00f0ff',
            'opacity': 1,
            'width': 3,
          }
        },
        {
          selector: '.dimmed',
          style: {
            'opacity': 0.1,
          }
        },
        {
          selector: 'node[isRingLabel]',
          style: {
            'background-color': 'transparent',
            'border-width': 0,
            'label': 'data(label)',
            'font-size': '11px',
            'font-weight': 'bold',
            'color': '#ff003c',
            'text-valign': 'center',
            'text-margin-y': 0,
            'width': 10,
            'height': 10,
            'text-max-width': '80px',
          }
        }
      ],
      layout: {
        name: 'fcose',
        animate: true,
        animationDuration: 1000,
        nodeRepulsion: 8000,
        idealEdgeLength: 120,
        edgeElasticity: 0.45,
        gravity: 0.25,
        numIter: 2500,
        randomize: true,
        componentSpacing: 150,
        coolingFactor: 0.95,
        fit: true,
        padding: 50,
        nodeSeparation: 100,
        piTol: 0.0000001,
      },
      userZoomingEnabled: true,
      userPanningEnabled: true,
      boxSelectionEnabled: false,
      autoungrabify: false,
    })

    // Click handler (skip ring label nodes)
    cy.on('tap', 'node', (evt) => {
      const node = evt.target
      const data = node.data()
      if (data.isRingLabel) return
      setSelectedNode(data)

      // Highlight connected edges
      cy.elements().addClass('dimmed')
      node.removeClass('dimmed')
      node.connectedEdges().removeClass('dimmed').addClass('highlighted')
      node.connectedEdges().connectedNodes().removeClass('dimmed')
    })

    // Click background to reset
    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        cy.elements().removeClass('dimmed highlighted')
        setSelectedNode(null)
      }
    })

    // Interactive tooltip on hover (skip ring label nodes)
    cy.on('mouseover', 'node', (evt) => {
      const node = evt.target
      const data = node.data()
      if (data.isRingLabel) return

      // Remove any existing tooltips
      node.qtip?.remove?.()

      // Create tooltip content
      const tooltipContent = `
        <div class="glass-card p-3 text-xs" style="min-width: 200px;">
          <div class="font-mono font-bold text-white mb-2">Account: ${data.id}</div>
          <div class="space-y-1">
            <div class="flex justify-between">
              <span class="text-slate-400">Suspicion Score:</span>
              <span class="font-mono ${data.score > 80 ? 'text-pink-400' : data.score > 50 ? 'text-orange-400' : 'text-neon-green'}">${data.score}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">Transactions:</span>
              <span class="font-mono text-white">${data.transactionCount}</span>
            </div>
            ${data.patterns?.length ? `
              <div>
                <span class="text-slate-400">Patterns:</span>
                <div class="mt-1 space-y-0.5">
                  ${data.patterns.map(p => `<div class="text-xs font-mono text-neon-blue">• ${p}</div>`).join('')}
                </div>
              </div>
            ` : ''}
            ${data.ringId ? `
              <div class="flex justify-between">
                <span class="text-slate-400">Ring ID:</span>
                <span class="font-mono text-neon-red">${data.ringId}</span>
              </div>
            ` : ''}
          </div>
        </div>
      `

      // Create tooltip using popper
      node.popper({
        content: tooltipContent,
        popper: {
          placement: 'top',
          removeOnDestroy: true
        }
      })
    })

    cy.on('mouseout', 'node', (evt) => {
      const node = evt.target
      node.popper('destroy')
    })

    // Fault 2: Add visible ring label near centroid of each fraud ring cluster
    cy.one('layoutstop', () => {
      const rings = analysisResult?.fraud_rings || []
      const ringsToLabel = selectedRing
        ? rings.filter(r => r.ring_id === selectedRing)
        : rings
      ringsToLabel.forEach((ring) => {
        const accounts = ring.accounts || ring.member_accounts || []
        if (accounts.length === 0) return
        const memberNodes = accounts.map(id => cy.getElementById(id)).filter(n => n.length > 0)
        if (memberNodes.length === 0) return
        const positions = memberNodes.map(n => n.position())
        const cx = positions.reduce((s, p) => s + p.x, 0) / positions.length
        const cy_y = positions.reduce((s, p) => s + p.y, 0) / positions.length
        const labelId = `ring_label_${ring.ring_id}`
        if (cy.getElementById(labelId).length > 0) return
        cy.add({
          group: 'nodes',
          data: {
            id: labelId,
            label: ring.ring_id,
            isRingLabel: true,
          },
          position: { x: cx, y: cy_y },
          grabbable: false,
        })
      })
    })

    cyRef.current = cy
  }, [graphData, heatmapMode, selectedRing, setSelectedNode, highlightFraudPatterns])

  useEffect(() => {
    if (!containerRef.current || !analysisResult) return

    buildGraph()

    return () => {
      if (cyRef.current) cyRef.current.destroy()
    }
  }, [buildGraph])

  // Highlight ring when selected
  useEffect(() => {
    if (!cyRef.current || !selectedRing || !analysisResult) return
    const ring = analysisResult.fraud_rings.find(r => r.ring_id === selectedRing)
    if (!ring) return

    cyRef.current.elements().addClass('dimmed')
    ;(ring.accounts || ring.member_accounts || []).forEach(accId => {
      const node = cyRef.current.getElementById(accId)
      if (node.length) {
        node.removeClass('dimmed')
        node.connectedEdges().removeClass('dimmed').addClass('highlighted')
      }
    })
  }, [selectedRing, analysisResult])

  return (
    <div className="relative w-full h-full">
      <div
        ref={containerRef}
        className="w-full h-full"
        style={{ background: 'transparent' }}
      />

      {/* RIFT-compliant Legend */}
      <div className="absolute bottom-4 left-4 glass-card p-4">
        <h4 className="text-xs font-display font-bold text-white mb-3 tracking-widest">GRAPH LEGEND</h4>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-red-500 shadow-lg shadow-red-500/50" />
            <span className="text-xs font-mono text-slate-300">Fraud Ring Members</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-orange-500" />
            <span className="text-xs font-mono text-slate-300">Suspicious Accounts</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-400" />
            <span className="text-xs font-mono text-slate-300">Normal Accounts</span>
          </div>
          <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-700">
            <div className="w-6 h-0 border-t-2 border-cyan-400 relative">
              <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-0 h-0 border-l-4 border-l-cyan-400 border-y-2 border-y-transparent" />
            </div>
            <span className="text-xs font-mono text-slate-300">Directed Transaction Flow</span>
          </div>
        </div>
      </div>

      {/* Controls hint */}
      <div className="absolute top-4 right-4 glass-card px-3 py-2">
        <p className="text-xs font-mono text-slate-500">Scroll to zoom · Drag to pan · Click node for details</p>
      </div>
    </div>
  )
}