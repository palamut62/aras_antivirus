import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface ScanState {
  scanning: boolean
  scanResult: any
  scanLog: string[]
  taskId: string | null
}

export interface CleanState {
  scanning: boolean
  cleaning: boolean
  categories: any[]
  cleanResult: any
  taskId: string | null
}

export interface SecurityState {
  scanning: boolean
  result: any
  scanLog: string[]
  scanType: 'quick' | 'full' | 'custom'
  customPath: string
  taskId: string | null
}

interface ScanStore {
  dashboard: ScanState
  deepClean: CleanState
  security: SecurityState

  setDashboard: (partial: Partial<ScanState>) => void
  setDeepClean: (partial: Partial<CleanState>) => void
  setSecurity: (partial: Partial<SecurityState>) => void

  appendDashboardLog: (line: string) => void
  appendSecurityLog: (line: string) => void
}

export const useScanStore = create<ScanStore>()(
  persist(
    (set) => ({
      dashboard: { scanning: false, scanResult: null, scanLog: [], taskId: null },
      deepClean: { scanning: false, cleaning: false, categories: [], cleanResult: null, taskId: null },
      security: { scanning: false, result: null, scanLog: [], scanType: 'quick', customPath: '', taskId: null },

      setDashboard: (partial) => set((s) => ({ dashboard: { ...s.dashboard, ...partial } })),
      setDeepClean: (partial) => set((s) => ({ deepClean: { ...s.deepClean, ...partial } })),
      setSecurity: (partial) => set((s) => ({ security: { ...s.security, ...partial } })),

      appendDashboardLog: (line) => set((s) => ({ dashboard: { ...s.dashboard, scanLog: [...s.dashboard.scanLog, line] } })),
      appendSecurityLog: (line) => set((s) => ({ security: { ...s.security, scanLog: [...s.security.scanLog, line] } })),
    }),
    {
      name: 'aras-scan-store',
      partialize: (state) => ({
        // Only persist scan results, not transient state
        dashboard: {
          scanning: false,
          scanResult: state.dashboard.scanResult,
          scanLog: state.dashboard.scanLog,
          taskId: null,
        },
        security: {
          scanning: false,
          result: state.security.result,
          scanLog: state.security.scanLog,
          scanType: state.security.scanType,
          customPath: state.security.customPath,
          taskId: null,
        },
      }),
    }
  )
)
