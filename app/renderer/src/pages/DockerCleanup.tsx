import { useState, useEffect } from 'react'
import { Container, RefreshCw, Trash2, Loader2, AlertCircle } from 'lucide-react'
import { useLang } from '../contexts/LangContext'
import { useNotificationStore } from '../stores/notificationStore'

export default function DockerCleanup() {
  const { tx } = useLang()
  const push = useNotificationStore(s => s.push)
  const [status, setStatus] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [output, setOutput] = useState<string>('')

  const load = async () => {
    setLoading(true)
    try {
      const r = await window.moleAPI.devDocker('status')
      setStatus(r)
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const run = async (action: string, label: string) => {
    setBusy(action); setOutput('')
    try {
      const r = await window.moleAPI.devDocker(action)
      setOutput(r.data?.output || r.error || '')
      if (r.success) push({ type: 'success', title: tx(`${label} tamamlandı`, `${label} completed`) })
      else push({ type: 'error', title: tx('Hata', 'Error'), message: r.error })
      load()
    } finally { setBusy(null) }
  }

  if (loading && !status) return <div className="flex items-center gap-2 text-mole-text-muted"><Loader2 size={16} className="animate-spin" /> Loading...</div>
  if (status && !status.success) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Container size={24} className="text-mole-accent" /> Docker Cleanup</h1>
        <div className="bg-mole-danger/10 border border-mole-danger/30 rounded p-4 flex items-center gap-2">
          <AlertCircle size={18} className="text-mole-danger" /> <span>{status.error}</span>
        </div>
      </div>
    )
  }

  const data = status?.data || {}
  const actions = [
    { id: 'prune-containers', label: tx('Containerları Temizle', 'Prune Containers'), desc: tx('Durmuş containerları sil', 'Remove stopped containers') },
    { id: 'prune-images', label: tx('Imageları Temizle', 'Prune Images'), desc: tx('Kullanılmayan imageları sil', 'Remove unused images') },
    { id: 'prune-volumes', label: tx('Volumeları Temizle', 'Prune Volumes'), desc: tx('Bağlı olmayan volumeları sil', 'Remove dangling volumes') },
    { id: 'prune-networks', label: tx('Networkleri Temizle', 'Prune Networks'), desc: tx('Kullanılmayan networkleri sil', 'Remove unused networks') },
    { id: 'prune-build-cache', label: tx('Build Cache Temizle', 'Prune Build Cache'), desc: tx('Tüm build cache silinir', 'Remove all build cache') },
    { id: 'prune-all', label: tx('Hepsini Temizle', 'Prune Everything'), desc: tx('Container + image + volume + network', 'Container + image + volume + network'), danger: true },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Container size={24} className="text-mole-accent" /> Docker Cleanup</h1>
        <p className="text-mole-text-muted mt-1">Docker v{data.version}</p>
      </div>

      {data.df && data.df.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {data.df.map((d: any, i: number) => (
            <div key={i} className="bg-mole-surface border border-mole-border rounded p-3">
              <p className="text-xs text-mole-text-muted">{d.type}</p>
              <p className="text-lg font-bold">{d.size}</p>
              <p className="text-xs text-mole-accent">{tx('Reclaim', 'Reclaim')}: {d.reclaimable}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-3">
        {actions.map(a => (
          <button key={a.id} onClick={() => run(a.id, a.label)} disabled={!!busy}
            className={`text-left p-4 rounded border transition-colors ${a.danger ? 'border-mole-danger/30 hover:bg-mole-danger/10' : 'border-mole-border hover:bg-mole-bg'} bg-mole-surface disabled:opacity-50`}>
            <div className="flex items-center gap-2 mb-1">
              {busy === a.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} className={a.danger ? 'text-mole-danger' : ''} />}
              <span className="font-medium text-sm">{a.label}</span>
            </div>
            <p className="text-xs text-mole-text-muted">{a.desc}</p>
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <button onClick={load} className="flex items-center gap-1 text-xs text-mole-text-muted hover:text-mole-text"><RefreshCw size={12} /> {tx('Yenile', 'Refresh')}</button>
      </div>

      {output && (
        <pre className="bg-mole-bg p-3 rounded text-xs font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">{output}</pre>
      )}

      <div className="grid md:grid-cols-3 gap-3 text-xs">
        <div className="bg-mole-surface border border-mole-border rounded p-3">
          <p className="font-bold mb-1">Containers ({data.containers?.length || 0})</p>
          {(data.containers || []).slice(0, 5).map((c: any) => <p key={c.id} className="truncate text-mole-text-muted">{c.name} · {c.status}</p>)}
        </div>
        <div className="bg-mole-surface border border-mole-border rounded p-3">
          <p className="font-bold mb-1">Images ({data.images?.length || 0})</p>
          {(data.images || []).slice(0, 5).map((c: any) => <p key={c.id} className="truncate text-mole-text-muted">{c.repo} · {c.size}</p>)}
        </div>
        <div className="bg-mole-surface border border-mole-border rounded p-3">
          <p className="font-bold mb-1">Volumes ({data.volumes?.length || 0})</p>
          {(data.volumes || []).slice(0, 5).map((c: any) => <p key={c.name} className="truncate text-mole-text-muted">{c.name}</p>)}
        </div>
      </div>
    </div>
  )
}
