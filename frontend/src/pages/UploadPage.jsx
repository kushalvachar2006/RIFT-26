import React, { useCallback, useState, useMemo } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import Papa from 'papaparse'
import { useAMLStore } from '../context/store'
import { uploadCSV } from '../services/api'
import { generateSampleCSV } from '../utils/sampleData'

export default function UploadPage() {
  const navigate = useNavigate()
  const { setCsvFile, setCsvData, setProcessing, setProcessingProgress, setAnalysisResult, setError, isProcessing, processingProgress, csvFile, csvData, error } = useAMLStore()

  // Memoize required columns validation - EXACT RIFT format
  const requiredColumns = useMemo(() => [
    'transaction_id',
    'source_account',
    'destination_account',
    'amount',
    'timestamp'
  ], [])

  const validateCSV = useCallback((data) => {
    if (!data || data.length === 0) {
      return { valid: false, error: 'CSV file is empty or invalid' }
    }

    const columns = Object.keys(data[0])
    const missingColumns = requiredColumns.filter(col => !columns.includes(col))

    if (missingColumns.length > 0) {
      return {
        valid: false,
        error: `Missing required columns: ${missingColumns.join(', ')}. Required columns: transaction_id, source_account, destination_account, amount, timestamp`,
        requiredColumns
      }
    }

    return { valid: true }
  }, [requiredColumns])

  const onDrop = useCallback((accepted, rejected) => {
    if (rejected.length > 0) {
      setError('Only CSV files are accepted.')
      return
    }
    const file = accepted[0]
    setCsvFile(file)
    setError(null)

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const validation = validateCSV(results.data)
        if (!validation.valid) {
          setError(validation.error)
          setCsvData([])
          return
        }
        setCsvData(results.data)
      },
      error: (error) => {
        setError(`CSV parsing error: ${error.message}`)
        setCsvData([])
      }
    })
  }, [validateCSV])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    maxFiles: 1,
  })

  const runDetection = async () => {
    if (!csvFile) {
      setError('Please upload a CSV file first')
      return
    }

    // Check file size for 10K transaction limit
    const fileSizeMB = csvFile.size / (1024 * 1024)
    if (fileSizeMB > 50) { // 50MB limit for safety
      setError('File too large. Maximum 50MB allowed for optimal performance.')
      return
    }

    setProcessing(true)
    setProcessingProgress(0)
    setError(null)

    const startTime = Date.now()
    const txnCount = csvData?.length || 0
    const isLarge = txnCount >= 5000
    let progressInterval
    try {
      progressInterval = setInterval(() => {
        setProcessingProgress((p) => (p >= 90 ? p : Math.min(p + (isLarge ? 3 : 5), 90)))
      }, isLarge ? 2000 : 1500)
      const result = await uploadCSV(csvFile, (progress) => {
        setProcessingProgress(Math.min(progress, 95))
      })
      if (progressInterval) clearInterval(progressInterval)

      // Calculate actual processing time
      const processingTime = ((Date.now() - startTime) / 1000).toFixed(2)

      // Final progress
      setProcessingProgress(100)

      // Set the result from backend
      setAnalysisResult(result)
      setProcessing(false)

      // Show processing time in console for monitoring
      console.log(`RIFT Processing completed in ${processingTime}s for ${csvData.length} transactions`)

      // Navigate to dashboard after successful processing
      setTimeout(() => navigate('/dashboard'), 1500)

    } catch (error) {
      if (progressInterval) clearInterval(progressInterval)
      setError(error.message || 'Detection failed. Please try again.')
      setProcessing(false)
      setProcessingProgress(0)
    }
  }

  const loadSample = () => {
    const csv = generateSampleCSV()
    const blob = new Blob([csv], { type: 'text/csv' })
    const file = new File([blob], 'sample_transactions.csv', { type: 'text/csv' })
    setCsvFile(file)
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const validation = validateCSV(results.data)
        if (validation.valid) {
          setCsvData(results.data)
        }
      }
    })
  }

  return (
    <div className="min-h-screen grid-bg flex flex-col items-center justify-center p-8 relative overflow-hidden">
      {/* Scan line overlay */}
      <div className="scan-overlay" />

      {/* Background glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center mb-12"
      >
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-2 h-8 bg-neon-blue rounded-full shadow-neon-blue" />
          <p className="font-mono text-sm text-neon-blue/70 tracking-[4px] uppercase">FinGuard AI · v2.4.1</p>
          <div className="w-2 h-8 bg-neon-blue rounded-full shadow-neon-blue" />
        </div>
        <h1 className="font-display text-5xl md:text-6xl font-black text-white mb-4 leading-tight" data-text="FINANCIAL CRIME DETECTION">
          <span className="text-white">GRAPH BASED</span>
          <br />
          <span className="neon-text animate-glow">FINANCIAL CRIME</span>
          <br />
          <span className="text-white">DETECTION ENGINE</span>
        </h1>
        <p className="text-slate-400 font-body text-lg max-w-xl mx-auto">
          Upload transaction data, identify fraud rings, and expose money laundering networks in real-time.
        </p>
      </motion.div>

      {/* Upload Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="w-full max-w-2xl"
      >
        <div className="glass-card p-8">
          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-300 ${isDragActive
              ? 'border-neon-blue bg-neon-blue/10 shadow-neon-blue'
              : 'border-slate-600 hover:border-neon-blue/50 hover:bg-neon-blue/5'
              }`}
          >
            <input {...getInputProps()} />
            <motion.div animate={{ y: isDragActive ? -8 : 0 }} transition={{ duration: 0.3 }}>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full border border-neon-blue/30 flex items-center justify-center">
                <svg className="w-8 h-8 text-neon-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              {isDragActive ? (
                <p className="text-neon-blue font-mono text-sm tracking-widest">DROP TO INITIALIZE SCAN</p>
              ) : (
                <>
                  <p className="text-white font-body text-lg mb-2">Drag & Drop Transaction CSV</p>
                  <p className="text-slate-500 font-mono text-xs tracking-widest">OR CLICK TO SELECT FILE</p>
                  <p className="text-slate-600 text-xs mt-3">
                    Accepts .CSV format only • Up to 10,000 transactions
                  </p>
                  <div className="mt-2 p-2 rounded bg-slate-800/50 border border-slate-700">
                    <p className="text-xs font-mono text-slate-400 mb-1">Required columns:</p>
                    <div className="flex flex-wrap gap-1">
                      {requiredColumns.map(col => (
                        <span key={col} className="text-xs font-mono bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded">
                          {col}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Exact format: transaction_id, source_account, destination_account, amount, timestamp
                    </p>
                  </div>
                </>
              )}
            </motion.div>
          </div>

          {/* File Info */}
          <AnimatePresence>
            {csvFile && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 p-4 rounded-lg bg-neon-blue/5 border border-neon-blue/20 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-neon-blue/10 flex items-center justify-center">
                    <svg className="w-4 h-4 text-neon-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-mono text-white">{csvFile.name}</p>
                    <p className="text-xs text-slate-400 font-mono">
                      {csvData.length} transactions detected • Processing time: ≤30 seconds
                    </p>
                  </div>
                </div>
                <span className="risk-badge-low">READY</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Actions */}
          <div className="mt-6 flex gap-3">
            <button
              onClick={runDetection}
              disabled={!csvFile || isProcessing}
              className="btn-primary flex-1 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <span className="w-3 h-3 rounded-full border border-neon-blue border-t-transparent animate-spin" />
                  ANALYZING...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V9l-6-6z" />
                  </svg>
                  RUN DETECTION
                </>
              )}
            </button>
            <button
              onClick={loadSample}
              disabled={isProcessing}
              className="btn-danger disabled:opacity-40"
            >
              DEMO
            </button>
          </div>

          {/* Error Display */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 p-4 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-3"
              >
                <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-mono text-red-300 font-semibold mb-1">Analysis Failed</p>
                  <p className="text-xs text-red-200/80">{error}</p>
                  {error.includes('backend') && (
                    <p className="text-xs text-red-200/60 mt-2">Make sure the backend is running on http://localhost:8000</p>
                  )}
                </div>
                <button
                  onClick={() => setError(null)}
                  className="text-red-400 hover:text-red-300 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Progress */}
          <AnimatePresence>
            {isProcessing && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-6"
              >
                <div className="flex justify-between mb-2">
                  <span className="text-xs font-mono text-slate-400 tracking-widest">
                    {processingProgress < 95 ? 'UPLOADING & PROCESSING...' : 'FINALIZING ANALYSIS...'}
                  </span>
                  <span className="text-xs font-mono text-neon-blue">{processingProgress}%</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-neon-blue to-cyan-400 rounded-full"
                    style={{ width: `${processingProgress}%` }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                  />
                </div>
                <div className="mt-3 text-xs text-slate-500 font-mono text-center">
                  Backend AML Engine processing transaction data...
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Features row */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          {[
            { icon: '⬡', label: 'Graph Analysis', desc: 'Cytoscape.js network visualization' },
            { icon: '◈', label: 'Ring Detection', desc: 'Circular fund flow patterns' },
            { icon: '⬟', label: 'AI Scoring', desc: 'Multi-pattern risk assessment' },
          ].map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.1 }}
              className="glass-card p-4 text-center"
            >
              <div className="text-2xl mb-2 text-neon-blue">{f.icon}</div>
              <div className="text-xs font-display text-white mb-1">{f.label}</div>
              <div className="text-xs text-slate-500">{f.desc}</div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
