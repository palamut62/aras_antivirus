import { useState } from 'react'
import { ShieldCheck, Loader2, AlertTriangle, CheckCircle2, Shield, XCircle, StopCircle, Copy, Check } from 'lucide-react'
import { useLang } from '../contexts/LangContext'
import { useScanStore } from '../stores/scanStore'

interface Threat {
  filePath: string
  fileName: string
  sha256: string
  extension: string
  sizeBytes: number
  entropy: number
  riskScore: number
  severity: string
  reasons: string[]
  heuristicMatches: string[]
  recommendedAction: string
}

export default function SecurityScan() {
  const { tx } = useLang()
  const { scanning, result, scanLog, scanType, customPath, taskId } = useScanStore(s => s.security)
  const set = useScanStore(s => s.setSecurity)
  const appendLog = useScanStore(s => s.appendSecurityLog)
  const [selectedThreat, setSelectedThreat] = useState<Threat | null>(null)
  const [logCopied, setLogCopied] = useState(false)

  const formatSize = (bytes: number) => {
    if (bytes >= 1e9) return (bytes / 1e9).toFixed(2) + ' GB'
    if (bytes >= 1e6) return (bytes / 1e6).toFixed(1) + ' MB'
    return (bytes / 1e3).toFixed(0) + ' KB'
  }

  const handleScan = async () => {
    set({ scanning: true, result: null, scanLog: [tx('Güvenlik taraması baslatılıyor...', 'Starting security scan...')], taskId: 'security-scan' })
    setSelectedThreat(null)

    const steps = scanType === 'quick'
      ? [tx('Downloads klasörü taranıyor...', 'Scanning Downloads folder...'), tx('Desktop kontrol ediliyor...', 'Checking Desktop...'), tx('Temp klasörü inceleniyor...', 'Examining Temp folder...'), tx('Hash analizi yapılıyor...', 'Running hash analysis...'), tx('Heuristic kontrol...', 'Heuristic check...'), tx('Entropy analizi...', 'Entropy analysis...')]
      : [tx('Kullanıcı profili taranıyor...', 'Scanning user profile...'), tx('Tüm alt klasörler kontrol ediliyor...', 'Checking all subfolders...'), tx('Çalıstırılabilir dosyalar analiz ediliyor...', 'Analyzing executable files...'), tx('Hash hesaplanıyor...', 'Calculating hashes...'), tx('Pattern analizi yapılıyor...', 'Running pattern analysis...'), tx('Risk skorlama...', 'Risk scoring...')]

    let idx = 0
    const interval = setInterval(() => {
      if (idx < steps.length) { appendLog(steps[idx]); idx++ }
    }, 600)

    try {
      const path = scanType === 'custom' ? customPath : undefined
      const r = await window.moleAPI.securityScan(scanType, path)
      clearInterval(interval)

      if (r.success) {
        // Save threats to ThreatDB
        if (r.data?.threats?.length > 0) {
          for (const t of r.data.threats) {
            await window.moleAPI.threatAdd({
              filePath: t.filePath,
              fileName: t.fileName,
              sha256: t.sha256,
              threatType: t.severity === 'high' ? 'malware' : t.severity === 'suspicious' ? 'trojan' : 'pup',
              threatName: t.heuristicMatches?.[0] || 'Unknown',
              severity: t.severity === 'high' ? 'high' : t.severity === 'suspicious' ? 'medium' : 'low',
              riskScore: t.riskScore,
              entropy: t.entropy,
              sizeBytes: t.sizeBytes,
              action: 'detected',
              source: 'scan',
              details: t.reasons?.join('; ') || '',
              heuristicMatches: t.heuristicMatches,
            })
          }
        }

        const threatCount = r.data?.threats?.length || 0
        set({
          scanning: false, result: r.data, taskId: null,
          scanLog: [...steps, tx('Güvenlik taraması baslatılıyor...', 'Starting security scan...'),
            tx(`Tarama tamamlandı! ${r.data?.scannedFiles || 0} dosya incelendi.`, `Scan complete! ${r.data?.scannedFiles || 0} files examined.`),
            threatCount > 0 ? tx(`${threatCount} süpheli dosya tespit edildi!`, `${threatCount} suspicious files detected!`) : tx('Tehdit bulunamadı.', 'No threats found.')
          ],
        })
      } else {
        set({ scanning: false, taskId: null, scanLog: [...steps, `${tx('Hata', 'Error')}: ${r.error}`] })
      }
    } catch (err: any) {
      clearInterval(interval)
      set({ scanning: false, taskId: null })
      appendLog(`${tx('Hata', 'Error')}: ${err.message}`)
    }
  }

  const handleStop = async () => {
    if (taskId) await window.moleAPI.taskCancel(taskId)
    set({ scanning: false, taskId: null })
    appendLog(tx('Tarama kullanıcı tarafından durduruldu.', 'Scan stopped by user.'))
  }

  const severityColor = (s: string) => {
    if (s === 'high') return 'text-red-400 bg-red-400/10 border-red-400/30'
    if (s === 'suspicious') return 'text-orange-400 bg-orange-400/10 border-orange-400/30'
    if (s === 'medium') return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30'
    return 'text-mole-safe bg-mole-safe/10 border-mole-safe/30'
  }

  const severityLabel = (s: string) => {
    if (s === 'high') return tx('Yüksek Risk', 'High Risk')
    if (s === 'suspicious') return tx('Süpheli', 'Suspicious')
    if (s === 'medium') return tx('Dikkat', 'Caution')
    return tx('Düsük', 'Low')
  }

  const severityIcon = (s: string) => {
    if (s === 'high') return <XCircle size={16} className="text-red-400" />
    if (s === 'suspicious') return <AlertTriangle size={16} className="text-orange-400" />
    if (s === 'medium') return <Shield size={16} className="text-yellow-400" />
    return <CheckCircle2 size={16} className="text-mole-safe" />
  }

  const handleQuarantine = async (threat: Threat) => {
    await window.moleAPI.quarantineAction('add', threat.filePath)
    // Update threat DB
    const threats = await window.moleAPI.threatSearch(threat.sha256)
    if (threats?.[0]) await window.moleAPI.threatUpdateAction(threats[0].id, 'quarantined')
    set({ result: { ...result, threats: result.threats.filter((t: Threat) => t.filePath !== threat.filePath) } })
    setSelectedThreat(null)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldCheck size={24} className="text-mole-accent" /> {tx('Güvenlik Taraması', 'Security Scan')}
        </h1>
        <p className="text-mole-text-muted mt-1">{tx('Dosyalarınızı tehdit ve risk analizi ile tarayın', 'Scan your files with threat and risk analysis')}</p>
      </div>

      {/* Scan type selection */}
      <div className="bg-mole-surface rounded-xl p-5 border border-mole-border space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {([
            { type: 'quick' as const, label: tx('Hızlı Tarama', 'Quick Scan'), desc: 'Downloads, Desktop, Temp' },
            { type: 'full' as const, label: tx('Tam Tarama', 'Full Scan'), desc: tx('Tüm kullanıcı profili', 'Entire user profile') },
            { type: 'custom' as const, label: tx('Özel Tarama', 'Custom Scan'), desc: tx('Belirli bir klasör', 'A specific folder') },
          ]).map(opt => (
            <button key={opt.type} onClick={() => set({ scanType: opt.type })}
              className={`p-4 rounded-lg border text-left transition-colors ${
                scanType === opt.type ? 'border-mole-accent bg-mole-accent/10' : 'border-mole-border hover:bg-mole-bg/50'
              }`}>
              <p className="font-medium text-sm">{opt.label}</p>
              <p className="text-xs text-mole-text-muted mt-1">{opt.desc}</p>
            </button>
          ))}
        </div>

        {scanType === 'custom' && (
          <input value={customPath} onChange={e => set({ customPath: e.target.value })}
            placeholder="C:\Users\you\suspicious-folder"
            className="w-full bg-mole-bg border border-mole-border rounded px-3 py-2 text-sm focus:outline-none focus:border-mole-accent" />
        )}

        <div className="flex gap-2">
          <button onClick={handleScan} disabled={scanning || (scanType === 'custom' && !customPath.trim())}
            className="flex items-center gap-2 px-6 py-2.5 bg-mole-accent hover:bg-mole-accent-hover disabled:opacity-50 rounded-lg font-medium transition-colors">
            {scanning ? <><Loader2 size={16} className="animate-spin" /> {tx('Taranıyor...', 'Scanning...')}</> : <><ShieldCheck size={16} /> {tx('Taramayı Baslat', 'Start Scan')}</>}
          </button>
          {scanning && (
            <button onClick={handleStop}
              className="flex items-center gap-2 px-4 py-2.5 bg-mole-danger hover:bg-mole-danger/80 rounded-lg font-medium transition-colors">
              <StopCircle size={16} /> {tx('Durdur', 'Stop')}
            </button>
          )}
        </div>
      </div>

      {/* Scan log */}
      {scanLog.length > 0 && (
        <div className="bg-mole-bg rounded-lg p-4 max-h-36 overflow-y-auto font-mono text-xs space-y-1 relative group/log">
          <button onClick={() => { navigator.clipboard.writeText(scanLog.join('\n')); setLogCopied(true); setTimeout(() => setLogCopied(false), 1500) }}
            className="absolute top-2 right-2 p-1.5 rounded bg-mole-surface/80 border border-mole-border opacity-0 group-hover/log:opacity-100 transition-opacity"
            title="Copy Logs">
            {logCopied ? <Check size={12} className="text-mole-safe" /> : <Copy size={12} className="text-mole-text-muted" />}
          </button>
          {scanLog.map((line, i) => (
            <div key={i} className="flex items-center gap-2">
              {i === scanLog.length - 1 && scanning
                ? <Loader2 size={12} className="animate-spin text-mole-accent shrink-0" />
                : <CheckCircle2 size={12} className="text-mole-safe shrink-0" />}
              <span className="text-mole-text-muted">{line}</span>
            </div>
          ))}
        </div>
      )}

      {/* Summary cards */}
      {result && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-mole-surface rounded-lg p-4 border border-mole-border">
            <p className="text-xs text-mole-text-muted">{tx('Taranan Dosya', 'Scanned Files')}</p>
            <p className="text-xl font-bold mt-1">{result.scannedFiles?.toLocaleString()}</p>
          </div>
          <div className="bg-mole-surface rounded-lg p-4 border border-mole-border">
            <p className="text-xs text-mole-text-muted">{tx('Tehdit', 'Threats')}</p>
            <p className="text-xl font-bold text-red-400 mt-1">{result.threats?.length || 0}</p>
          </div>
          <div className="bg-mole-surface rounded-lg p-4 border border-mole-border">
            <p className="text-xs text-mole-text-muted">{tx('Süre', 'Duration')}</p>
            <p className="text-xl font-bold mt-1">{result.scanDuration || '--'}</p>
          </div>
          <div className="bg-mole-surface rounded-lg p-4 border border-mole-border">
            <p className="text-xs text-mole-text-muted">{tx('Toplam Dosya', 'Total Files')}</p>
            <p className="text-xl font-bold mt-1">{result.totalFiles?.toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* Threat list + detail */}
      {result?.threats?.length > 0 && (
        <div className="flex gap-4">
          <div className="flex-1 space-y-1.5 max-h-96 overflow-y-auto">
            {result.threats.map((t: Threat, i: number) => (
              <button key={i} onClick={() => setSelectedThreat(t)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                  selectedThreat?.filePath === t.filePath ? 'border-mole-accent bg-mole-accent/5' : 'border-mole-border bg-mole-surface hover:bg-mole-bg/50'
                }`}>
                {severityIcon(t.severity)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{t.fileName}</p>
                  <p className="text-xs text-mole-text-muted truncate">{t.filePath}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold">{t.riskScore}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${severityColor(t.severity)}`}>
                    {severityLabel(t.severity)}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Detail panel */}
          {selectedThreat && (
            <div className="w-80 bg-mole-surface rounded-xl p-5 border border-mole-border space-y-4 max-h-96 overflow-y-auto shrink-0">
              <div>
                <p className="font-bold">{selectedThreat.fileName}</p>
                <p className="text-xs text-mole-text-muted mt-1 break-all">{selectedThreat.filePath}</p>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-mole-text-muted">{tx('Risk Skoru', 'Risk Score')}</span><span className="font-bold">{selectedThreat.riskScore}</span></div>
                <div className="flex justify-between"><span className="text-mole-text-muted">{tx('Seviye', 'Severity')}</span><span className={`px-2 py-0.5 rounded text-xs border ${severityColor(selectedThreat.severity)}`}>{severityLabel(selectedThreat.severity)}</span></div>
                <div className="flex justify-between"><span className="text-mole-text-muted">{tx('Boyut', 'Size')}</span><span>{formatSize(selectedThreat.sizeBytes)}</span></div>
                <div className="flex justify-between"><span className="text-mole-text-muted">{tx('Entropy', 'Entropy')}</span><span>{selectedThreat.entropy?.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-mole-text-muted">{tx('Uzantı', 'Extension')}</span><span>{selectedThreat.extension}</span></div>
              </div>
              <div>
                <p className="text-xs font-semibold text-mole-text-muted mb-1">SHA-256</p>
                <p className="text-[10px] font-mono text-mole-text-muted break-all bg-mole-bg rounded p-2">{selectedThreat.sha256}</p>
              </div>
              <div>
                <p className="text-xs font-semibold mb-2">{tx('Tetiklenen Kurallar', 'Triggered Rules')}</p>
                <div className="space-y-1">
                  {selectedThreat.reasons.map((r, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <AlertTriangle size={12} className="text-mole-warning shrink-0 mt-0.5" />
                      <span>{r}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold mb-1">{tx('Önerilen Aksiyon', 'Recommended Action')}</p>
                <p className="text-xs text-mole-text-muted">{selectedThreat.recommendedAction}</p>
              </div>
              <button onClick={() => handleQuarantine(selectedThreat)}
                className="w-full py-2 bg-mole-danger hover:bg-mole-danger/80 rounded-lg text-sm font-medium transition-colors">
                {tx('Karantinaya Al', 'Quarantine')}
              </button>
            </div>
          )}
        </div>
      )}

      {result && result.threats?.length === 0 && (
        <div className="bg-mole-safe/10 border border-mole-safe/30 rounded-xl p-6 text-center">
          <CheckCircle2 size={40} className="text-mole-safe mx-auto mb-3" />
          <p className="font-semibold text-mole-safe">{tx('Tehdit bulunamadı!', 'No threats found!')}</p>
          <p className="text-sm text-mole-text-muted mt-1">{tx('Taranan dosyalarda süpheli bir sey tespit edilmedi.', 'No suspicious activity detected in scanned files.')}</p>
        </div>
      )}
    </div>
  )
}
