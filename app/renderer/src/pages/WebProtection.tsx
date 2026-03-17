import { useState } from 'react'
import { Globe, Download, Chrome, FileWarning, Loader2, AlertTriangle, CheckCircle2, Shield } from 'lucide-react'
import { useLang } from '../contexts/LangContext'

type ScanTab = 'downloads' | 'browser' | 'extensions' | 'temp'

export default function WebProtection() {
  const { tx } = useLang()
  const [activeTab, setActiveTab] = useState<ScanTab>('downloads')
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<any>(null)

  const tabs = [
    { id: 'downloads' as ScanTab, label: tx('İndirilenler', 'Downloads'), icon: Download, desc: tx('Son 24 saat indirilen dosyalar', 'Files downloaded in last 24 hours') },
    { id: 'browser' as ScanTab, label: tx('Tarayıcı Geçmisi', 'Browser History'), icon: Chrome, desc: tx('Süpheli site ziyaretleri', 'Suspicious site visits') },
    { id: 'extensions' as ScanTab, label: tx('Eklentiler', 'Extensions'), icon: Globe, desc: tx('Tarayıcı eklenti kontrolü', 'Browser extension check') },
    { id: 'temp' as ScanTab, label: tx('Temp Çalıstırılabilir', 'Temp Executables'), icon: FileWarning, desc: tx('Geçici klasördeki tehditler', 'Threats in temp folder') },
  ]

  const actionMap: Record<ScanTab, string> = {
    downloads: 'scan-downloads',
    browser: 'scan-browser-history',
    extensions: 'check-extensions',
    temp: 'scan-temp-executables',
  }

  const handleScan = async () => {
    setScanning(true)
    setResult(null)
    try {
      const r = await window.moleAPI.webProtection(actionMap[activeTab])
      if (r.success) setResult(r.data)
    } catch {}
    setScanning(false)
  }

  const severityIcon = (score: number) => {
    if (score >= 50) return <AlertTriangle size={14} className="text-red-400" />
    if (score >= 25) return <Shield size={14} className="text-yellow-400" />
    return <CheckCircle2 size={14} className="text-mole-safe" />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Globe size={24} className="text-mole-accent" /> {tx('Web Koruma', 'Web Protection')}
        </h1>
        <p className="text-mole-text-muted mt-1">{tx('Web indirmeleri, tarayıcı güvenliği ve çalıstırılabilir dosya kontrolü', 'Web downloads, browser security and executable file checks')}</p>
      </div>

      {/* Tab selection */}
      <div className="grid grid-cols-4 gap-3">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => { setActiveTab(tab.id); setResult(null) }}
            className={`p-4 rounded-lg border text-left transition-colors ${
              activeTab === tab.id ? 'border-mole-accent bg-mole-accent/10' : 'border-mole-border bg-mole-surface hover:bg-mole-bg/50'
            }`}>
            <tab.icon size={20} className={activeTab === tab.id ? 'text-mole-accent' : 'text-mole-text-muted'} />
            <p className="font-medium text-sm mt-2">{tab.label}</p>
            <p className="text-[11px] text-mole-text-muted mt-1">{tab.desc}</p>
          </button>
        ))}
      </div>

      <button onClick={handleScan} disabled={scanning}
        className="flex items-center gap-2 px-6 py-2.5 bg-mole-accent hover:bg-mole-accent-hover disabled:opacity-50 rounded-lg font-medium transition-colors">
        {scanning ? <><Loader2 size={16} className="animate-spin" /> {tx('Taranıyor...', 'Scanning...')}</> : <><Shield size={16} /> {tx('Tara', 'Scan')}</>}
      </button>

      {/* Results */}
      {result && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-mole-surface rounded-lg p-4 border border-mole-border">
              <p className="text-xs text-mole-text-muted">{tx('Toplam Bulunan', 'Total Found')}</p>
              <p className="text-xl font-bold mt-1">{result.totalFound || 0}</p>
            </div>
            <div className="bg-mole-surface rounded-lg p-4 border border-mole-border">
              <p className="text-xs text-mole-text-muted">{tx('Isaretlenen', 'Flagged')}</p>
              <p className="text-xl font-bold text-mole-warning mt-1">{result.flaggedCount || 0}</p>
            </div>
            <div className="bg-mole-surface rounded-lg p-4 border border-mole-border">
              <p className="text-xs text-mole-text-muted">{tx('Tarama Süresi', 'Scan Duration')}</p>
              <p className="text-xl font-bold mt-1">{result.scanTime || '--'}</p>
            </div>
          </div>

          {result.results?.length > 0 ? (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {result.results.map((item: any, i: number) => (
                <div key={i} className="bg-mole-surface rounded-lg p-4 border border-mole-border">
                  <div className="flex items-start gap-3">
                    {severityIcon(item.riskScore || 0)}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{item.fileName || item.domain || item.name || item.description || tx('Bilinmeyen', 'Unknown')}</p>
                      <p className="text-xs text-mole-text-muted mt-1 truncate">{item.path || item.url || item.id || ''}</p>
                      {item.reason && <p className="text-xs text-mole-warning mt-1">{item.reason}</p>}
                      {item.reasons?.map((r: string, j: number) => (
                        <p key={j} className="text-xs text-mole-warning mt-0.5">{r}</p>
                      ))}
                      {item.signer && <p className="text-xs text-mole-text-muted mt-1">{tx('Imza', 'Signature')}: {item.signer}</p>}
                      {item.isFromInternet !== undefined && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full mt-1 inline-block ${
                          item.isFromInternet ? 'bg-mole-warning/20 text-mole-warning' : 'bg-mole-safe/20 text-mole-safe'
                        }`}>{item.isFromInternet ? tx('Internet kaynağı', 'Internet source') : tx('Yerel', 'Local')}</span>
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
            <div className="bg-mole-safe/10 border border-mole-safe/30 rounded-xl p-6 text-center">
              <CheckCircle2 size={40} className="text-mole-safe mx-auto mb-3" />
              <p className="font-semibold text-mole-safe">{tx('Temiz!', 'Clean!')}</p>
              <p className="text-sm text-mole-text-muted mt-1">{tx('Bu kategoride süpheli bir sey bulunamadı.', 'Nothing suspicious found in this category.')}</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
