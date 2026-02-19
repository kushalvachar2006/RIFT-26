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
      const patternType = ring.pattern_type || 'cycle'
      const patternSubtype = ring.pattern_subtype

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
              patternType: patternType,
              patternSubtype: patternSubtype,
              isMule: isMule,
              muleRole: muleRole,
              reductionFactor: accData.reduction_factor ?? 1.0,
              fpType: accData.fp_type ?? null,
              // Criminal identification
              isCriminal: isMule && score >= 70, // High-scoring mules are criminals
              criminalType: isMule && score >= 90 ? 'MASTERMIND' :
                isMule && score >= 70 ? 'CRIMINAL' : null
            }
          })
        }
      })

      // Use per-edge amounts + timestamps from backend (edge thickness ∝ amount, hover = time deltas)
      const ringEdges = ring.edges || []
      const addEdge = (source, target, amount, i, opts = {}) => {
        const amt = typeof amount === 'number' ? amount : (ring.total_amount || 0)
        const weight = Math.max(2, Math.min(12, 2 + Math.log10(Math.max(amt, 1))))
        edges.push({
          data: {
            id: `edge_${ringIdx}_${i}`,
            source,
            target,
            amount: amt,
            weight,
            ringId: ring.ring_id,
            patternType,
            timestampIso: opts.timestampIso,
            deltaFromPrevMinutes: opts.deltaFromPrevMinutes,
            label: `${source}→${target}`
          }
        })
      }

      if (ringEdges.length > 0) {
        ringEdges.forEach((e, i) => {
          const src = e.source || e.source_account
          const tgt = e.target || e.destination_account || e.target_account
          if (src && tgt) {
            [src, tgt].forEach(id => {
              if (!nodeIds.has(id)) {
                nodeIds.add(id)
                const accData = accountScoreMap[id] || {}
                nodes.push({
                  data: {
                    id,
                    label: String(id).slice(-4),
                    score: accData.suspicion_score || 0,
                    transactionCount: 1,
                    inRing: accounts.includes(id),
                    patterns: accData.patterns_detected || accData.detected_patterns || [],
                    riskLevel: accData.risk_level || 'LOW',
                    ringId: accounts.includes(id) ? ring.ring_id : null,
                    patternType,
                    patternSubtype
                  }
                })
              }
            })
            const prevTs = i > 0 ? ringEdges[i - 1]?.timestamp_iso : null
            const thisTs = e.timestamp_iso
            let deltaMin = null
            if (prevTs && thisTs) {
              try {
                const d = (new Date(thisTs) - new Date(prevTs)) / 60000
                deltaMin = Math.round(d)
              } catch (_) { }
            }
            addEdge(src, tgt, e.amount ?? 0, i, {
              timestampIso: thisTs,
              deltaFromPrevMinutes: deltaMin
            })
          }
        })
      } else if (patternType === 'smurfing' && accounts.length >= 2) {
        const hub = accounts[0]
        const spokes = accounts.slice(1)
        const isFanIn = patternSubtype === 'fan_in'
        spokes.forEach((spoke, i) => {
          const [source, target] = isFanIn ? [spoke, hub] : [hub, spoke]
          addEdge(source, target, ring.total_amount || 0, i)
        })
      } else if (patternType === 'shell_chain' && accounts.length >= 2) {
        for (let i = 0; i < accounts.length - 1; i++) {
          addEdge(accounts[i], accounts[i + 1], ring.total_amount || 0, i)
        }
      } else if (accounts.length >= 2) {
        for (let i = 0; i < accounts.length; i++) {
          const source = accounts[i]
          const target = accounts[(i + 1) % accounts.length]
          addEdge(source, target, ring.total_amount || 0, i)
        }
      }
    })

    // Include pass-through, fan-in, fan-out accounts NOT in any ring (suspicious but standalone)
    const patternKeys = ['pass_through', 'fan_in', 'fan_out']
    suspicious_accounts.forEach(acc => {
      if (nodeIds.has(acc.account_id)) return
      const patterns = acc.patterns_detected || acc.detected_patterns || []
      if (!patternKeys.some(k => patterns.includes(k))) return
      nodeIds.add(acc.account_id)
      nodes.push({
        data: {
          id: acc.account_id,
          label: acc.account_id.slice(-4),
          score: acc.suspicion_score || 0,
          transactionCount: 1,
          inRing: false,
          patterns,
          riskLevel: acc.risk_level || 'LOW',
          isMule: acc.is_mule || false,
          muleRole: acc.mule_role || null,
          reductionFactor: acc.reduction_factor ?? 1.0,
          fpType: acc.fp_type ?? null,
          isCriminal: acc.is_mule && (acc.suspicion_score || 0) >= 70,
          criminalType: acc.is_mule && (acc.suspicion_score || 0) >= 90 ? 'MASTERMIND' :
            acc.is_mule && (acc.suspicion_score || 0) >= 70 ? 'CRIMINAL' : null
        }
      })
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
            reductionFactor: acc.reduction_factor ?? 1.0,
            fpType: acc.fp_type ?? null,
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
              const score = ele.data('score') || 0
              if (ele.data('inRing') && highlightFraudPatterns) return Math.max(3, Math.min(6, 3 + score / 40))
              if (score >= 60) return 2.5
              return 1.5
            },
            'border-color': (ele) => {
              const pt = ele.data('patternType')
              if (ele.data('inRing') && highlightFraudPatterns) {
                if (pt === 'shell_chain') return '#ff8c00'
                if (pt === 'smurfing') return '#00c8ff'
                return '#ff003c'
              }
              return 'rgba(255,255,255,0.2)'
            },
            'border-style': (ele) => {
              const rf = ele.data('reductionFactor')
              const fpType = ele.data('fpType')
              if (rf != null && rf < 1.0 && fpType) return 'dashed'
              return 'solid'
            },
            'border-opacity': (ele) => {
              const rf = ele.data('reductionFactor')
              if (rf != null && rf < 1.0) return 0.85
              return 1
            },
            'box-shadow': (ele) => {
              const score = ele.data('score') || 0
              const glow = 8 + (score / 100) * 18
              const opacity = 0.4 + (score / 100) * 0.5
              const pt = ele.data('patternType')
              const rgb = pt === 'shell_chain' ? '255,140,0' : pt === 'smurfing' ? '0,200,255' : '255,0,60'
              if (ele.data('inRing') && highlightFraudPatterns) {
                return `0 0 ${glow}px rgba(${rgb},${opacity})`
              }
              if (!ele.data('inRing') && score >= 50) {
                return `0 0 ${Math.min(glow, 12)}px rgba(255,106,0,${opacity * 0.8})`
              }
              return 'none'
            },
            'opacity': (ele) => {
              const rf = ele.data('reductionFactor')
              if (rf != null && rf < 1.0) return 0.92
              return 1
            },
            'transition-property': 'background-color, width, height, border-width, box-shadow, opacity',
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
            'width': (ele) => Math.max(2, Math.min(12, ele.data('weight') ?? 2)),
            'line-color': (ele) => {
              if (highlightFraudPatterns && ele.data('ringId')) {
                const pt = ele.data('patternType') || ele.target().data('patternType')
                if (pt === 'shell_chain') return 'rgba(255,140,0,0.85)'
                if (pt === 'smurfing') return 'rgba(0,200,255,0.8)'
                return 'rgba(255,0,60,0.75)'
              }
              return 'rgba(0, 240, 255, 0.3)'
            },
            'target-arrow-color': (ele) => {
              if (highlightFraudPatterns && ele.data('ringId')) {
                const pt = ele.data('patternType') || ele.target().data('patternType')
                if (pt === 'shell_chain') return '#ff8c00'
                if (pt === 'smurfing') return '#00c8ff'
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
            'color': (ele) => ele.data('ringLabelColor') || '#ff003c',
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

      const fpLabel = data.fpType === 'merchant' ? 'Merchant-adjusted' :
        data.fpType === 'payroll' ? 'Payroll-adjusted' :
          data.fpType === 'business_hub' ? 'Business Hub-adjusted' : null
      const rf = data.reductionFactor
      const fpSection = (rf != null && rf < 1.0 && fpLabel) ? `
            <div class="flex justify-between mt-1 pt-1 border-t border-slate-600">
              <span class="text-slate-400">FP Adjustment:</span>
              <span class="font-mono text-amber-400" title="Score reduced by ${Math.round((1 - rf) * 100)}%">${fpLabel} (×${rf})</span>
            </div>
      ` : ''
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
            ${fpSection}
          </div>
        </div>
      `

      // Create tooltip using custom implementation
      const tooltipDiv = document.createElement('div')
      tooltipDiv.className = 'glass-card p-3 text-xs'
      tooltipDiv.style.cssText = `
        position: absolute;
        background: rgba(15, 23, 42, 0.95);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 8px;
        padding: 12px;
        font-family: JetBrains Mono;
        font-size: 12px;
        color: white;
        z-index: 1000;
        min-width: 200px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        pointer-events: none;
      `

      tooltipDiv.innerHTML = tooltipContent

      // Position tooltip within graph container
      const containerRect = containerRef.current.getBoundingClientRect()

      // Calculate position relative to container
      let left = node.renderedPosition().x - containerRect.left + 20
      let top = node.renderedPosition().y - containerRect.top - 80

      // Keep tooltip within container bounds
      const tooltipWidth = 200
      const tooltipHeight = 150 // Estimated height for node tooltips

      // Adjust if tooltip would go outside container
      if (left + tooltipWidth > containerRect.width) {
        left = containerRect.width - tooltipWidth - 10
      }
      if (top + tooltipHeight > containerRect.height) {
        top = containerRect.height - tooltipHeight - 10
      }
      if (top < 0) {
        top = 10
      }

      tooltipDiv.style.left = `${Math.max(10, left)}px`
      tooltipDiv.style.top = `${Math.max(10, top)}px`

      // Add to DOM
      document.body.appendChild(tooltipDiv)

      // Store reference for cleanup
      node._tooltipDiv = tooltipDiv
    })

    cy.on('mouseout', 'node', (evt) => {
      const node = evt.target

      // Remove tooltip
      if (node._tooltipDiv) {
        document.body.removeChild(node._tooltipDiv)
        node._tooltipDiv = null
      }
    })

    // Edge hover: show amount + time deltas (judges expect temporal awareness)
    cy.on('mouseover', 'edge', (evt) => {
      const edge = evt.target
      const d = edge.data()

      // Debug: log edge data to console
      console.log('Edge hover data:', d)

      // Remove any existing tooltips
      edge.qtip?.remove?.()

      let timeRows = ''
      if (d.timestampIso) {
        try {
          const dt = new Date(d.timestampIso)
          timeRows += `<div class="flex justify-between"><span class="text-slate-400">First tx:</span><span class="font-mono text-white">${dt.toLocaleString()}</span></div>`
        } catch (e) {
          console.error('Date parsing error:', e)
        }
      }
      if (d.deltaFromPrevMinutes != null && d.deltaFromPrevMinutes !== undefined) {
        const delta = d.deltaFromPrevMinutes
        const label = Math.abs(delta) < 60 ? `${delta} min` : `${(delta / 60).toFixed(1)} h`
        timeRows += `<div class="flex justify-between"><span class="text-slate-400">Δ from prev hop:</span><span class="font-mono text-neon-blue">${label}</span></div>`
      }

      // Create simple tooltip without popper to avoid the error
      const tooltipDiv = document.createElement('div')
      tooltipDiv.className = 'glass-card p-3 text-xs'
      tooltipDiv.style.cssText = `
        position: absolute;
        background: rgba(15, 23, 42, 0.95);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 8px;
        padding: 12px;
        font-family: JetBrains Mono;
        font-size: 12px;
        color: white;
        z-index: 1000;
        min-width: 200px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        pointer-events: none;
      `

      tooltipDiv.innerHTML = `
        <div class="font-mono font-bold text-white mb-2">
          ${d.source?.slice(-4) || 'Unknown'} → ${d.target?.slice(-4) || 'Unknown'}
        </div>
        <div class="space-y-1">
          <div class="flex justify-between">
            <span class="text-slate-400">Amount:</span>
            <span class="font-mono text-neon-green">$${(d.amount || 0).toLocaleString()}</span>
          </div>
          ${timeRows ? `
            <div class="border-t border-slate-600 pt-1 mt-1">
              <span class="text-slate-400 text-xs">Transaction Details:</span>
              ${timeRows}
            </div>
          ` : ''}
          <div class="flex justify-between">
            <span class="text-slate-400">Weight:</span>
            <span class="font-mono text-white">${d.weight || 1}</span>
          </div>
          ${d.ringId ? `
            <div class="flex justify-between">
              <span class="text-slate-400">Ring:</span>
              <span class="font-mono text-neon-red">${d.ringId}</span>
            </div>
          ` : ''}
        </div>
      `

      // Position tooltip within graph container
      const containerRect = containerRef.current.getBoundingClientRect()

      // Calculate position relative to container, not viewport
      let left = edge.renderedPosition().x1 + edge.renderedPosition().x2 - containerRect.left
      let top = edge.renderedPosition().y1 + edge.renderedPosition().y2 - containerRect.top

      // Keep tooltip within container bounds
      const tooltipWidth = 200
      const tooltipHeight = 120 // Estimated height

      // Adjust if tooltip would go outside container
      if (left + tooltipWidth > containerRect.width) {
        left = containerRect.width - tooltipWidth - 10
      }
      if (top + tooltipHeight > containerRect.height) {
        top = containerRect.height - tooltipHeight - 10
      }

      tooltipDiv.style.left = `${Math.max(10, left)}px`
      tooltipDiv.style.top = `${Math.max(10, top)}px`

      // Add to DOM
      document.body.appendChild(tooltipDiv)

      // Store reference for cleanup
      edge._tooltipDiv = tooltipDiv
    })

    cy.on('mouseout', 'edge', (evt) => {
      const edge = evt.target

      // Remove tooltip
      if (edge._tooltipDiv) {
        document.body.removeChild(edge._tooltipDiv)
        edge._tooltipDiv = null
      }
    })

    // Clean up tooltips on graph destroy
    cy.on('destroy', () => {
      document.querySelectorAll('.edge-tooltip').forEach(el => {
        if (el.parentNode) {
          el.parentNode.removeChild(el)
        }
      })
    })

    // Ring labels: distinct color per pattern type, offset to reduce overlap
    cy.one('layoutstop', () => {
      const rings = analysisResult?.fraud_rings || []
      const ringsToLabel = selectedRing
        ? rings.filter(r => r.ring_id === selectedRing)
        : rings
      const seenCentroids = new Map()
      ringsToLabel.forEach((ring, idx) => {
        const accounts = ring.accounts || ring.member_accounts || []
        if (accounts.length === 0) return
        const memberNodes = accounts.map(id => cy.getElementById(id)).filter(n => n.length > 0)
        if (memberNodes.length === 0) return
        const positions = memberNodes.map(n => n.position())
        let cx = positions.reduce((s, p) => s + p.x, 0) / positions.length
        let cy_y = positions.reduce((s, p) => s + p.y, 0) / positions.length
        const key = `${Math.round(cx / 50)}_${Math.round(cy_y / 50)}`
        if (seenCentroids.has(key)) {
          const [ox, oy] = seenCentroids.get(key)
          const offset = 40 + idx * 20
          cx += offset
          cy_y -= offset
        } else {
          seenCentroids.set(key, [cx, cy_y])
        }
        const labelId = `ring_label_${ring.ring_id}`
        if (cy.getElementById(labelId).length > 0) return
        const pt = ring.pattern_type || 'cycle'
        const color = pt === 'shell_chain' ? '#ff8c00' : pt === 'smurfing' ? '#00c8ff' : '#ff003c'
        cy.add({
          group: 'nodes',
          data: {
            id: labelId,
            label: ring.ring_id,
            isRingLabel: true,
            ringLabelColor: color,
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
      ; (ring.accounts || ring.member_accounts || []).forEach(accId => {
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
            <div className="w-4 h-4 rounded-full border-2 border-red-500 shadow-lg shadow-red-500/50" />
            <span className="text-xs font-mono text-slate-300">Cycle</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full border-2 border-cyan-400 shadow shadow-cyan-400/50" />
            <span className="text-xs font-mono text-slate-300">Smurfing</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full border-2 border-orange-500 shadow shadow-orange-500/50" />
            <span className="text-xs font-mono text-slate-300">Shell Chain</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full border-2 border-dashed border-amber-500 opacity-90" />
            <span className="text-xs font-mono text-slate-300">FP-adjusted (Merchant/Payroll/Hub)</span>
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