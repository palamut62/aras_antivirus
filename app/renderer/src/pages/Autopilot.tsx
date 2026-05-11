import { useEffect, useRef } from 'react'
import { Bot, Play, Square, Shield, Trash2, Wifi, Usb, Loader2, Clock, Settings } from 'lucide-react'
import { useLang } from '../contexts/LangContext'
import { useAutopilotStore } from '../stores/autopilotStore'

export default function Autopilot() {
  const { tx } = useLang()
  const enabled = useAutopilotStore(s => s.enabled)
  const running = useAutopilotStore(s => s.running)
  const logs = useAutopilotStore(s => s.logs)
  const stats = useAutopilotStore(s => s.stats)
  const phase = useAutopilotStore(s => s.phase)
  const start = useAutopilotStore(s => s.start)
  const setEnabled = useAutopilotStore(s => s.setEnabled)
  const logsEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const formatSize = (bytes: number) => {
    if (!bytes || bytes <= 0) return '0 KB'
    if (bytes >= 1e9) return (bytes / 1e9).toFixed(2) + ' GB'
    if (bytes >= 1e6) return (bytes / 1e6).toFixed(1) + ' MB'
    return (bytes / 1e3).toFixed(0) + ' KB'
  }

  const enableAndStart = async () => {
    await window.moleAPI.settingsUpdate({ autopilotEnabled: true })
    await setEnabled(true)
  }

  const disableAndStop = async () => {
    await window.moleAPI.settingsUpdate({ autopilotEnabled: false })
    await setEnabled(false)
  }

  const moduleColor = (mod: string) => {
    switch (mod) {
      case 'Security': return 'text-red-400'
      case 'Quarantine': return 'text-orange-400'
      case 'Network': return 'text-blue-400'
      case 'USB': return 'text-purple-400'
      case 'Cleanup': return 'text-emerald-400'
      case 'Guard': return 'text-cyan-400'
      default: return 'text-mole-accent'
    }
  }

  const logTypeStyle = (type: 'info' | 'success' | 'warning' | 'error') => {
    switch (type) {
      case 'success': return 'text-mole-safe'
      case 'warning': return 'text-mole-warning'
      case 'error': return 'text-mole-danger'
      default: return 'text-mole-text-muted'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bot size={24} className="text-mole-accent" /> Autopilot
          </h1>
          <p className="text-mole-text-muted mt-1">{tx('Tam otomatik koruma modu', 'Fully automatic protection mode')}</p>
        </div>

        {enabled ? (
          running ? (
            <button onClick={disableAndStop}
              className="flex items-center gap-2 px-6 py-2.5 bg-mole-danger hover:bg-mole-danger/80 rounded-lg font-medium transition-colors">
              <Square size={16} /> {tx('Autopilot Kapat', 'Disable Autopilot')}
            </button>
          ) : (
            <button onClick={start}
              className="flex items-center gap-2 px-6 py-2.5 bg-mole-accent hover:bg-mole-accent-hover rounded-lg font-medium transition-colors">
              <Play size={16} /> {tx('Tekrar Baslat', 'Restart')}
            </button>
          )
        ) : (
          <button onClick={enableAndStart}
            className="flex items-center gap-2 px-6 py-2.5 bg-mole-accent hover:bg-mole-accent-hover rounded-lg font-medium transition-colors">
            <Play size={16} /> {tx('Autopilot Ac', 'Enable Autopilot')}
          </button>
        )}
      </div>

      {enabled ? (
        <div className="flex items-center gap-3 bg-mole-safe/10 border border-mole-safe/30 rounded-lg p-3">
          <Settings size={16} className="text-mole-safe" />
          <span className="text-sm">{tx('Autopilot ayari acik. Uygulama acildiginda otomatik baslar.', 'Autopilot setting is enabled and starts automatically when app opens.')}</span>
        </div>
      ) : (
        <div className="flex items-center gap-3 bg-mole-warning/10 border border-mole-warning/30 rounded-lg p-3">
          <Settings size={16} className="text-mole-warning" />
          <span className="text-sm">{tx('Autopilot kapali. Ayarlar veya wizard ile acabilirsiniz.', 'Autopilot is disabled. You can enable it from settings or onboarding wizard.')}</span>
        </div>
      )}

      {running && phase && (
        <div className="flex items-center gap-3 bg-mole-accent/10 border border-mole-accent/30 rounded-lg p-3">
          <Loader2 size={16} className="animate-spin text-mole-accent" />
          <span className="font-medium text-sm">{phase}</span>
        </div>
      )}

      <div className="grid grid-cols-4 gap-3">
        <StatCard icon={<Shield size={18} />} label={tx('Tehdit', 'Threats')} value={stats.threatsFound} color="text-red-400" sub={`${stats.threatsQuarantined} ${tx('karantina', 'quarantined')}`} />
        <StatCard icon={<Trash2 size={18} />} label={tx('Temizlik', 'Cleanup')} value={formatSize(stats.spaceFreed)} color="text-emerald-400" sub={`${stats.filesCleaned} ${tx('dosya', 'files')}`} />
        <StatCard icon={<Wifi size={18} />} label={tx('Ag', 'Network')} value={stats.connectionsChecked} color="text-blue-400" sub={`${stats.suspiciousBlocked} ${tx('engel', 'blocked')}`} />
        <StatCard icon={<Usb size={18} />} label="USB" value={stats.usbScanned} color="text-purple-400" sub={stats.lastFullScan ? `${tx('Son', 'Last')}: ${stats.lastFullScan}` : '--'} />
      </div>

      {!running && logs.length === 0 && (
        <div className="bg-mole-surface rounded-xl p-6 border border-mole-border">
          <h3 className="font-medium mb-4">{tx('Autopilot ne yapar?', 'What does Autopilot do?')}</h3>
          <div className="space-y-3 text-sm">
            <p className="text-mole-text-muted">{tx('Guvenlik taramasi, supheli ag baglantisi kontrolu, USB taramasi ve guvenli otomatik temizlik islemlerini 5 dakikada bir tekrarlar.', 'Repeats security scan, suspicious network checks, USB scanning and safe auto-cleanup every 5 minutes.')}</p>
          </div>
        </div>
      )}

      {logs.length > 0 && (
        <div className="bg-mole-surface rounded-xl border border-mole-border overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-mole-border">
            <p className="text-xs font-medium text-mole-text-muted">{tx('Canli Log', 'Live Log')} ({logs.length})</p>
            {running && <span className="w-2 h-2 rounded-full bg-mole-safe animate-pulse" />}
          </div>
          <div className="max-h-[350px] overflow-y-auto p-3 space-y-0.5 font-mono text-xs">
            {logs.map(log => (
              <div key={log.id} className={`flex gap-2 ${logTypeStyle(log.type)}`}>
                <span className="text-mole-text-muted/50 shrink-0">{log.time}</span>
                <span className={`shrink-0 w-20 text-right ${moduleColor(log.module)}`}>[{log.module}]</span>
                <span>{log.message}</span>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ icon, label, value, color, sub }: { icon: React.ReactNode; label: string; value: string | number; color: string; sub: string }) {
  return (
    <div className="bg-mole-surface rounded-lg p-4 border border-mole-border">
      <div className={`${color} mb-2`}>{icon}</div>
      <p className="text-xs text-mole-text-muted">{label}</p>
      <p className="text-lg font-bold mt-0.5">{value}</p>
      <p className="text-[10px] text-mole-text-muted mt-1">{sub}</p>
    </div>
  )
}
