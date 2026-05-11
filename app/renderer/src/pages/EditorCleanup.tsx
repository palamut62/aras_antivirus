import { useState, useEffect } from 'react'
import { Wind, RefreshCw, X, Zap, Loader2 } from 'lucide-react'
import { useLang } from '../contexts/LangContext'
import { useNotificationStore } from '../stores/notificationStore'

export default function EditorCleanup() {
  const { tx } = useLang()
  const push = useNotificationStore(s => s.push)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const r = await window.moleAPI.devEditorCleanup('list')
      if (r.success) setData(r.data)
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const killOne = async (pid: number) => {
    const r = await window.moleAPI.devEditorCleanup('kill', [pid])
    if (r.success) { push({ type: 'success', title: `PID ${pid} ${tx('kapatıldı', 'killed')}` }); load() }
  }

  const killAll = async () => {
    const r = await window.moleAPI.devEditorCleanup('kill-all-orphans')
    if (r.success) { push({ type: 'success', title: tx('Tüm orphan editörler kapatıldı', 'All orphans killed'), message: `${r.data?.killed?.length || 0}` }); load() }
  }

  const orphans = data?.orphans || []
  const alive = data?.alive || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Wind size={24} className="text-mole-accent" /> {tx('Editör Orphan Temizliği', 'Editor Orphan Cleanup')}</h1>
        <p className="text-mole-text-muted mt-1">{tx('VSCode / Cursor / Windsurf kalıntı process\'lerini bul ve kapat', 'Find and kill VSCode / Cursor / Windsurf lingering processes')}</p>
      </div>

      <div className="flex gap-2">
        <button onClick={load} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-mole-accent rounded text-sm disabled:opacity-50">
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} {tx('Yenile', 'Refresh')}
        </button>
        {orphans.length > 0 && (
          <button onClick={killAll} className="flex items-center gap-2 px-4 py-2 bg-mole-danger rounded text-sm">
            <Zap size={14} /> {tx('Tüm Orphanları Kapat', 'Kill All Orphans')} ({orphans.length})
          </button>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <h2 className="font-semibold mb-2 text-mole-danger">{tx('Orphan Process\'ler', 'Orphan Processes')} ({orphans.length}) · {data?.orphanMemoryMB?.toFixed(0) || 0} MB</h2>
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {orphans.length === 0 && <p className="text-mole-text-muted text-sm">{tx('Orphan yok', 'No orphans')}</p>}
            {orphans.map((o: any) => (
              <div key={o.pid} className="bg-mole-surface border border-mole-danger/30 rounded p-2 flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{o.name} <span className="text-mole-text-muted">PID {o.pid}</span></p>
                  <p className="text-xs text-mole-text-muted">{o.memoryMB} MB</p>
                </div>
                <button onClick={() => killOne(o.pid)} className="p-1.5 text-mole-danger hover:bg-mole-danger/10 rounded"><X size={14} /></button>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h2 className="font-semibold mb-2 text-mole-safe">{tx('Aktif Oturumlar', 'Active Sessions')} ({alive.length})</h2>
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {alive.map((o: any) => (
              <div key={o.pid} className="bg-mole-surface border border-mole-border rounded p-2">
                <p className="text-sm">{o.name} <span className="text-mole-text-muted">PID {o.pid}</span></p>
                <p className="text-xs text-mole-text-muted">{o.memoryMB} MB</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
