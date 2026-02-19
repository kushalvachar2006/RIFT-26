import React, { useEffect, useRef, useCallback } from 'react'
import cytoscape from 'cytoscape'
import fcose from 'cytoscape-fcose'
import { useAMLStore } from '../../context/store'
import { getRiskColor } from '../../utils/amlEngine'

// Register fcose layout plugin
cytoscape.use(fcose)

export default function TransactionGraph({ analysisResult }) {
  const cyRef = useRef(null)
  const containerRef = useRef(null)
  const { setSelectedNode, selectedRing, heatmapMode } = useAMLStore()

  const buildGraph = useCallback(() => {
    if (!containerRef.current || !analysisResult) return

    const { suspicious_accounts, fraud_rings } = analysisResult
    
    // Build graph from fraud rings (connections between accounts)
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

    // Build nodes and edges from fraud rings
    ringsToShow.forEach((ring, ringIdx) => {
      const accounts = ring.accounts || []
      
      // Add all accounts in this ring as nodes
      accounts.forEach(accId => {
        if (!nodeIds.has(accId)) {
          nodeIds.add(accId)
          const accData = accountScoreMap[accId] || {}
          const score = accData.suspicion_score || 0
          
          nodes.push({
            data: {
              id: accId,
              label: accId.slice(-4),
              score: score,
              transactionCount: ring.transaction_count || 1,
              inRing: true,
              patterns: accData.patterns || [],
              riskLevel: accData.risk_level || 'LOW'
            }
          })
        }
      })
      
      // Create circular connections between accounts in the ring
      for (let i = 0; i < accounts.length; i++) {
        const source = accounts[i]
        const target = accounts[(i + 1) % accounts.length]
        edges.push({
          data: {
            id: `edge_${ringIdx}_${i}`,
            source: source,
            target: target,
            amount: ring.total_amount || 0,
            weight: Math.min((ring.total_amount || 0) / 10000, 8) + 1
          }
        })
      }
    })

    // If no rings, show top suspicious accounts without connections
    if (nodes.length === 0) {
      suspicious_accounts.slice(0, 20).forEach(acc => {
        nodes.push({
          data: {
            id: acc.account_id,
            label: acc.account_id.slice(-4),
            score: acc.suspicion_score || 0,
            transactionCount: 1,
            inRing: false,
            patterns: acc.patterns || [],
            riskLevel: acc.risk_level || 'LOW'
          }
        })
      })
    }

    if (cyRef.current) {
      cyRef.current.destroy()
    }

    const cy = cytoscape({
      container: containerRef.current,
      elements: { nodes, edges },
      style: [
        {
          selector: 'node',
          style: {
            'background-color': (ele) => {
              const score = ele.data('score')
              if (heatmapMode) {
                const r = Math.round((score / 100) * 255)
                const b = Math.round(((100 - score) / 100) * 255)
                return `rgb(${r}, 0, ${b})`
              }
              return getRiskColor(score)
            },
            'width': (ele) => {
              const cnt = ele.data('transactionCount')
              return Math.max(20, Math.min(60, 20 + cnt * 3))
            },
            'height': (ele) => {
              const cnt = ele.data('transactionCount')
              return Math.max(20, Math.min(60, 20 + cnt * 3))
            },
            'label': 'data(label)',
            'font-family': 'JetBrains Mono',
            'font-size': '9px',
            'color': '#ffffff',
            'text-valign': 'bottom',
            'text-margin-y': 4,
            'border-width': (ele) => ele.data('inRing') ? 3 : 1.5,
            'border-color': (ele) => ele.data('inRing') ? '#00f0ff' : 'rgba(255,255,255,0.2)',
            'border-opacity': 1,
            'box-shadow': (ele) => {
              const score = ele.data('score')
              if (score > 80) return '0 0 15px rgba(255,0,60,0.8)'
              return 'none'
            },
            'transition-property': 'background-color, width, height',
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
            'width': (ele) => Math.max(1, Math.min(6, ele.data('weight') || 1)),
            'line-color': 'rgba(0, 240, 255, 0.2)',
            'target-arrow-color': 'rgba(0, 240, 255, 0.5)',
            'target-arrow-shape': 'triangle',
            'arrow-scale': 1.2,
            'curve-style': 'bezier',
            'opacity': 0.7,
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

    // Click handler
    cy.on('tap', 'node', (evt) => {
      const node = evt.target
      const data = node.data()
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

    // Tooltip via title
    cy.on('mouseover', 'node', (evt) => {
      const data = evt.target.data()
      evt.target.qtip?.remove?.()
    })

    cyRef.current = cy
  }, [analysisResult, heatmapMode, selectedRing, setSelectedNode])

  useEffect(() => {
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
    ring.accounts.forEach(accId => {
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

      {/* Legend */}
      <div className="absolute bottom-4 left-4 glass-card p-3 flex gap-4">
        {[
          { color: '#ff003c', label: 'High Risk (>80)' },
          { color: '#ff6a00', label: 'Medium Risk (50–80)' },
          { color: '#00ff88', label: 'Low Risk (<50)' },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: item.color }} />
            <span className="text-xs font-mono text-slate-400">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Controls hint */}
      <div className="absolute top-4 right-4 glass-card px-3 py-2">
        <p className="text-xs font-mono text-slate-500">Scroll to zoom · Drag to pan · Click node for details</p>
      </div>
    </div>
  )
}