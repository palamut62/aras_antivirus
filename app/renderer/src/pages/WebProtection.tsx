import { useState } from 'react'
import { Globe, Download, Chrome, FileWarning, Loader2, AlertTriangle, CheckCircle2, Shield, Check } from 'lucide-react'
import { useLang } from '../contexts/LangContext'

type ScanTab = 'downloads' | 'browser' | 'extensions' | 'temp'

export default function WebProtection() {
  const { tx } = useLang()
  const [selected, setSelected] = useState<Set<ScanTab>>(new Set(['downloads', 'browser', 'extensions', 'temp']))
  const [scanning, setScanning] = useState(false)
  const [scanningTab, setScanningTab] = useState<ScanTab | null>(null)
  const [results, setResults] = useState<Record<string, any>>({})
  const [progress, setProgress] = useState({ done: 0, total: 0 })

  const tabs = [
    { id: 'downloads' as ScanTab, label: tx('İndirilenler', 'Downloads'), icon: Download, desc: tx('Son 24 saat indirilen dosyalar', 'Files downloaded in last 24 hours') },
    { id: 'browser' as ScanTab, label: tx('Tarayıcı Geçmişi', 'Browser History'), icon: Chrome, desc: tx('Şüpheli site ziyaretleri', 'Suspicious site visits') },
    { id: 'extensions' as ScanTab, label: tx('Eklentiler', 'Extensions'), icon: Globe, desc: tx('Tarayıcı eklenti kontrolü', 'Browser extension check') },
    { id: 'temp' as ScanTab, label: tx('Temp Çalıştırılabilir', 'Temp Executables'), icon: FileWarning, desc: tx('Geçici klasördeki tehditler', 'Threats in temp folder') },
  ]

  const actionMap: Record<ScanTab, string> = {
    downloads: 'scan-downloads',
    browser: 'scan-browser-history',
    extensions: 'check-extensions',
    temp: 'scan-temp-executables',
  }

  const toggle = (id: ScanTab) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () => {
    if (selected.size === tabs.length) setSelected(new Set())
    else setSelected(new Set(tabs.map(t => t.id)))
  }

  const handleScan = async () => {
    if (selected.size === 0) return
    setScanning(true)
    setResults({})
    const targets = tabs.filter(t => selected.has(t.id))
    setProgress({ done: 0, total: targets.length })

    for (let i = 0; i < targets.length; i++) {
      const tab = targets[i]
      setScanningTab(tab.id)
      try {
        const r = await window.moleAPI.webProtection(actionMap[tab.id])
        if (r.success) {
          setResults(prev => ({ ...prev, [tab.id]: r.data }))
        }
      } catch {}
      setProgress({ done: i + 1, total: targets.length })
    }

    setScanningTab(null)
    setScanning(false)
  }

  const severityIcon = (score: number) => {
    if (score >= 50) return <AlertTriangle size={14} className="text-red-400" />
    if (score >= 25) return <Shield size={14} className="text-yellow-400" />
    return <CheckCircle2 size={14} className="text-mole-safe" />
  }

  const totalFlagged = Object.values(results).reduce((sum: number, r: any) => sum + (r?.flaggedCount || 0), 0)
  const totalFound = Object.values(results).reduce((sum: number, r: any) => sum + (r?.totalFound || 0), 0)
  const hasResults = Object.keys(results).length > 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Globe size={24} className="text-mole-accent" /> {tx('Web Koruma', 'Web Protection')}
        </h1>
        <p className="text-mole-text-muted mt-1">{tx('Web indirmeleri, tarayıcı güvenliği ve çalıştırılabilir dosya kontrolü', 'Web downloads, browser security and executable file checks')}</p>
      </div>

      {/* Tab selection with checkboxes */}
      <div className="flex items-center justify-between">
        <button onClick={selectAll} className="text-xs text-mole-accent hover:underline">
          {selected.size === tabs.length ? tx('Hiçbirini Seçme', 'Deselect All') : tx('Tümünü Seç', 'Select All')}
        </button>
        <p className="text-xs text-mole-text-muted">{selected.size}/{tabs.length} {tx('seçili', 'selected')}</p>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {tabs.map(tab => {
          const isSelected = selected.has(tab.id)
          const isScanning = scanningTab === tab.id
          const tabResult = results[tab.id]
          const hasTabResult = !!tabResult

          return (
            <button key={tab.id} onClick={() => !scanning && toggle(tab.id)}
              className={`relative p-4 rounded-lg border text-left transition-all ${
                isSelected
                  ? 'border-mole-accent bg-mole-accent/10'
                  : 'border-mole-border bg-mole-surface hover:bg-mole-bg/50 opacity-60'
              } ${isScanning ? 'ring-2 ring-mole-accent ring-offset-1 ring-offset-mole-bg' : ''}`}>

              {/* Checkbox */}
              <div className={`absolute top-2 right-2 w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                isSelected ? 'bg-mole-accent border-mole-accent' : 'border-mole-border bg-mole-bg'
              }`}>
                {isSelected && <Check size={12} className="text-white" />}
              </div>

              {/* Scanning indicator */}
              {isScanning && (
                <div className="absolute top-2 left-2">
                  <Loader2 size={14} className="text-mole-accent animate-spin" />
                </div>
              )}

              {/* Result badge */}
              {hasTabResult && !isScanning && (
                <div className="absolute top-2 left-2">
                  {(tabResult.flaggedCount || 0) > 0
                    ? <AlertTriangle size={14} className="text-mole-warning" />
                    : <CheckCircle2 size={14} className="text-mole-safe" />
                  }
                </div>
              )}

              <tab.icon size={20} className={isSelected ? 'text-mole-accent' : 'text-mole-text-muted'} />
              <p className="font-medium text-sm mt-2">{tab.label}</p>
              <p className="text-[11px] text-mole-text-muted mt-1">{tab.desc}</p>

              {/* Tab result summary */}
              {hasTabResult && (
                <p className="text-[10px] mt-2 font-medium">
                  {(tabResult.flaggedCount || 0) > 0
                    ? <span className="text-mole-warning">{tabResult.flaggedCount} {tx('tehdit', 'threats')}</span>
                    : <span className="text-mole-safe">{tx('Temiz', 'Clean')}</span>
                  }
                </p>
              )}
            </button>
          )
        })}
      </div>

      {/* Scan button + progress */}
      <div className="flex items-center gap-4">
        <button onClick={handleScan} disabled={scanning || selected.size === 0}
          className="flex items-center gap-2 px-6 py-2.5 bg-mole-accent hover:bg-mole-accent-hover disabled:opacity-50 rounded-lg font-medium transition-colors">
          {scanning
            ? <><Loader2 size={16} className="animate-spin" /> {tx('Taranıyor...', 'Scanning...')} ({progress.done}/{progress.total})</>
            : <><Shield size={16} /> {tx('Seçilenleri Tara', 'Scan Selected')} ({selected.size})</>
          }
        </button>
        {selected.size === 0 && !scanning && (
          <p className="text-xs text-mole-text-muted">{tx('En az bir kategori seçin', 'Select at least one category')}</p>
        )}
      </div>

      {/* Summary */}
      {hasResults && !scanning && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-mole-surface rounded-lg p-4 border border-mole-border">
            <p className="text-xs text-mole-text-muted">{tx('Toplam Bulunan', 'Total Found')}</p>
            <p className="text-xl font-bold mt-1">{totalFound}</p>
          </div>
          <div className="bg-mole-surface rounded-lg p-4 border border-mole-border">
            <p className="text-xs text-mole-text-muted">{tx('İşaretlenen', 'Flagged')}</p>
            <p className="text-xl font-bold text-mole-warning mt-1">{totalFlagged}</p>
          </div>
          <div className="bg-mole-surface rounded-lg p-4 border border-mole-border">
            <p className="text-xs text-mole-text-muted">{tx('Taranan Kategori', 'Categories Scanned')}</p>
            <p className="text-xl font-bold mt-1">{Object.keys(results).length}</p>
          </div>
        </div>
      )}

      {/* Detailed results per category */}
      {hasResults && !scanning && Object.entries(results).map(([tabId, result]) => {
        const tab = tabs.find(t => t.id === tabId)
        if (!tab || !result) return null

        return (
          <div key={tabId} className="space-y-2">
            <div className="flex items-center gap-2">
              <tab.icon size={16} className="text-mole-accent" />
              <h3 className="font-semibold text-sm">{tab.label}</h3>
              {(result.flaggedCount || 0) > 0
                ? <span className="text-xs px-2 py-0.5 rounded-full bg-mole-warning/20 text-mole-warning">{result.flaggedCount} {tx('tehdit', 'threats')}</span>
                : <span className="text-xs px-2 py-0.5 rounded-full bg-mole-safe/20 text-mole-safe">{tx('Temiz', 'Clean')}</span>
              }
              <span className="text-xs text-mole-text-muted ml-auto">{result.scanTime || ''}</span>
            </div>

            {result.results?.length > 0 ? (
              <div className="space-y-1.5 max-h-[250px] overflow-y-auto">
                {result.results.map((item: any, i: number) => (
                  <div key={i} className="bg-mole-surface rounded-lg p-3 border border-mole-border">
                    <div className="flex items-start gap-3">
                      {severityIcon(item.riskScore || 0)}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{item.fileName || item.domain || item.name || item.description || tx('Bilinmeyen', 'Unknown')}</p>
                        <p className="text-xs text-mole-text-muted mt-0.5 truncate">{item.path || item.url || item.id || ''}</p>
                        {item.reason && <p className="text-xs text-mole-warning mt-0.5">{item.reason}</p>}
                        {item.reasons?.map((r: string, j: number) => (
                          <p key={j} className="text-xs text-mole-warning mt-0.5">{r}</p>
                        ))}
                        {item.signer && <p className="text-xs text-mole-text-muted mt-0.5">{tx('İmza', 'Signature')}: {item.signer}</p>}
                        {item.isFromInternet !== undefined && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full mt-1 inline-block ${
                            item.isFromInternet ? 'bg-mole-warning/20 text-mole-warning' : 'bg-mole-safe/20 text-mole-safe'
                          }`}>{item.isFromInternet ? tx('İnternet kaynağı', 'Internet source') : tx('Yerel', 'Local')}</span>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        {item.riskScore > 0 && <p className="text-sm font-bold text-mole-warning">{item.riskScore}</p>}
                        {item.sizeBytes && <p className="text-xs text-mole-text-muted">{(item.sizeBytes / 1e6).toFixed(1)} MB</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-mole-safe/10 border border-mole-safe/30 rounded-lg p-3 text-center">
                <p className="text-sm text-mole-safe font-medium">{tx('Bu kategoride şüpheli bir şey bulunamadı.', 'Nothing suspicious found in this category.')}</p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
