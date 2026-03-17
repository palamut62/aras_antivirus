import { useState } from 'react'
import { Zap, Check, Loader2, StopCircle, Info } from 'lucide-react'
import { useLang } from '../contexts/LangContext'

interface OptItem {
  id: string
  name: string
  nameEn: string
  description: string
  descriptionEn: string
  category: string
  currentValue: string
  risk: string
  sizeBytes?: number
  selected: boolean
}

interface OptResult {
  id: string
  success: boolean
  message: string
  sizeFreed?: number
}

export default function SystemOptimize() {
  const { tx, lang } = useLang()
  const [items, setItems] = useState<OptItem[]>([])
  const [loading, setLoading] = useState(false)
  const [optimizing, setOptimizing] = useState(false)
  const [results, setResults] = useState<OptResult[]>([])

  const formatSize = (bytes: number) => {
    if (!bytes || bytes <= 0) return '—'
    if (bytes >= 1e9) return (bytes / 1e9).toFixed(2) + ' GB'
    if (bytes >= 1e6) return (bytes / 1e6).toFixed(1) + ' MB'
    return (bytes / 1e3).toFixed(0) + ' KB'
  }

  const loadStatus = async () => {
    setLoading(true)
    setResults([])
    try {
      const result = await window.moleAPI.systemOptimize('status')
      if (result.success && result.data?.items) {
        setItems(result.data.items.map((it: any) => ({ ...it, selected: it.risk === 'safe' })))
      }
    } catch { /* */ }
    setLoading(false)
  }

  const toggleItem = (id: string) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, selected: !it.selected } : it))
  }

  const handleOptimize = async () => {
    const selected = items.filter(it => it.selected).map(it => it.id)
    if (selected.length === 0) return
    setOptimizing(true)
    setResults([])
    try {
      const result = await window.moleAPI.systemOptimize('optimize', selected)
      if (result.success && result.data?.results) {
        setResults(result.data.results)
      }
    } catch { /* */ }
    setOptimizing(false)
  }

  const riskColor = (risk: string) => {
    switch (risk) {
      case 'safe': return 'bg-mole-safe/20 text-mole-safe'
      case 'moderate': return 'bg-mole-warning/20 text-mole-warning'
      case 'info': return 'bg-blue-500/20 text-blue-400'
      default: return 'bg-mole-text-muted/20 text-mole-text-muted'
    }
  }

  const categoryIcon = (cat: string) => {
    switch (cat) {
      case 'network': return '🌐'
      case 'disk': return '💾'
      case 'system': return '⚙️'
      case 'performance': return '⚡'
      default: return '📋'
    }
  }

  const selectedCount = items.filter(it => it.selected).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Zap size={24} className="text-mole-accent" /> {tx('Sistem Optimizasyonu', 'System Optimization')}
        </h1>
        <p className="text-mole-text-muted mt-1">{tx('DNS, disk, ag ve sistem dosyalarini optimize et', 'Optimize DNS, disk, network and system files')}</p>
      </div>

      <div className="flex gap-2">
        <button onClick={loadStatus} disabled={loading || optimizing}
          className="px-6 py-2.5 bg-mole-accent hover:bg-mole-accent-hover disabled:opacity-50 rounded-lg font-medium transition-colors">
          {loading ? tx('Analiz ediliyor...', 'Analyzing...') : tx('Sistemi Analiz Et', 'Analyze System')}
        </button>
        {optimizing && (
          <button className="flex items-center gap-2 px-4 py-2.5 bg-mole-danger hover:bg-mole-danger/80 rounded-lg font-medium transition-colors">
            <StopCircle size={16} /> {tx('Durdur', 'Stop')}
          </button>
        )}
      </div>

      {items.length > 0 && (
        <>
          <div className="space-y-2">
            {items.map(item => (
              <label key={item.id}
                className="flex items-center gap-4 p-4 bg-mole-surface rounded-lg border border-mole-border cursor-pointer hover:bg-mole-bg/50 transition-colors">
                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors shrink-0 ${
                  item.selected ? 'bg-mole-accent border-mole-accent' : 'border-mole-border'
                }`} onClick={() => toggleItem(item.id)}>
                  {item.selected && <Check size={14} />}
                </div>
                <span className="text-lg shrink-0">{categoryIcon(item.category)}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{lang === 'tr' ? item.name : item.nameEn}</p>
                  <p className="text-xs text-mole-text-muted">{lang === 'tr' ? item.description : item.descriptionEn}</p>
                  {item.currentValue && (
                    <p className="text-xs text-mole-accent mt-0.5">{item.currentValue}</p>
                  )}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${riskColor(item.risk)}`}>
                  {item.risk}
                </span>
              </label>
            ))}
          </div>

          <div className="flex items-center justify-between bg-mole-surface rounded-lg p-4 border border-mole-border">
            <p>{tx('Secili', 'Selected')}: <span className="font-bold text-mole-accent">{selectedCount} {tx('islem', 'tasks')}</span></p>
            <button onClick={handleOptimize} disabled={optimizing || selectedCount === 0}
              className="px-6 py-2 bg-mole-accent hover:bg-mole-accent-hover disabled:opacity-50 rounded-lg font-medium transition-colors flex items-center gap-2">
              {optimizing ? <><Loader2 size={16} className="animate-spin" /> {tx('Calisiyor...', 'Running...')}</> : <><Zap size={16} /> {tx('Optimize Et', 'Optimize')}</>}
            </button>
          </div>
        </>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-medium text-sm flex items-center gap-2">
            <Info size={16} className="text-mole-accent" /> {tx('Sonuclar', 'Results')}
          </h3>
          {results.map(r => (
            <div key={r.id}
              className={`p-3 rounded-lg border text-sm ${
                r.success ? 'bg-mole-safe/10 border-mole-safe/30' : 'bg-mole-danger/10 border-mole-danger/30'
              }`}>
              <div className="flex items-center justify-between">
                <span>{r.message}</span>
                {r.sizeFreed && r.sizeFreed > 0 && (
                  <span className="text-mole-safe font-medium">{formatSize(r.sizeFreed)}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-mole-accent" />
        </div>
      )}
    </div>
  )
}
