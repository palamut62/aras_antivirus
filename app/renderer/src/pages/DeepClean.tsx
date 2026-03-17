import { Sparkles, Check, StopCircle } from 'lucide-react'
import { useLang } from '../contexts/LangContext'
import { useScanStore } from '../stores/scanStore'

interface Category {
  id: string
  label: string
  fileCount: number
  sizeBytes: number
  riskLevel: string
  selected: boolean
}

export default function DeepClean() {
  const { tx } = useLang()
  const { scanning, cleaning, categories, cleanResult, taskId } = useScanStore(s => s.deepClean)
  const set = useScanStore(s => s.setDeepClean)

  const formatSize = (bytes: number) => {
    if (bytes >= 1e9) return (bytes / 1e9).toFixed(2) + ' GB'
    if (bytes >= 1e6) return (bytes / 1e6).toFixed(1) + ' MB'
    return (bytes / 1e3).toFixed(0) + ' KB'
  }

  const handleScan = async () => {
    set({ scanning: true, cleanResult: null, taskId: 'scan' })
    try {
      const result = await window.moleAPI.scanRun()
      if (result.success && result.data?.categories) {
        set({
          scanning: false,
          taskId: null,
          categories: result.data.categories.map((c: any) => ({ ...c, selected: c.riskLevel === 'safe' })),
        })
      } else {
        set({ scanning: false, taskId: null })
      }
    } catch {
      set({ scanning: false, taskId: null })
    }
  }

  const handleStop = async () => {
    if (taskId) await window.moleAPI.taskCancel(taskId)
    set({ scanning: false, cleaning: false, taskId: null })
  }

  const toggleCategory = (id: string) => {
    set({ categories: categories.map((c: Category) => c.id === id ? { ...c, selected: !c.selected } : c) })
  }

  const handleClean = async () => {
    const selected = categories.filter((c: Category) => c.selected).map((c: Category) => c.id)
    if (selected.length === 0) return
    set({ cleaning: true, taskId: 'clean' })
    try {
      const result = await window.moleAPI.cleanExecute(selected)
      set({ cleaning: false, cleanResult: result, taskId: null })
    } catch {
      set({ cleaning: false, taskId: null })
    }
  }

  const totalSelected = categories.filter((c: Category) => c.selected).reduce((s: number, c: Category) => s + c.sizeBytes, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles size={24} className="text-mole-accent" /> {tx('Derin Temizlik', 'Deep Clean')}
        </h1>
        <p className="text-mole-text-muted mt-1">{tx('Geri kazanılabilir sistem dosyalarını tara ve temizle', 'Scan and clean reclaimable system files')}</p>
      </div>

      <div className="flex gap-2">
        <button onClick={handleScan} disabled={scanning || cleaning}
          className="px-6 py-2.5 bg-mole-accent hover:bg-mole-accent-hover disabled:opacity-50 rounded-lg font-medium transition-colors">
          {scanning ? tx('Taranıyor...', 'Scanning...') : tx('Sistemi Tara', 'Scan System')}
        </button>
        {(scanning || cleaning) && (
          <button onClick={handleStop}
            className="flex items-center gap-2 px-4 py-2.5 bg-mole-danger hover:bg-mole-danger/80 rounded-lg font-medium transition-colors">
            <StopCircle size={16} /> {tx('Durdur', 'Stop')}
          </button>
        )}
      </div>

      {categories.length > 0 && (
        <>
          <div className="space-y-2">
            {categories.map((cat: Category) => (
              <label key={cat.id}
                className="flex items-center gap-4 p-4 bg-mole-surface rounded-lg border border-mole-border cursor-pointer hover:bg-mole-bg/50 transition-colors">
                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                  cat.selected ? 'bg-mole-accent border-mole-accent' : 'border-mole-border'
                }`} onClick={() => toggleCategory(cat.id)}>
                  {cat.selected && <Check size={14} />}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{cat.label}</p>
                  <p className="text-xs text-mole-text-muted">{cat.fileCount} {tx('dosya', 'files')}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatSize(cat.sizeBytes)}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    cat.riskLevel === 'safe' ? 'bg-mole-safe/20 text-mole-safe' :
                    cat.riskLevel === 'review' ? 'bg-mole-warning/20 text-mole-warning' :
                    'bg-mole-danger/20 text-mole-danger'
                  }`}>{cat.riskLevel}</span>
                </div>
              </label>
            ))}
          </div>

          <div className="flex items-center justify-between bg-mole-surface rounded-lg p-4 border border-mole-border">
            <p>{tx('Seçili', 'Selected')}: <span className="font-bold text-mole-accent">{formatSize(totalSelected)}</span></p>
            <button onClick={handleClean} disabled={cleaning || totalSelected === 0}
              className="px-6 py-2 bg-mole-danger hover:bg-mole-danger/80 disabled:opacity-50 rounded-lg font-medium transition-colors">
              {cleaning ? tx('Temizleniyor...', 'Cleaning...') : tx('Seçilenleri Temizle', 'Clean Selected')}
            </button>
          </div>
        </>
      )}

      {cleanResult && (
        <div className={`p-4 rounded-lg border ${cleanResult.success ? 'bg-mole-safe/10 border-mole-safe/30' : 'bg-mole-danger/10 border-mole-danger/30'}`}>
          <p className="font-medium">{cleanResult.success ? tx('Temizlik tamamlandı!', 'Cleanup completed!') : tx('Temizlik başarısız', 'Cleanup failed')}</p>
          {cleanResult.data?.sizeFreed && <p className="text-sm text-mole-text-muted mt-1">{tx('Kazanılan', 'Freed')}: {formatSize(cleanResult.data.sizeFreed)}</p>}
        </div>
      )}
    </div>
  )
}
