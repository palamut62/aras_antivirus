import { useState, useEffect } from 'react'
import { Server, RefreshCw, X, Zap, Loader2 } from 'lucide-react'
import { useLang } from '../contexts/LangContext'
import { useNotificationStore } from '../stores/notificationStore'

interface DevServer {
  pid: number
  name: string
  kind: string
  ports: number[]
  memoryMB: number
  commandLine: string
  cwd: string
}

interface PortHolder {
  port: number
  pid: number
  processName: string
  commandLine: string
  address: string
}

export default function DevServers() {
  const { tx } = useLang()
  const push = useNotificationStore(s => s.push)
  const [servers, setServers] = useState<DevServer[]>([])
  const [portHolders, setPortHolders] = useState<PortHolder[]>([])
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<'servers' | 'ports'>('servers')

  const load = async () => {
    setLoading(true)
    try {
      if (tab === 'servers') {
        const r = await window.moleAPI.devServers('list')
        if (r.success) setServers(r.data?.servers || [])
      } else {
        const r = await window.moleAPI.devServers('scan-ports')
        if (r.success) setPortHolders(r.data?.ports || [])
      }
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [tab])

  const kill = async (pid: number) => {
    const r = await window.moleAPI.devServers('kill', pid)
    if (r.success) {
      push({ type: 'success', title: tx('Process kapatıldı', 'Process killed'), message: `PID ${pid}` })
      load()
    } else {
      push({ type: 'error', title: tx('Kapatma başarısız', 'Kill failed'), message: r.error })
    }
  }

  const killAll = async () => {
    const r = await window.moleAPI.devServers('kill-all')
    if (r.success) {
      push({ type: 'success', title: tx('Tüm dev sunucular kapatıldı', 'All dev servers killed'), message: `${r.data?.killed?.length || 0} process` })
      load()
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Server size={24} className="text-mole-accent" /> {tx('Dev Sunucu Yöneticisi', 'Dev Server Manager')}</h1>
        <p className="text-mole-text-muted mt-1">{tx('Çalışan dev sunucularını tespit et ve kapat', 'Detect and kill running dev servers')}</p>
      </div>

      <div className="flex gap-2 border-b border-mole-border">
        <button onClick={() => setTab('servers')} className={`px-4 py-2 text-sm font-medium ${tab === 'servers' ? 'text-mole-accent border-b-2 border-mole-accent' : 'text-mole-text-muted'}`}>
          {tx('Dev Sunucular', 'Dev Servers')}
        </button>
        <button onClick={() => setTab('ports')} className={`px-4 py-2 text-sm font-medium ${tab === 'ports' ? 'text-mole-accent border-b-2 border-mole-accent' : 'text-mole-text-muted'}`}>
          {tx('Port Taraması', 'Port Scan')}
        </button>
      </div>

      <div className="flex gap-2">
        <button onClick={load} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-mole-accent rounded text-sm hover:bg-mole-accent-hover disabled:opacity-50">
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} {tx('Yenile', 'Refresh')}
        </button>
        {tab === 'servers' && servers.length > 0 && (
          <button onClick={killAll} className="flex items-center gap-2 px-4 py-2 bg-mole-danger rounded text-sm hover:bg-mole-danger/80">
            <Zap size={14} /> {tx('Tümünü Kapat', 'Kill All')}
          </button>
        )}
      </div>

      {tab === 'servers' && (
        <div className="space-y-2">
          {servers.length === 0 && !loading && <p className="text-mole-text-muted text-sm">{tx('Çalışan dev sunucu yok', 'No running dev servers')}</p>}
          {servers.map(s => (
            <div key={s.pid} className="bg-mole-surface border border-mole-border rounded p-3 flex items-center gap-3">
              <span className="px-2 py-0.5 bg-mole-accent/20 text-mole-accent rounded text-xs font-mono">{s.kind}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{s.name} <span className="text-mole-text-muted">PID {s.pid}</span></p>
                <p className="text-xs text-mole-text-muted truncate">{s.commandLine}</p>
                <p className="text-xs text-mole-text-muted">{s.ports.length > 0 ? `Ports: ${s.ports.join(', ')}` : tx('Port dinlemiyor', 'No listening port')} · {s.memoryMB} MB</p>
              </div>
              <button onClick={() => kill(s.pid)} className="p-2 text-mole-danger hover:bg-mole-danger/10 rounded"><X size={16} /></button>
            </div>
          ))}
        </div>
      )}

      {tab === 'ports' && (
        <div className="space-y-2">
          {portHolders.length === 0 && !loading && <p className="text-mole-text-muted text-sm">{tx('Bilinen dev portlarında dinleyen yok', 'No process listening on known dev ports')}</p>}
          {portHolders.map(p => (
            <div key={p.port} className="bg-mole-surface border border-mole-border rounded p-3 flex items-center gap-3">
              <span className="px-2 py-1 bg-mole-accent/20 text-mole-accent rounded text-sm font-mono">:{p.port}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{p.processName} <span className="text-mole-text-muted">PID {p.pid}</span></p>
                <p className="text-xs text-mole-text-muted truncate">{p.commandLine}</p>
              </div>
              <button onClick={() => kill(p.pid)} className="p-2 text-mole-danger hover:bg-mole-danger/10 rounded"><X size={16} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
