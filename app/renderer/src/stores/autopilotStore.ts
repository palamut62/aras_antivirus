import { create } from 'zustand'

export interface AutopilotLog {
  id: number
  time: string
  module: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
}

export interface AutopilotStats {
  threatsFound: number
  threatsQuarantined: number
  filesCleaned: number
  spaceFreed: number
  connectionsChecked: number
  suspiciousBlocked: number
  usbScanned: number
  lastFullScan: string | null
}

interface AutopilotStore {
  enabled: boolean
  initialized: boolean
  running: boolean
  phase: string
  logs: AutopilotLog[]
  stats: AutopilotStats
  setEnabled: (enabled: boolean) => Promise<void>
  initialize: (enabledFromSettings: boolean) => Promise<void>
  start: () => Promise<void>
  stop: (opts?: { silent?: boolean }) => void
}

const EMPTY_STATS: AutopilotStats = {
  threatsFound: 0,
  threatsQuarantined: 0,
  filesCleaned: 0,
  spaceFreed: 0,
  connectionsChecked: 0,
  suspiciousBlocked: 0,
  usbScanned: 0,
  lastFullScan: null,
}

let timerRef: ReturnType<typeof setInterval> | null = null
let runningRef = false
let cycleInFlight = false
let logId = 0

function nowTime() {
  return new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function formatSize(bytes: number) {
  if (!bytes || bytes <= 0) return '0 KB'
  if (bytes >= 1e9) return (bytes / 1e9).toFixed(2) + ' GB'
  if (bytes >= 1e6) return (bytes / 1e6).toFixed(1) + ' MB'
  return (bytes / 1e3).toFixed(0) + ' KB'
}

function addLog(module: string, message: string, type: AutopilotLog['type'] = 'info') {
  const entry: AutopilotLog = {
    id: ++logId,
    time: nowTime(),
    module,
    message,
    type,
  }
  useAutopilotStore.setState((s) => ({
    logs: [...s.logs.slice(-249), entry],
  }))
}

async function runCycle() {
  if (!runningRef || cycleInFlight) return
  cycleInFlight = true
  const set = useAutopilotStore.setState
  try {
    // 1) Security scan
    set({ phase: 'Guvenlik Taramasi' })
    addLog('Security', 'Hizli guvenlik taramasi baslatiliyor...')
    try {
      const scanResult = await window.moleAPI.securityScan('quick')
      if (scanResult.success && scanResult.data) {
        const threats = scanResult.data.threats || []
        const scanned = scanResult.data.scannedFiles || 0
        addLog('Security', `${scanned} dosya tarandi, ${threats.length} tehdit`, threats.length > 0 ? 'warning' : 'success')
        set((prev) => ({
          stats: { ...prev.stats, threatsFound: prev.stats.threatsFound + threats.length },
        }))
        for (const threat of threats) {
          if (!runningRef) break
          if (threat.riskScore >= 50) {
            addLog('Quarantine', `Karantinaya aliniyor: ${threat.fileName}`, 'warning')
            try {
              await window.moleAPI.quarantineAction('add', threat.filePath)
              await window.moleAPI.threatAdd({
                fileName: threat.fileName,
                filePath: threat.filePath,
                sha256: threat.sha256 || '',
                threatName: threat.reason || 'Suspicious',
                threatType: threat.riskScore >= 70 ? 'malware' : 'pup',
                severity: threat.riskScore >= 70 ? 'high' : 'medium',
                riskScore: threat.riskScore,
                action: 'quarantined',
              })
              set((prev) => ({
                stats: { ...prev.stats, threatsQuarantined: prev.stats.threatsQuarantined + 1 },
              }))
              addLog('Quarantine', `${threat.fileName} karantinaya alindi`, 'success')
            } catch {
              addLog('Quarantine', `${threat.fileName} karantinaya alinamadi`, 'error')
            }
          }
        }
      }
    } catch {
      addLog('Security', 'Guvenlik taramasi hatasi', 'error')
    }

    if (!runningRef) return

    // 2) Network check
    set({ phase: 'Ag Kontrolu' })
    addLog('Network', 'Ag baglantilari kontrol ediliyor...')
    try {
      const netResult = await window.moleAPI.networkMonitor('suspicious-connections')
      if (netResult.success && netResult.data) {
        const flagged = netResult.data.flaggedCount || 0
        const total = netResult.data.totalConnections || 0
        set((prev) => ({
          stats: { ...prev.stats, connectionsChecked: prev.stats.connectionsChecked + total },
        }))
        if (flagged > 0) {
          addLog('Network', `${flagged} supheli baglanti tespit edildi`, 'warning')
          const conns = netResult.data.connections || []
          for (const conn of conns) {
            if (!runningRef) break
            if (conn.riskScore >= 60 && conn.remoteAddress) {
              addLog('Network', `Engelleniyor: ${conn.remoteAddress} (risk: ${conn.riskScore})`, 'warning')
              try {
                await window.moleAPI.networkMonitor('block-ip', conn.remoteAddress)
                set((prev) => ({
                  stats: { ...prev.stats, suspiciousBlocked: prev.stats.suspiciousBlocked + 1 },
                }))
                addLog('Network', `${conn.remoteAddress} engellendi`, 'success')
              } catch {
                addLog('Network', `${conn.remoteAddress} engellenemedi`, 'error')
              }
            }
          }
        } else {
          addLog('Network', `${total} baglanti temiz`, 'success')
        }
      }
    } catch {
      addLog('Network', 'Ag kontrolu hatasi', 'error')
    }

    if (!runningRef) return

    // 3) USB check
    set({ phase: 'USB Kontrolu' })
    addLog('USB', 'USB cihazlari kontrol ediliyor...')
    try {
      const usbResult = await window.moleAPI.usbMonitor('list-devices')
      if (usbResult.success && usbResult.data?.devices) {
        const devices = usbResult.data.devices || []
        const removable = devices.filter((d: any) => d.isRemovable)
        if (removable.length > 0) {
          for (const dev of removable) {
            if (!runningRef) break
            addLog('USB', `Taraniyor: ${dev.driveLetter || dev.caption}`)
            if (dev.driveLetter) {
              const scanRes = await window.moleAPI.usbMonitor('scan-drive', dev.driveLetter)
              if (scanRes.success && scanRes.data?.threatCount > 0) {
                addLog('USB', `${scanRes.data.threatCount} tehdit bulundu`, 'warning')
              } else {
                addLog('USB', `${dev.driveLetter} temiz`, 'success')
              }
              set((prev) => ({
                stats: { ...prev.stats, usbScanned: prev.stats.usbScanned + 1 },
              }))
            }
          }
        } else {
          addLog('USB', 'Takilabilir USB cihazi yok')
        }
      }
    } catch {
      addLog('USB', 'USB kontrolu hatasi', 'error')
    }

    if (!runningRef) return

    // 4) Safe cleanup
    set({ phase: 'Otomatik Temizlik' })
    addLog('Cleanup', 'Guvenli temizlik taraniyor...')
    try {
      const cleanScan = await window.moleAPI.scanRun()
      if (cleanScan.success && cleanScan.data?.categories) {
        const safeCategories = cleanScan.data.categories
          .filter((c: any) => c.riskLevel === 'safe' && c.sizeBytes > 0)
        const totalSafe = safeCategories.reduce((sum: number, c: any) => sum + c.sizeBytes, 0)
        if (safeCategories.length > 0 && totalSafe > 1024 * 1024) {
          const ids = safeCategories.map((c: any) => c.id)
          addLog('Cleanup', `${safeCategories.length} guvenli kategori temizleniyor (${formatSize(totalSafe)})`)
          const cleanResult = await window.moleAPI.cleanExecute(ids)
          if (cleanResult.success) {
            const freed = cleanResult.data?.sizeFreed || totalSafe
            set((prev) => ({
              stats: {
                ...prev.stats,
                filesCleaned: prev.stats.filesCleaned + (cleanResult.data?.itemCount || safeCategories.length),
                spaceFreed: prev.stats.spaceFreed + freed,
              },
            }))
            addLog('Cleanup', `${formatSize(freed)} alan kazanildi`, 'success')
          } else {
            addLog('Cleanup', 'Temizlik tamamlanamadi', 'warning')
          }
        } else {
          addLog('Cleanup', 'Temizlenecek onemli bir sey yok', 'success')
        }
      }
    } catch {
      addLog('Cleanup', 'Temizlik hatasi', 'error')
    }

    set((prev) => ({
      phase: 'Bekleniyor...',
      stats: { ...prev.stats, lastFullScan: new Date().toLocaleTimeString('tr-TR') },
    }))
    addLog('Autopilot', 'Dongu tamamlandi. Sonraki dongu 5 dakika sonra.')
  } finally {
    cycleInFlight = false
  }
}

export const useAutopilotStore = create<AutopilotStore>((set, get) => ({
  enabled: false,
  initialized: false,
  running: false,
  phase: '',
  logs: [],
  stats: { ...EMPTY_STATS },

  setEnabled: async (enabled: boolean) => {
    set({ enabled })
    if (enabled) {
      await get().start()
    } else {
      get().stop({ silent: true })
    }
  },

  initialize: async (enabledFromSettings: boolean) => {
    if (get().initialized) return
    set({ initialized: true, enabled: enabledFromSettings })
    if (enabledFromSettings) {
      await get().start()
    }
  },

  start: async () => {
    if (runningRef) return
    runningRef = true
    set({ running: true, phase: 'Baslatiliyor...' })
    addLog('Autopilot', 'Autopilot modu baslatildi', 'success')
    try {
      await window.moleAPI.guardControl('start')
      addLog('Guard', 'Arka plan korumasi aktif', 'success')
    } catch {
      addLog('Guard', 'Arka plan korumasi baslatilamadi', 'warning')
    }

    await runCycle()
    if (!runningRef) return
    timerRef = setInterval(() => {
      if (runningRef) {
        void runCycle()
      }
    }, 5 * 60 * 1000)
  },

  stop: (opts?: { silent?: boolean }) => {
    runningRef = false
    cycleInFlight = false
    if (timerRef) {
      clearInterval(timerRef)
      timerRef = null
    }
    set({ running: false, phase: '' })
    if (!opts?.silent) {
      addLog('Autopilot', 'Autopilot modu durduruldu')
    }
  },
}))
