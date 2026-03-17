import { useState, useEffect } from 'react'
import { Activity, Cpu, MemoryStick, HardDrive } from 'lucide-react'
import { useLang } from '../contexts/LangContext'

export default function Status() {
  const { tx } = useLang()
  const [status, setStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const fetchStatus = async () => {
    setLoading(true)
    try {
      const result = await window.moleAPI.statusGet()
      if (result.success) setStatus(result.data)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { fetchStatus() }, [])

  const formatSize = (bytes: number) => {
    if (bytes >= 1e9) return (bytes / 1e9).toFixed(1) + ' GB'
    return (bytes / 1e6).toFixed(0) + ' MB'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity size={24} className="text-mole-accent" /> {tx('Sistem Durumu', 'System Status')}
          </h1>
          <p className="text-mole-text-muted mt-1">{tx('Güncel sistem saglik durumu', 'Current system health')}</p>
        </div>
        <button onClick={fetchStatus} disabled={loading}
          className="px-4 py-2 bg-mole-surface border border-mole-border rounded-lg text-sm hover:bg-mole-bg transition-colors">
          {loading ? tx('Yükleniyor...', 'Loading...') : tx('Yenile', 'Refresh')}
        </button>
      </div>

      {status ? (
        <div className="grid grid-cols-2 gap-4">
          <StatusCard icon={Cpu} label={tx('CPU Kullanimi', 'CPU Usage')} value={`${status.cpuPercent || 0}%`}
            bar={status.cpuPercent || 0} color="mole-accent" />
          <StatusCard icon={MemoryStick} label={tx('Bellek', 'Memory')}
            value={`${formatSize(status.memUsed || 0)} / ${formatSize(status.memTotal || 0)}`}
            bar={status.memTotal ? (status.memUsed / status.memTotal) * 100 : 0} color="mole-warning" />
          {status.drives?.map((d: any) => (
            <StatusCard key={d.letter} icon={HardDrive} label={`${tx('Sürücü', 'Drive')} ${d.letter}`}
              value={`${formatSize(d.freeBytes)} ${tx('bos', 'free')} / ${formatSize(d.totalBytes)}`}
              bar={d.totalBytes ? ((d.totalBytes - d.freeBytes) / d.totalBytes) * 100 : 0} color="mole-safe" />
          ))}
        </div>
      ) : (
        <div className="bg-mole-surface rounded-xl p-8 border border-mole-border text-center">
          <p className="text-mole-text-muted">{loading ? tx('Durum yükleniyor...', 'Loading status...') : tx('Durum alinamadi', 'Could not retrieve status')}</p>
        </div>
      )}
    </div>
  )
}

function StatusCard({ icon: Icon, label, value, bar, color }: {
  icon: any; label: string; value: string; bar: number; color: string
}) {
  return (
    <div className="bg-mole-surface rounded-xl p-5 border border-mole-border">
      <div className="flex items-center gap-2 mb-3">
        <Icon size={18} className={`text-${color}`} />
        <span className="text-sm text-mole-text-muted">{label}</span>
      </div>
      <p className="text-lg font-bold mb-3">{value}</p>
      <div className="h-2 bg-mole-bg rounded-full overflow-hidden">
        <div className={`h-full bg-${color} rounded-full transition-all`} style={{ width: `${Math.min(bar, 100)}%` }} />
      </div>
    </div>
  )
}
