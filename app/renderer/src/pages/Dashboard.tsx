import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { HardDrive, Trash2, Zap, Shield, Loader2, CheckCircle2, FolderSearch, AlertTriangle, StopCircle, Copy, Check, Activity, Clock, Sparkles, ListChecks, ShieldCheck, ExternalLink, Download, X, Info } from 'lucide-react'
import { useLang } from '../contexts/LangContext'
import { useScanStore } from '../stores/scanStore'
import { useNotificationStore } from '../stores/notificationStore'

interface ScanCategory {
  id: string
  label: string
  path: string
  sizeBytes: number
  fileCount: number
  riskLevel: string
}

interface HistoryEntry {
  id: string
  timestamp: string
  action: 'scan' | 'clean' | 'quarantine' | 'restore' | 'delete' | 'purge' | 'block'
  target: string
  details: string
  riskScore?: number
  sizeBytes?: number
  status: 'success' | 'error' | 'cancelled'
}

interface HistoryInsight {
  objectLabel: string
  objectDetail: string
  deleteImpact: string
  keepImpact: string
  recommendation: string
}

export default function Dashboard() {
  const { tx } = useLang()
  const { scanning, scanResult, scanLog, taskId } = useScanStore(s => s.dashboard)
  const set = useScanStore(s => s.setDashboard)
  const appendLog = useScanStore(s => s.appendDashboardLog)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [logCopied, setLogCopied] = useState(false)
  const [recentHistory, setRecentHistory] = useState<HistoryEntry[]>([])
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null)
  const [historyDialogEntry, setHistoryDialogEntry] = useState<HistoryEntry | null>(null)
  const notifications = useNotificationStore(s => s.notifications)
  const pushNotif = useNotificationStore(s => s.push)
  const navigate = useNavigate()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [cleaning, setCleaning] = useState(false)
  const [cleanResult, setCleanResult] = useState<any>(null)

  // Auto-select non-safe categories after scan
  useEffect(() => {
    const cats: ScanCategory[] = scanResult?.data?.categories || []
    if (cats.length > 0 && selected.size === 0) {
      setSelected(new Set(cats.filter(c => c.riskLevel === 'safe').map(c => c.id)))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanResult?.data?.categories])

  // Load recent history
  useEffect(() => {
    window.moleAPI.historyList(10, 0).then(setRecentHistory).catch(() => {})
    const interval = setInterval(() => {
      window.moleAPI.historyList(10, 0).then(setRecentHistory).catch(() => {})
    }, 15000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (recentHistory.length === 0) {
      if (selectedHistoryId !== null) setSelectedHistoryId(null)
      return
    }
    if (!selectedHistoryId) {
      setSelectedHistoryId(recentHistory[0].id)
      return
    }
    if (!recentHistory.some(h => h.id === selectedHistoryId)) {
      setSelectedHistoryId(recentHistory[0].id)
    }
  }, [recentHistory, selectedHistoryId])

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

  const toggleCat = (id: string) => {
    setSelected(prev => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }

  const selectAll = (only?: 'safe' | 'all') => {
    const cats: ScanCategory[] = scanResult?.data?.categories || []
    if (only === 'safe') setSelected(new Set(cats.filter(c => c.riskLevel === 'safe').map(c => c.id)))
    else setSelected(new Set(cats.map(c => c.id)))
  }

  const cleanSelected = async () => {
    if (selected.size === 0) return
    setCleaning(true); setCleanResult(null)
    try {
      const r = await window.moleAPI.cleanExecute(Array.from(selected))
      setCleanResult(r)
      if (r.success) {
        pushNotif({
          type: 'success',
          title: tx('Temizlik tamamlandı!', 'Cleanup completed!'),
          message: `${formatSize(r.data?.sizeFreed || 0)} ${tx('kazanıldı', 'freed')}`,
        })
        // Reset scan to reflect new state — user can rescan
        set({ scanResult: null, scanLog: [] })
        setSelected(new Set())
        // Refresh history
        window.moleAPI.historyList(10, 0).then(setRecentHistory).catch(() => {})
      } else {
        pushNotif({
          type: 'error',
          title: tx('Temizlik hatası', 'Cleanup error'),
          message: r.error,
        })
      }
    } catch (e: any) {
      pushNotif({ type: 'error', title: tx('Hata', 'Error'), message: e.message })
    } finally {
      setCleaning(false)
    }
  }

  const exportResults = () => {
    if (!scanResult?.data) return
    const blob = new Blob([JSON.stringify(scanResult.data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `aras-scan-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const selectedSize = (scanResult?.data?.categories || [])
    .filter((c: ScanCategory) => selected.has(c.id))
    .reduce((s: number, c: ScanCategory) => s + c.sizeBytes, 0)

  const hasRisky = (scanResult?.data?.categories || []).some((c: ScanCategory) => c.riskLevel !== 'safe' && selected.has(c.id))

  const riskIcon = (level: string) => {
    if (level === 'safe') return <CheckCircle2 size={14} className="text-mole-safe" />
    if (level === 'review') return <AlertTriangle size={14} className="text-mole-warning" />
    return <Shield size={14} className="text-mole-danger" />
  }

  const actionToRoute: Record<HistoryEntry['action'], string> = {
    scan: '/status',
    clean: '/deep-clean',
    quarantine: '/quarantine',
    restore: '/quarantine',
    delete: '/logs',
    purge: '/dev-purge',
    block: '/web-protection',
  }

  const actionLabel = (action: HistoryEntry['action']) => {
    const labels: Record<HistoryEntry['action'], string> = {
      scan: tx('Tarama', 'Scan'),
      clean: tx('Temizlik', 'Cleanup'),
      quarantine: tx('Karantina', 'Quarantine'),
      restore: tx('Geri Yukleme', 'Restore'),
      delete: tx('Silme', 'Delete'),
      purge: 'Purge',
      block: tx('Engelleme', 'Block'),
    }
    return labels[action] || action
  }

  const statusLabel = (status: HistoryEntry['status']) => {
    const labels: Record<HistoryEntry['status'], string> = {
      success: tx('Basarili', 'Success'),
      error: tx('Hatali', 'Error'),
      cancelled: tx('Iptal', 'Cancelled'),
    }
    return labels[status] || status
  }

  const getHistoryInsight = (entry: HistoryEntry): HistoryInsight => {
    const raw = `${entry.target} ${entry.details || ''}`.toLowerCase()

    const targetMap = [
      { keys: ['windows_temp', 'windows temp'], label: 'Windows Temp', detail: tx('Windows ve kurulumlarin gecici dosyalari.', 'Temporary files created by Windows and installers.') },
      { keys: ['chrome_cache', 'chrome cache'], label: 'Chrome Cache', detail: tx('Chrome tarayici onbellek dosyalari.', 'Cached web files used by Chrome.') },
      { keys: ['edge_cache', 'edge cache'], label: 'Edge Cache', detail: tx('Edge tarayici onbellek dosyalari.', 'Cached web files used by Edge.') },
      { keys: ['thumbnail_cache', 'thumbnail cache'], label: 'Thumbnail Cache', detail: tx('Gorsel kucuk resim onizleme onbellekleri.', 'Thumbnail preview cache files.') },
      { keys: ['npm_cache', 'npm cache'], label: 'NPM Cache', detail: tx('Node paket yoneticisi gecici onbellek dosyalari.', 'Temporary cache files created by npm.') },
      { keys: ['pip_cache', 'pip cache'], label: 'PIP Cache', detail: tx('Python paket yoneticisi onbellek dosyalari.', 'Temporary cache files created by pip.') },
      { keys: ['recycle', 'geri donusum', 'recycle bin'], label: tx('Geri Donusum Kutusu', 'Recycle Bin'), detail: tx('Silinmis dosyalarin bekledigi alan.', 'Storage area for deleted files.') },
    ]

    const mapped = targetMap.find(m => m.keys.some(k => raw.includes(k)))
    const objectLabel = mapped?.label || entry.target
    const objectDetail = mapped?.detail || tx('Bu kayit bir sistem islemi ozetidir.', 'This record summarizes a system operation.')

    if (entry.action === 'scan') {
      return {
        objectLabel,
        objectDetail,
        deleteImpact: tx('Bu satir tarama sonucudur, henuz silme yapilmamistir. Gorulen GB degeri temizlenebilir alan tahminidir.', 'This row is a scan result; nothing has been deleted yet. The GB value is an estimate of reclaimable space.'),
        keepImpact: tx('Temizlik yapmazsaniz sistem ayni sekilde calismaya devam eder; sadece gecici dosyalar diskte kalir.', 'If you do not clean, the system keeps working the same way; temporary files simply remain on disk.'),
        recommendation: tx('Detayli inceleme icin Derin Temizlik ekranindan kategori bazli karar verin.', 'For precise control, review categories in Deep Clean before deleting anything.'),
      }
    }

    if (entry.action === 'clean' || entry.action === 'purge' || entry.action === 'delete') {
      return {
        objectLabel,
        objectDetail,
        deleteImpact: tx('Bu kayitta temizlik/silme islemi uygulanmis. Kazanilan alan kalici olur.', 'Cleanup/delete has already been applied in this record. Reclaimed space remains available.'),
        keepImpact: tx('Ayni hedefler silinmese disk dolulugu artar; performans etkisi genelde depolama baskisina baglidir.', 'If these targets are kept, disk usage increases; performance impact depends on storage pressure.'),
        recommendation: tx('Sistem dosyalarina ait gorunen satirlarda once Logs/Deep Clean ekranindan hedefi dogrulayin.', 'For system-related targets, verify exact paths in Logs/Deep Clean before future deletions.'),
      }
    }

    if (entry.action === 'quarantine' || entry.action === 'restore') {
      return {
        objectLabel,
        objectDetail,
        deleteImpact: tx('Karantina islemlerinde dosya izolasyona alinmis veya geri yuklenmis olabilir.', 'Quarantine operations indicate files were isolated or restored.'),
        keepImpact: tx('Supheli dosya geri yuklu kalirsa risk devam edebilir; karantinada kalirsa calistirilamaz.', 'If suspicious files stay restored, risk may continue; if quarantined, they cannot execute.'),
        recommendation: tx('Bu tur kayitlari Karantina ekranindan dosya bazinda yonetin.', 'Manage these entries per file from the Quarantine page.'),
      }
    }

    return {
      objectLabel,
      objectDetail,
      deleteImpact: tx('Bu islem satiri bilgilendirme amaclidir; etkiler islem tipine gore degisir.', 'This operation row is informational; impact depends on action type.'),
      keepImpact: tx('Islem yapilmadiginda mevcut durum korunur.', 'When no action is taken, current state remains unchanged.'),
      recommendation: tx('Detayli islem gecmisi icin Tum gecmisi ac secenegini kullanin.', 'Use Open full history for full operation details.'),
    }
  }

  const looksLikePath = (value: string) => /^[a-zA-Z]:\\/.test(value) || value.startsWith('\\\\')

  const openHistoryTarget = async (entry: HistoryEntry) => {
    if (!looksLikePath(entry.target)) return
    try {
      await window.moleAPI.fileOpen(entry.target)
    } catch {
      pushNotif({
        type: 'error',
        title: tx('Hedef acilamadi', 'Could not open target'),
        message: entry.target,
      })
    }
  }

  const dialogEntry = historyDialogEntry
  const dialogInsight = dialogEntry ? getHistoryInsight(dialogEntry) : null

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
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">{tx('Tarama Sonuçları', 'Scan Results')}</h2>
            <div className="flex items-center gap-2 text-xs">
              <button onClick={() => selectAll('safe')} className="px-2 py-1 border border-mole-border rounded hover:bg-mole-bg">{tx('Sadece güvenli', 'Safe only')}</button>
              <button onClick={() => selectAll('all')} className="px-2 py-1 border border-mole-border rounded hover:bg-mole-bg">{tx('Tümünü seç', 'Select all')}</button>
              <button onClick={() => setSelected(new Set())} className="px-2 py-1 border border-mole-border rounded hover:bg-mole-bg">{tx('Temizle', 'Clear')}</button>
            </div>
          </div>
          <div className="space-y-2">
            {scanResult.data.categories.map((cat: ScanCategory) => {
              const isSelected = selected.has(cat.id)
              return (
                <label key={cat.id} className={`flex items-center gap-3 py-3 px-4 rounded-lg cursor-pointer transition-colors border ${
                  isSelected ? 'bg-mole-accent/5 border-mole-accent/30' : 'bg-mole-bg border-transparent hover:bg-mole-bg/80'
                }`}>
                  <input type="checkbox" checked={isSelected} onChange={() => toggleCat(cat.id)}
                    className="accent-mole-accent w-4 h-4 shrink-0" />
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
                </label>
              )
            })}
          </div>

          {/* Action bar */}
          <div className="mt-4 pt-4 border-t border-mole-border flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-mole-text-muted text-xs">{tx('Seçili', 'Selected')}: {selected.size} / {scanResult.data.categories.length}</p>
              <p className="text-xl font-bold text-mole-accent">{formatSize(selectedSize)}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={exportResults}
                className="flex items-center gap-1.5 px-3 py-2 text-sm border border-mole-border rounded hover:bg-mole-bg">
                <Download size={14} /> {tx('Dışa Aktar', 'Export')}
              </button>
              <button onClick={() => navigate('/deep-clean')}
                className="flex items-center gap-1.5 px-3 py-2 text-sm border border-mole-border rounded hover:bg-mole-bg">
                <ListChecks size={14} /> {tx('Detaylı Yönet', 'Manage in detail')}
              </button>
              <button onClick={cleanSelected} disabled={cleaning || selected.size === 0}
                className={`flex items-center gap-1.5 px-4 py-2 text-sm rounded font-medium ${
                  hasRisky ? 'bg-mole-danger hover:bg-mole-danger/80' : 'bg-mole-accent hover:bg-mole-accent-hover'
                } disabled:opacity-50`}>
                {cleaning
                  ? <><Loader2 size={14} className="animate-spin" /> {tx('Temizleniyor...', 'Cleaning...')}</>
                  : <><Trash2 size={14} /> {tx('Seçilenleri Temizle', 'Clean Selected')}</>}
              </button>
            </div>
          </div>

          {/* Clean result */}
          {cleanResult && (
            <div className={`mt-4 p-3 rounded-lg border ${cleanResult.success ? 'bg-mole-safe/10 border-mole-safe/30' : 'bg-mole-danger/10 border-mole-danger/30'}`}>
              <p className="font-medium text-sm">
                {cleanResult.success
                  ? `${tx('Temizlik tamamlandı', 'Cleanup completed')} — ${formatSize(cleanResult.data?.sizeFreed || 0)} ${tx('kazanıldı', 'freed')}`
                  : `${tx('Hata', 'Error')}: ${cleanResult.error}`}
              </p>
            </div>
          )}
        </div>
      )}

      {/* "Sonra ne yapacaksın?" — next-steps panel after scan */}
      {scanResult?.data?.categories && !cleaning && (
        <div className="bg-mole-surface rounded-xl p-6 border border-mole-border">
          <h2 className="text-lg font-semibold mb-1">{tx('Önerilen Sonraki Adımlar', 'Recommended Next Steps')}</h2>
          <p className="text-mole-text-muted text-sm mb-4">{tx('Temizlik dışında sistemini daha güvenli ve hızlı yap', 'Beyond cleanup — make your system safer and faster')}</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { icon: ShieldCheck, label: tx('Güvenlik Tarama', 'Security Scan'), desc: tx('Defender + heuristic + VT', 'Defender + heuristic + VT'), route: '/security-scan', accent: true },
              { icon: AlertTriangle, label: tx('Davranış İzleme', 'Behavior Monitor'), desc: tx('Şüpheli process pattern\'leri', 'Suspicious process patterns'), route: '/behavior' },
              { icon: Shield, label: tx('Güvenlik Açıkları', 'Vulnerabilities'), desc: tx('Yüklü programları CVE ile eşle', 'Match installed apps with CVE'), route: '/vuln-scan' },
              { icon: Zap, label: tx('Sistem Optimize', 'System Optimize'), desc: tx('DNS, Defrag, Search, SFC', 'DNS, Defrag, Search, SFC'), route: '/system-optimize' },
              { icon: Sparkles, label: tx('Derin Temizlik', 'Deep Clean'), desc: tx('19 kategori ayrıntı', '19-category detail'), route: '/deep-clean' },
              { icon: HardDrive, label: tx('Disk Analizi', 'Disk Analysis'), desc: tx('Hangi klasör ne kadar yer kaplıyor', 'Which folder uses how much'), route: '/analyze' },
              { icon: ExternalLink, label: tx('Program Kaldırıcı', 'App Uninstaller'), desc: tx('Kullanılmayan programları kaldır', 'Remove unused programs'), route: '/app-uninstaller' },
              { icon: Activity, label: tx('Geçmiş', 'History'), desc: tx('Tüm işlem geçmişini incele', 'Review all operation history'), route: '/logs' },
            ].map((s, i) => {
              const Icon = s.icon
              return (
                <button key={i} onClick={() => navigate(s.route)}
                  className={`text-left p-3 rounded-lg border transition-colors group ${
                    s.accent
                      ? 'bg-mole-accent/5 border-mole-accent/30 hover:bg-mole-accent/10'
                      : 'bg-mole-bg border-mole-border hover:bg-mole-bg/60 hover:border-mole-accent/30'
                  }`}>
                  <Icon size={18} className={s.accent ? 'text-mole-accent' : 'text-mole-text-muted group-hover:text-mole-accent'} />
                  <p className="font-medium text-sm mt-2">{s.label}</p>
                  <p className="text-xs text-mole-text-muted mt-0.5">{s.desc}</p>
                </button>
              )
            })}
          </div>
        </div>
      )}

            {/* Son Aktiviteler / Recent Activity */}
      {recentHistory.length > 0 && (
        <div className="bg-mole-surface rounded-xl p-6 border border-mole-border">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <Activity size={18} className="text-mole-accent" />
              <h2 className="text-lg font-semibold">{tx('Son Aktiviteler', 'Recent Activity')}</h2>
            </div>
            <button
              onClick={() => navigate('/logs')}
              className="text-xs px-3 py-1.5 rounded border border-mole-border hover:bg-mole-bg transition-colors"
            >
              {tx('Tum gecmisi ac', 'Open full history')}
            </button>
          </div>
          <p className="text-xs text-mole-text-muted mb-3">
            {tx('Satira tiklayarak detay dialogunu acabilirsiniz.', 'Click a row to open the detail dialog.')}
          </p>
          <div className="space-y-1.5">
            {recentHistory.map((h: HistoryEntry, i: number) => {
              const isActive = selectedHistoryId === h.id
              return (
                <button
                  key={h.id || i}
                  onClick={() => { setSelectedHistoryId(h.id); setHistoryDialogEntry(h) }}
                  className={`w-full flex items-center gap-3 py-2 px-3 rounded-lg text-sm text-left border transition-colors ${
                    isActive
                      ? 'bg-mole-accent/10 border-mole-accent/40'
                      : 'bg-mole-bg border-transparent hover:border-mole-border'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full shrink-0 ${
                    h.status === 'success' ? 'bg-mole-safe' : h.status === 'error' ? 'bg-mole-danger' : 'bg-mole-warning'
                  }`} />
                  <span className="font-medium shrink-0 w-20 text-mole-text-muted text-xs uppercase">{actionLabel(h.action)}</span>
                  <span className="flex-1 truncate">{h.target}</span>
                  {h.sizeBytes && h.sizeBytes > 0 && (
                    <span className="text-xs text-mole-accent shrink-0">{formatSize(h.sizeBytes)}</span>
                  )}
                  <span className="text-xs text-mole-text-muted shrink-0 flex items-center gap-1">
                    <Clock size={10} />
                    {h.timestamp ? new Date(h.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '--'}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {dialogEntry && dialogInsight && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/65 backdrop-blur-sm p-4">
          <div className="absolute inset-0" onClick={() => setHistoryDialogEntry(null)} />
          <div className="relative w-full max-w-3xl rounded-2xl border border-mole-border bg-mole-surface shadow-2xl max-h-[85vh] overflow-y-auto no-scrollbar">
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 py-4 border-b border-mole-border bg-mole-surface/95 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <Info size={16} className="text-mole-accent" />
                <h3 className="text-base font-semibold">{tx('Aktivite Detayi', 'Activity Detail')}</h3>
              </div>
              <button
                onClick={() => setHistoryDialogEntry(null)}
                className="p-1.5 rounded hover:bg-mole-bg text-mole-text-muted hover:text-mole-text transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-mole-bg rounded-lg p-3 border border-mole-border">
                  <p className="text-xs text-mole-text-muted mb-1">{tx('Islem', 'Action')}</p>
                  <p className="font-semibold">{actionLabel(dialogEntry.action)}</p>
                </div>
                <div className="bg-mole-bg rounded-lg p-3 border border-mole-border">
                  <p className="text-xs text-mole-text-muted mb-1">{tx('Durum', 'Status')}</p>
                  <p className="font-semibold">{statusLabel(dialogEntry.status)}</p>
                </div>
                <div className="bg-mole-bg rounded-lg p-3 border border-mole-border">
                  <p className="text-xs text-mole-text-muted mb-1">{tx('Zaman', 'Time')}</p>
                  <p className="font-semibold">{new Date(dialogEntry.timestamp).toLocaleString()}</p>
                </div>
                <div className="bg-mole-bg rounded-lg p-3 border border-mole-border">
                  <p className="text-xs text-mole-text-muted mb-1">{tx('Boyut', 'Size')}</p>
                  <p className="font-semibold">{dialogEntry.sizeBytes && dialogEntry.sizeBytes > 0 ? formatSize(dialogEntry.sizeBytes) : '--'}</p>
                </div>
              </div>

              <div className="bg-mole-bg rounded-lg p-4 border border-mole-border">
                <p className="text-xs text-mole-text-muted mb-1">{tx('Nedir?', 'What is this?')}</p>
                <p className="font-semibold text-sm">{dialogInsight.objectLabel}</p>
                <p className="text-xs text-mole-text-muted mt-1">{dialogInsight.objectDetail}</p>
              </div>

              {dialogEntry.details && (
                <div className="bg-mole-bg rounded-lg p-4 border border-mole-border">
                  <p className="text-xs text-mole-text-muted mb-1">{tx('Teknik Detay', 'Technical Detail')}</p>
                  <p className="text-sm">{dialogEntry.details}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-mole-danger/10 rounded-lg p-4 border border-mole-danger/30">
                  <p className="text-xs font-semibold text-mole-danger mb-1">{tx('Silinirse/Temizlenirse', 'If deleted/cleaned')}</p>
                  <p className="text-xs text-mole-text-muted">{dialogInsight.deleteImpact}</p>
                </div>
                <div className="bg-mole-warning/10 rounded-lg p-4 border border-mole-warning/30">
                  <p className="text-xs font-semibold text-mole-warning mb-1">{tx('Silinmezse', 'If kept')}</p>
                  <p className="text-xs text-mole-text-muted">{dialogInsight.keepImpact}</p>
                </div>
              </div>

              <div className="bg-mole-accent/10 rounded-lg p-4 border border-mole-accent/30">
                <p className="text-xs font-semibold text-mole-accent mb-1">{tx('Oneri', 'Recommendation')}</p>
                <p className="text-xs text-mole-text-muted">{dialogInsight.recommendation}</p>
              </div>

              <div className="pt-1 flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => navigate(actionToRoute[dialogEntry.action] || '/logs')}
                  className="px-3 py-2 text-xs rounded bg-mole-accent hover:bg-mole-accent-hover transition-colors"
                >
                  {tx('Ilgili ekrana git', 'Open related page')}
                </button>
                {looksLikePath(dialogEntry.target) && (
                  <button
                    onClick={() => openHistoryTarget(dialogEntry)}
                    className="px-3 py-2 text-xs rounded border border-mole-border hover:bg-mole-bg transition-colors"
                  >
                    {tx('Hedefi ac', 'Open target')}
                  </button>
                )}
                <button
                  onClick={() => navigate('/logs')}
                  className="px-3 py-2 text-xs rounded border border-mole-border hover:bg-mole-bg transition-colors"
                >
                  {tx('Tum gecmisi ac', 'Open full history')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

