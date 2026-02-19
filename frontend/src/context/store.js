import { create } from 'zustand'

export const useAMLStore = create((set, get) => ({
  // State
  csvFile: null,
  csvData: [],
  isProcessing: false,
  processingProgress: 0,
  analysisResult: null,
  selectedNode: null,
  selectedRing: null,
  heatmapMode: false,
  error: null,
  activeTab: 'graph',

  // Actions
  setCsvFile: (file) => set({ csvFile: file }),
  setCsvData: (data) => set({ csvData: data }),
  setProcessing: (val) => set({ isProcessing: val }),
  setProcessingProgress: (val) => set({ processingProgress: val }),
  setAnalysisResult: (result) => set({ analysisResult: result }),
  setSelectedNode: (node) => set({ selectedNode: node }),
  setSelectedRing: (ring) => set({ selectedRing: ring }),
  toggleHeatmapMode: () => set((state) => ({ heatmapMode: !state.heatmapMode })),
  setError: (err) => set({ error: err }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  reset: () => set({
    csvFile: null,
    csvData: [],
    isProcessing: false,
    processingProgress: 0,
    analysisResult: null,
    selectedNode: null,
    selectedRing: null,
    error: null
  })
}))
