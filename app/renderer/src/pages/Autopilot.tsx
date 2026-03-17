import { useState, useEffect, useRef } from 'react'
import { Bot, Play, Square, Shield, Trash2, Wifi, Usb, HardDrive, CheckCircle2, AlertTriangle, Loader2, Clock } from 'lucide-react'
import { useLang } from '../contexts/LangContext'

interface AutopilotLog {
  id: number
  time: string
  module: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  detail?: string
}

interface AutopilotStats {
  threatsFound: number
  threatsQuarantined: number
  filesCleaned: number
  spaceFreed: number
  connectionsChecked: number
  suspiciousBlocked: number
  usbScanned: number
  lastFullScan: string | null
}

export default function Autopilot() {
  const { tx } = useLang()
  const [running, setRunning] = useState(false)
  const [logs, setLogs] = useState<AutopilotLog[]>([])
  const [stats, setStats] = useState<AutopilotStats>({
    threatsFound: 0, threatsQuarantined: 0, filesCleaned: 0, spaceFreed: 0,
    connectionsChecked: 0, suspiciousBlocked: 0, usbScanned: 0, lastFullScan: null,
  })
  const [phase, setPhase] = useState('')
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const runningRef = useRef(false)
  const logIdRef = useRef(0)
  const logsEndRef = useRef<HTMLDivElement>(null)

  const addLog = (module: string, message: string, type: AutopilotLog['type'] = 'info', detail?: string) => {
    const id = ++logIdRef.current
    const time = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    setLogs(prev => [...prev.slice(-200), { id, time, module, message, type, detail }])
  }

  const formatSize = (bytes: number) => {
    if (!bytes || bytes <= 0) return '0 KB'
    if (bytes >= 1e9) return (bytes / 1e9).toFixed(2) + ' GB'
    if (bytes >= 1e6) return (bytes / 1e6).toFixed(1) + ' MB'
    return (bytes / 1e3).toFixed(0) + ' KB'
  }

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const runAutopilotCycle = async () => {
    if (!runningRef.current) return

    // 1. Security Scan
    setPhase(tx('Guvenlik Taramasi', 'Security Scan'))
    addLog('Security', tx('Hizli guvenlik taramasi baslatiliyor...', 'Starting quick security scan...'))
    try {
      const scanResult = await window.moleAPI.securityScan('quick')
      if (scanResult.success && scanResult.data) {
        const threats = scanResult.data.threats || []
        const scanned = scanResult.data.scannedFiles || 0
        addLog('Security', `${scanned} ${tx('dosya tarandi', 'files scanned')}, ${threats.length} ${tx('tehdit', 'threats')}`,
          threats.length > 0 ? 'warning' : 'success')

        setStats(prev => ({ ...prev, threatsFound: prev.threatsFound + threats.length }))

        // Auto-quarantine high risk threats
        for (const threat of threats) {
          if (!runningRef.current) break
          if (threat.riskScore >= 50) {
            addLog('Quarantine', `${tx('Karantinaya aliniyor', 'Quarantining')}: ${threat.fileName}`, 'warning')
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
              setStats(prev => ({ ...prev, threatsQuarantined: prev.threatsQuarantined + 1 }))
              addLog('Quarantine', `${threat.fileName} ${tx('karantinaya alindi', 'quarantined')}`, 'success')
            } catch { }
          }
        }
      }
    } catch (e) {
      addLog('Security', tx('Tarama hatasi', 'Scan error'), 'error')
    }

    if (!runningRef.current) return

    // 2. Network Check
    setPhase(tx('Ag Kontrolu', 'Network Check'))
    addLog('Network', tx('Ag baglantilari kontrol ediliyor...', 'Checking network connections...'))
    try {
      const netResult = await window.moleAPI.networkMonitor('suspicious-connections')
      if (netResult.success && netResult.data) {
        const flagged = netResult.data.flaggedCount || 0
        const total = netResult.data.totalConnections || 0
        setStats(prev => ({ ...prev, connectionsChecked: prev.connectionsChecked + total }))

        if (flagged > 0) {
          addLog('Network', `${flagged} ${tx('supheli baglanti tespit edildi', 'suspicious connections detected')}`, 'warning')
          // Auto-block high risk connections
          const conns = netResult.data.connections || []
          for (const conn of conns) {
            if (!runningRef.current) break
            if (conn.riskScore >= 60 && conn.remoteAddress) {
              addLog('Network', `${tx('Engelleniyor', 'Blocking')}: ${conn.remoteAddress} (risk: ${conn.riskScore})`, 'warning')
              try {
                await window.moleAPI.networkMonitor('block-ip', conn.remoteAddress)
                setStats(prev => ({ ...prev, suspiciousBlocked: prev.suspiciousBlocked + 1 }))
                addLog('Network', `${conn.remoteAddress} ${tx('engellendi', 'blocked')}`, 'success')
              } catch { }
            }
          }
        } else {
          addLog('Network', `${total} ${tx('baglanti kontrol edildi — temiz', 'connections checked — clean')}`, 'success')
        }
      }
    } catch {
      addLog('Network', tx('Ag kontrolu hatasi', 'Network check error'), 'error')
    }

    if (!runningRef.current) return

    // 3. USB Check
    setPhase(tx('USB Kontrolu', 'USB Check'))
    addLog('USB', tx('USB cihazlari kontrol ediliyor...', 'Checking USB devices...'))
    try {
      const usbResult = await window.moleAPI.usbMonitor('list-devices')
      if (usbResult.success && usbResult.data?.devices) {
        const devices = usbResult.data.devices || []
        const removable = devices.filter((d: any) => d.isRemovable)
        if (removable.length > 0) {
          for (const dev of removable) {
            if (!runningRef.current) break
            addLog('USB', `${tx('Taraniyor', 'Scanning')}: ${dev.driveLetter || dev.caption}`)
            if (dev.driveLetter) {
              const scanRes = await window.moleAPI.usbMonitor('scan-drive', dev.driveLetter)
              if (scanRes.success && scanRes.data?.threatCount > 0) {
                addLog('USB', `${scanRes.data.threatCount} ${tx('tehdit bulundu', 'threats found')}!`, 'warning')
              } else {
                addLog('USB', `${dev.driveLetter} ${tx('temiz', 'clean')}`, 'success')
              }
              setStats(prev => ({ ...prev, usbScanned: prev.usbScanned + 1 }))
            }
          }
        } else {
          addLog('USB', tx('Takilabilir USB cihazi yok', 'No removable USB devices'), 'info')
        }
      }
    } catch {
      addLog('USB', tx('USB kontrolu hatasi', 'USB check error'), 'error')
    }

    if (!runningRef.current) return

    // 4. Cleanup (safe items only)
    setPhase(tx('Otomatik Temizlik', 'Auto Cleanup'))
    addLog('Cleanup', tx('Guvenli temizlik taraniyor...', 'Scanning for safe cleanup...'))
    try {
      const cleanScan = await window.moleAPI.scanRun()
      if (cleanScan.success && cleanScan.data?.categories) {
        const safeCategories = cleanScan.data.categories
          .filter((c: any) => c.riskLevel === 'safe' && c.sizeBytes > 0)
        const totalSafe = safeCategories.reduce((s: number, c: any) => s + c.sizeBytes, 0)

        if (safeCategories.length > 0 && totalSafe > 1024 * 1024) { // Only clean if > 1MB
          const ids = safeCategories.map((c: any) => c.id)
          addLog('Cleanup', `${safeCategories.length} ${tx('guvenli kategori temizleniyor', 'safe categories cleaning')} (${formatSize(totalSafe)})`)
          const cleanResult = await window.moleAPI.cleanExecute(ids)
          if (cleanResult.success) {
            const freed = cleanResult.data?.sizeFreed || totalSafe
            setStats(prev => ({
              ...prev,
              filesCleaned: prev.filesCleaned + (cleanResult.data?.itemCount || safeCategories.length),
              spaceFreed: prev.spaceFreed + freed,
            }))
            addLog('Cleanup', `${formatSize(freed)} ${tx('alan kazanildi', 'space freed')}`, 'success')
          }
        } else {
          addLog('Cleanup', tx('Temizlenecek onemli bir sey yok', 'Nothing significant to clean'), 'success')
        }
      }
    } catch {
      addLog('Cleanup', tx('Temizlik hatasi', 'Cleanup error'), 'error')
    }

    setStats(prev => ({ ...prev, lastFullScan: new Date().toLocaleTimeString('tr-TR') }))
    setPhase(tx('Bekleniyor...', 'Waiting...'))
    addLog('Autopilot', tx('Dongu tamamlandi. Sonraki dongu 5 dakika sonra.', 'Cycle complete. Next cycle in 5 minutes.'), 'info')
  }

  const startAutopilot = async () => {
    setRunning(true)
    runningRef.current = true
    setLogs([])
    addLog('Autopilot', tx('Autopilot modu baslatildi!', 'Autopilot mode started!'), 'success')

    // Ensure background guard is running
    await window.moleAPI.guardControl('start')
    addLog('Guard', tx('Arka plan korumasi aktif', 'Background protection active'), 'success')

    // Run first cycle immediately
    await runAutopilotCycle()

    // Then repeat every 5 minutes
    intervalRef.current = setInterval(() => {
      if (runningRef.current) runAutopilotCycle()
    }, 5 * 60 * 1000)
  }

  const stopAutopilot = () => {
    runningRef.current = false
    setRunning(false)
    setPhase('')
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    addLog('Autopilot', tx('Autopilot modu durduruldu', 'Autopilot mode stopped'), 'info')
  }

  useEffect(() => {
    return () => {
      runningRef.current = false
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const moduleColor = (mod: string) => {
    switch (mod) {
      case 'Security': return 'text-red-400'
      case 'Quarantine': return 'text-orange-400'
      case 'Network': return 'text-blue-400'
      case 'USB': return 'text-purple-400'
      case 'Cleanup': return 'text-emerald-400'
      case 'Guard': return 'text-cyan-400'
      default: return 'text-mole-accent'
    }
  }

  const logTypeStyle = (type: AutopilotLog['type']) => {
    switch (type) {
      case 'success': return 'text-mole-safe'
      case 'warning': return 'text-mole-warning'
      case 'error': return 'text-mole-danger'
      default: return 'text-mole-text-muted'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bot size={24} className="text-mole-accent" /> Autopilot
          </h1>
          <p className="text-mole-text-muted mt-1">{tx('Tam otomatik koruma — tarama, temizlik, engelleme, karantina', 'Fully automatic protection — scan, clean, block, quarantine')}</p>
        </div>
        {running ? (
          <button onClick={stopAutopilot}
            className="flex items-center gap-2 px-6 py-2.5 bg-mole-danger hover:bg-mole-danger/80 rounded-lg font-medium transition-colors">
            <Square size={16} /> {tx('Durdur', 'Stop')}
          </button>
        ) : (
          <button onClick={startAutopilot}
            className="flex items-center gap-2 px-6 py-2.5 bg-mole-accent hover:bg-mole-accent-hover rounded-lg font-medium transition-colors">
            <Play size={16} /> {tx('Autopilot Baslat', 'Start Autopilot')}
          </button>
        )}
      </div>

      {/* Current Phase */}
      {running && phase && (
        <div className="flex items-center gap-3 bg-mole-accent/10 border border-mole-accent/30 rounded-lg p-3">
          <Loader2 size={16} className="animate-spin text-mole-accent" />
          <span className="font-medium text-sm">{phase}</span>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard icon={<Shield size={18} />} label={tx('Tehdit', 'Threats')} value={stats.threatsFound} color="text-red-400" sub={`${stats.threatsQuarantined} ${tx('karantina', 'quarantined')}`} />
        <StatCard icon={<Trash2 size={18} />} label={tx('Temizlik', 'Cleanup')} value={formatSize(stats.spaceFreed)} color="text-emerald-400" sub={`${stats.filesCleaned} ${tx('dosya', 'files')}`} />
        <StatCard icon={<Wifi size={18} />} label={tx('Ag', 'Network')} value={stats.connectionsChecked} color="text-blue-400" sub={`${stats.suspiciousBlocked} ${tx('engel', 'blocked')}`} />
        <StatCard icon={<Usb size={18} />} label="USB" value={stats.usbScanned} color="text-purple-400" sub={stats.lastFullScan ? `${tx('Son', 'Last')}: ${stats.lastFullScan}` : '—'} />
      </div>

      {/* What Autopilot Does */}
      {!running && logs.length === 0 && (
        <div className="bg-mole-surface rounded-xl p-6 border border-mole-border">
          <h3 className="font-medium mb-4">{tx('Autopilot ne yapar?', 'What does Autopilot do?')}</h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <Shield size={16} className="text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">{tx('Guvenlik Taramasi', 'Security Scan')}</p>
                <p className="text-mole-text-muted">{tx('Hizli tarama, risk >= 50 otomatik karantina, tehdit veritabanina kayit', 'Quick scan, auto-quarantine risk >= 50, save to threat database')}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Wifi size={16} className="text-blue-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">{tx('Ag Korumasi', 'Network Protection')}</p>
                <p className="text-mole-text-muted">{tx('Supheli baglantilari tespit et, risk >= 60 otomatik IP engelle', 'Detect suspicious connections, auto-block IP for risk >= 60')}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Usb size={16} className="text-purple-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">{tx('USB Taramasi', 'USB Scanning')}</p>
                <p className="text-mole-text-muted">{tx('Takili USB cihazlarini otomatik tara, autorun.inf kontrolu', 'Auto-scan plugged USB devices, check autorun.inf')}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Trash2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">{tx('Otomatik Temizlik', 'Auto Cleanup')}</p>
                <p className="text-mole-text-muted">{tx('Sadece guvenli kategorileri temizle (temp, cache). Riskli dosyalara dokunmaz.', 'Only clean safe categories (temp, cache). Does not touch risky files.')}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock size={16} className="text-mole-accent shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">{tx('5 Dakikada Bir', 'Every 5 Minutes')}</p>
                <p className="text-mole-text-muted">{tx('Tum islemler 5 dakikada bir otomatik tekrarlanir', 'All operations repeat automatically every 5 minutes')}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Live Log */}
      {logs.length > 0 && (
        <div className="bg-mole-surface rounded-xl border border-mole-border overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-mole-border">
            <p className="text-xs font-medium text-mole-text-muted">{tx('Canli Log', 'Live Log')} ({logs.length})</p>
            {running && <span className="w-2 h-2 rounded-full bg-mole-safe animate-pulse" />}
          </div>
          <div className="max-h-[350px] overflow-y-auto p-3 space-y-0.5 font-mono text-xs">
            {logs.map(log => (
              <div key={log.id} className={`flex gap-2 ${logTypeStyle(log.type)}`}>
                <span className="text-mole-text-muted/50 shrink-0">{log.time}</span>
                <span className={`shrink-0 w-20 text-right ${moduleColor(log.module)}`}>[{log.module}]</span>
                <span>{log.message}</span>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ icon, label, value, color, sub }: { icon: React.ReactNode; label: string; value: string | number; color: string; sub: string }) {
  return (
    <div className="bg-mole-surface rounded-lg p-4 border border-mole-border">
      <div className={`${color} mb-2`}>{icon}</div>
      <p className="text-xs text-mole-text-muted">{label}</p>
      <p className="text-lg font-bold mt-0.5">{value}</p>
      <p className="text-[10px] text-mole-text-muted mt-1">{sub}</p>
    </div>
  )
}
