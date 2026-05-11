import { useState } from 'react'
import { Package, FolderOpen, Trash2, Loader2 } from 'lucide-react'
import { useLang } from '../contexts/LangContext'
import { useNotificationStore } from '../stores/notificationStore'

interface NMItem {
  path: string
  project: string
  sizeBytes: number
  ageDays: number
  lastWrite: string
  selected: boolean
}

const fmt = (b: number) => b >= 1e9 ? (b/1e9).toFixed(2)+' GB' : b >= 1e6 ? (b/1e6).toFixed(1)+' MB' : (b/1e3).toFixed(0)+' KB'

export default function NodeModulesBulk() {
  const { tx } = useLang()
  const push = useNotificationStore(s => s.push)
  const [roots, setRoots] = useState<string[]>([])
  const [minAge, setMinAge] = useState(30)
  const [items, setItems] = useState<NMItem[]>([])
  const [scanning, setScanning] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const addRoot = async () => {
    const f = await window.moleAPI.pickFolder()
    if (f && !roots.includes(f)) setRoots([...roots, f])
  }

  const scan = async () => {
    setScanning(true); setItems([])
    try {
      const r = await window.moleAPI.devNodeModules('scan', roots, minAge)
      if (r.success) {
        const arr = r.data?.items || []
        setItems(arr.map((i: any) => ({ ...i, selected: true })))
        push({ type: 'info', title: tx(`${arr.length} node_modules bulundu`, `${arr.length} node_modules found`), message: fmt(r.data?.totalSize || 0) })
      }
    } finally { setScanning(false) }
  }

  const remove = async () => {
    const sel = items.filter(i => i.selected).map(i => i.path)
    if (sel.length === 0) return
    setDeleting(true)
    try {
      const r = await window.moleAPI.devNodeModules('delete', undefined, undefined, sel)
      if (r.success) {
        push({ type: 'success', title: tx('Silindi', 'Deleted'), message: fmt(r.data?.data?.sizeFreed || 0) })
        setItems(items.filter(i => !i.selected))
      }
    } finally { setDeleting(false) }
  }

  const totalSel = items.filter(i => i.selected).reduce((s, i) => s + i.sizeBytes, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Package size={24} className="text-mole-accent" /> {tx('node_modules Toplu Temizlik', 'Bulk node_modules Cleanup')}</h1>
        <p className="text-mole-text-muted mt-1">{tx('Eski node_modules klasörlerini topluca bul ve sil', 'Find and delete old node_modules folders in bulk')}</p>
      </div>

      <div className="bg-mole-surface rounded p-4 border border-mole-border space-y-3">
        <div className="flex items-center gap-3">
          <label className="text-sm">{tx('Min yaş (gün)', 'Min age (days)')}</label>
          <input type="number" value={minAge} onChange={e => setMinAge(parseInt(e.target.value) || 0)} className="bg-mole-bg border border-mole-border rounded px-2 py-1 w-20 text-sm" />
          <button onClick={addRoot} className="flex items-center gap-1 px-3 py-1.5 bg-mole-accent rounded text-sm"><FolderOpen size={14} /> {tx('Kök ekle', 'Add root')}</button>
        </div>
        <p className="text-xs text-mole-text-muted">{roots.length === 0 ? tx('Boş bırakılırsa: ~/Projects, ~/dev, ~/code, ~/source/repos taranır', 'Empty = scans ~/Projects, ~/dev, ~/code, ~/source/repos') : roots.join(' · ')}</p>
        <button onClick={scan} disabled={scanning} className="flex items-center gap-2 px-4 py-2 bg-mole-accent rounded text-sm disabled:opacity-50">
          {scanning ? <Loader2 size={14} className="animate-spin" /> : null} {tx('Tara', 'Scan')}
        </button>
      </div>

      {items.length > 0 && (
        <>
          <div className="max-h-96 overflow-y-auto space-y-1">
            {items.map((i, idx) => (
              <label key={i.path} className={`flex items-center gap-3 p-2 rounded border ${i.selected ? 'bg-mole-accent/5 border-mole-accent/30' : 'bg-mole-surface border-mole-border'}`}>
                <input type="checkbox" checked={i.selected} onChange={() => setItems(items.map((x, j) => j === idx ? { ...x, selected: !x.selected } : x))} className="accent-mole-accent" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{i.project}</p>
                  <p className="text-xs text-mole-text-muted">{i.ageDays}d · {i.lastWrite}</p>
                </div>
                <span className="text-sm font-semibold">{fmt(i.sizeBytes)}</span>
              </label>
            ))}
          </div>
          <div className="flex items-center justify-between bg-mole-surface p-4 rounded border border-mole-border">
            <p><span className="text-mole-accent font-bold">{fmt(totalSel)}</span> · {items.filter(i => i.selected).length} / {items.length}</p>
            <button onClick={remove} disabled={deleting || totalSel === 0} className="flex items-center gap-2 px-4 py-2 bg-mole-danger rounded text-sm disabled:opacity-50">
              {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} {tx('Sil', 'Delete')}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
