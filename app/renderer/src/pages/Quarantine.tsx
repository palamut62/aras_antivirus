import { useState, useEffect } from 'react'
import { FolderLock, RefreshCw, RotateCcw, Trash2, Loader2 } from 'lucide-react'
import { useLang } from '../contexts/LangContext'

interface QuarantineItem {
  id: string
  originalPath: string
  fileName: string
  sha256: string
  detectedAt: string
  riskScore: number
  reasons: string[]
  status: string
}

export default function Quarantine() {
  const { tx } = useLang()
  const [items, setItems] = useState<QuarantineItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchItems = async () => {
    setLoading(true)
    try {
      const r = await window.moleAPI.quarantineAction('list')
      if (r.success) {
        const data = Array.isArray(r.data) ? r.data : r.data ? [r.data] : []
        setItems(data)
      }
    } catch {}
    setLoading(false)
  }

  useEffect(() => { fetchItems() }, [])

  const handleRestore = async (item: QuarantineItem) => {
    await window.moleAPI.quarantineAction('restore', undefined, item.id)
    fetchItems()
  }

  const handleDelete = async (item: QuarantineItem) => {
    await window.moleAPI.quarantineAction('delete', undefined, item.id)
    fetchItems()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FolderLock size={24} className="text-mole-accent" /> {tx('Karantina', 'Quarantine')}
          </h1>
          <p className="text-mole-text-muted mt-1">{tx('Izole edilen süpheli dosyalar', 'Isolated suspicious files')}</p>
        </div>
        <button onClick={fetchItems} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-mole-surface border border-mole-border rounded-lg text-sm hover:bg-mole-bg transition-colors">
          <RefreshCw size={14} /> {tx('Yenile', 'Refresh')}
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12"><Loader2 size={32} className="animate-spin text-mole-accent mx-auto" /></div>
      ) : items.length === 0 ? (
        <div className="bg-mole-surface rounded-xl p-8 border border-mole-border text-center">
          <FolderLock size={48} className="text-mole-text-muted mx-auto mb-4" />
          <p className="text-mole-text-muted">{tx('Karantinada dosya yok', 'No files in quarantine')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="bg-mole-surface rounded-lg p-4 border border-mole-border">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0 mr-4">
                  <p className="font-medium text-sm">{item.fileName}</p>
                  <p className="text-xs text-mole-text-muted mt-1 truncate">{item.originalPath}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-mole-text-muted">
                    <span>Risk: <span className="text-mole-warning font-medium">{item.riskScore}</span></span>
                    <span>{new Date(item.detectedAt).toLocaleString()}</span>
                  </div>
                  {item.reasons?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {item.reasons.map((r, j) => (
                        <span key={j} className="text-[10px] px-2 py-0.5 bg-mole-bg rounded-full text-mole-text-muted">{r}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => handleRestore(item)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-mole-accent/10 border border-mole-accent/30 text-mole-accent rounded text-xs hover:bg-mole-accent/20 transition-colors">
                    <RotateCcw size={12} /> {tx('Geri Yükle', 'Restore')}
                  </button>
                  <button onClick={() => handleDelete(item)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-mole-danger/10 border border-mole-danger/30 text-mole-danger rounded text-xs hover:bg-mole-danger/20 transition-colors">
                    <Trash2 size={12} /> {tx('Kalıcı Sil', 'Delete Permanently')}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
