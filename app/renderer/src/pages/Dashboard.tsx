import { useEffect, useRef, useState } from 'react'
import { HardDrive, Trash2, Zap, Shield, Loader2, CheckCircle2, FolderSearch, AlertTriangle, StopCircle, Copy, Check } from 'lucide-react'
import { useLang } from '../contexts/LangContext'
import { useScanStore } from '../stores/scanStore'

interface ScanCategory {
  id: string
  label: string
  path: string
  sizeBytes: number
  fileCount: number
  riskLevel: string
}

export default function Dashboard() {
  const { tx } = useLang()
  const { scanning, scanResult, scanLog, taskId } = useScanStore(s => s.dashboard)
  const set = useScanStore(s => s.setDashboard)
  const appendLog = useScanStore(s => s.appendDashboardLog)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [logCopied, setLogCopied] = useState(false)

  // Cleanup interval on unmount (but NOT the scan itself)
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const handleScan = async () => {
    set({ scanning: true, scanResult: null, scanLog: [], taskId: 'scan' })

    const locations = [
      tx('Windows Temp klasoru taranıyor...', 'Scanning Windows Temp folder...'),
      tx('Kullanıcı Temp dosyaları kontrol ediliyor...', 'Checking user Temp files...'),
      tx('Chrome önbelleği taranıyor...', 'Scanning Chrome cache...'),
      tx('Edge önbelleği taranıyor...', 'Scanning Edge cache...'),
      tx('Crash dump dosyaları aranıyor...', 'Searching crash dump files...'),
      tx('Windows Update önbelleği kontrol ediliyor...', 'Checking Windows Update cache...'),
      tx('Thumbnail cache taranıyor...', 'Scanning thumbnail cache...'),
      tx('Geri Dönüsüm Kutusu kontrol ediliyor...', 'Checking Recycle Bin...'),
      tx('npm önbelleği taranıyor...', 'Scanning npm cache...'),
      tx('pip önbelleği taranıyor...', 'Scanning pip cache...'),
    ]

    let logIdx = 0
    intervalRef.current = setInterval(() => {
      if (logIdx < locations.length) {
        appendLog(locations[logIdx])
        logIdx++
      }
    }, 400)

    try {
      const result = await window.moleAPI.scanRun()
      if (intervalRef.current) clearInterval(intervalRef.current)
      intervalRef.current = null
      if (result.success) {
        set({
          scanning: false,
          scanResult: result,
          scanLog: [...locations, tx(`Tarama tamamlandı! ${result.data?.categories?.length || 0} kategori bulundu.`, `Scan complete! ${result.data?.categories?.length || 0} categories found.`)],
          taskId: null,
        })
      } else {
        set({
          scanning: false,
          scanLog: [...locations, `${tx('Hata', 'Error')}: ${result.error || tx('Bilinmeyen hata', 'Unknown error')}`],
          taskId: null,
        })
      }
    } catch (err: any) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      intervalRef.current = null
      set({
        scanning: false,
        scanLog: [...useScanStore.getState().dashboard.scanLog, `${tx('Hata', 'Error')}: ${err.message}`],
        taskId: null,
      })
    }
  }

  const handleStop = async () => {
    if (taskId) {
      await window.moleAPI.taskCancel(taskId)
    }
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = null
    set({
      scanning: false,
      taskId: null,
      scanLog: [...useScanStore.getState().dashboard.scanLog, tx('Tarama kullanıcı tarafından durduruldu.', 'Scan stopped by user.')],
    })
  }

  const formatSize = (bytes: number) => {
    if (bytes >= 1e9) return (bytes / 1e9).toFixed(2) + ' GB'
    if (bytes >= 1e6) return (bytes / 1e6).toFixed(1) + ' MB'
    if (bytes >= 1e3) return (bytes / 1e3).toFixed(0) + ' KB'
    return bytes + ' B'
  }

  const riskIcon = (level: string) => {
    if (level === 'safe') return <CheckCircle2 size={14} className="text-mole-safe" />
    if (level === 'review') return <AlertTriangle size={14} className="text-mole-warning" />
    return <Shield size={14} className="text-mole-danger" />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{tx('Kontrol Paneli', 'Dashboard')}</h1>
        <p className="text-mole-text-muted mt-1">{tx('Sistem durumu ve hızlı islemler', 'System status and quick actions')}</p>
      </div>

      {/* Quick Stats */}
      {scanResult?.data && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { icon: HardDrive, label: tx('Kazanılabilir Alan', 'Reclaimable Space'), value: formatSize(scanResult.data.totalSize), color: 'text-mole-accent' },
            { icon: Trash2, label: tx('Kategori', 'Categories'), value: scanResult.data.categories?.length || 0, color: 'text-mole-warning' },
            { icon: Zap, label: tx('Toplam Dosya', 'Total Files'), value: scanResult.data.totalItems?.toLocaleString() || '0', color: 'text-mole-safe' },
            { icon: Shield, label: tx('Korunan', 'Protected'), value: scanResult.data.protectedCount || '0', color: 'text-mole-danger' },
          ].map((stat) => (
            <div key={stat.label} className="bg-mole-surface rounded-xl p-5 border border-mole-border">
              <div className="flex items-center gap-3 mb-3">
                <stat.icon size={20} className={stat.color} />
                <span className="text-mole-text-muted text-sm">{stat.label}</span>
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Scan Button + Stop + Live Log */}
      <div className="bg-mole-surface rounded-xl p-6 border border-mole-border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">{tx('Hızlı Tarama', 'Quick Scan')}</h2>
            <p className="text-mole-text-muted text-sm">
              {tx('Sisteminizi tarayın. Hiçbir dosya silinmez.', 'Scan your system. No files will be deleted.')}
            </p>
          </div>
          <div className="flex gap-2">
            {scanning && (
              <button
                onClick={handleStop}
                className="flex items-center gap-2 px-4 py-3 bg-mole-danger hover:bg-mole-danger/80 rounded-lg font-medium transition-colors"
              >
                <StopCircle size={18} /> {tx('Durdur', 'Stop')}
              </button>
            )}
            <button
              onClick={handleScan}
              disabled={scanning}
              className="flex items-center gap-2 px-6 py-3 bg-mole-accent hover:bg-mole-accent-hover disabled:opacity-50 rounded-lg font-medium transition-colors"
            >
              {scanning ? <><Loader2 size={18} className="animate-spin" /> {tx('Taranıyor...', 'Scanning...')}</> : <><FolderSearch size={18} /> {tx('Taramayı Başlat', 'Start Scan')}</>}
            </button>
          </div>
        </div>

        {/* Live scan log */}
        {scanLog.length > 0 && (
          <div className="bg-mole-bg rounded-lg p-4 max-h-48 overflow-y-auto font-mono text-xs space-y-1 relative group/log">
            <button onClick={() => { navigator.clipboard.writeText(scanLog.join('\n')); setLogCopied(true); setTimeout(() => setLogCopied(false), 1500) }}
              className="absolute top-2 right-2 p-1.5 rounded bg-mole-surface/80 border border-mole-border opacity-0 group-hover/log:opacity-100 transition-opacity"
              title={tx('Logları Kopyala', 'Copy Logs')}>
              {logCopied ? <Check size={12} className="text-mole-safe" /> : <Copy size={12} className="text-mole-text-muted" />}
            </button>
            {scanLog.map((line, i) => (
              <div key={i} className="flex items-center gap-2">
                {i === scanLog.length - 1 && scanning ? (
                  <Loader2 size={12} className="animate-spin text-mole-accent shrink-0" />
                ) : (
                  <CheckCircle2 size={12} className="text-mole-safe shrink-0" />
                )}
                <span className={i === scanLog.length - 1 && !scanning && scanResult?.success
                  ? 'text-mole-safe font-medium' : 'text-mole-text-muted'}>
                  {line}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Scan Results - Category Cards */}
      {scanResult?.data?.categories && (
        <div className="bg-mole-surface rounded-xl p-6 border border-mole-border">
          <h2 className="text-lg font-semibold mb-4">{tx('Tarama Sonuçları', 'Scan Results')}</h2>
          <div className="space-y-2">
            {scanResult.data.categories.map((cat: ScanCategory) => (
              <div key={cat.id} className="flex items-center gap-4 py-3 px-4 bg-mole-bg rounded-lg hover:bg-mole-bg/80 transition-colors">
                {riskIcon(cat.riskLevel)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{cat.label}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                      cat.riskLevel === 'safe' ? 'bg-mole-safe/20 text-mole-safe' :
                      cat.riskLevel === 'review' ? 'bg-mole-warning/20 text-mole-warning' :
                      'bg-mole-danger/20 text-mole-danger'
                    }`}>
                      {cat.riskLevel === 'safe' ? tx('güvenli', 'safe') : cat.riskLevel === 'review' ? tx('incelenmeli', 'review') : tx('riskli', 'risky')}
                    </span>
                  </div>
                  <p className="text-xs text-mole-text-muted truncate mt-0.5">{cat.path}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-semibold text-sm">{formatSize(cat.sizeBytes)}</p>
                  <p className="text-xs text-mole-text-muted">{cat.fileCount.toLocaleString()} {tx('dosya', 'files')}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Total bar */}
          <div className="mt-4 pt-4 border-t border-mole-border flex items-center justify-between">
            <span className="text-mole-text-muted text-sm">{tx('Toplam kazanılabilir alan', 'Total reclaimable space')}</span>
            <span className="text-xl font-bold text-mole-accent">{formatSize(scanResult.data.totalSize)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
