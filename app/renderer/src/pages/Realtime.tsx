import { useState, useRef, useEffect } from 'react'
import { Eye, Play, Square, AlertTriangle, CheckCircle2, Shield, Loader2 } from 'lucide-react'
import { useLang } from '../contexts/LangContext'

interface GuardEvent {
  path: string
  fileName: string
  extension: string
  isFromInternet: boolean
  sha256: string
  riskScore: number
  reason: string
}

export default function Realtime() {
  const { tx } = useLang()
  const [active, setActive] = useState(false)
  const [events, setEvents] = useState<GuardEvent[]>([])
  const [stats, setStats] = useState({ totalChecked: 0, threats: 0 })
  const intervalRef = useRef<any>(null)

  const paths = window.moleAPI.getUserPaths()
  const watchPaths = [paths.downloads, paths.desktop, paths.temp]

  // Sayfa açıldığında guard durumunu kontrol et
  useEffect(() => {
    window.moleAPI.guardControl('status').then(r => {
      if (r.running && !active) {
        setActive(true)
        startPolling()
      }
    })
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const startPolling = () => {
    const poll = async () => {
      try {
        const r = await window.moleAPI.liveGuard(watchPaths)
        if (r.success && r.data?.events?.length > 0) {
          const newEvents: GuardEvent[] = Array.isArray(r.data.events) ? r.data.events : [r.data.events]
          setEvents(prev => [...newEvents, ...prev].slice(0, 200))
          setStats(prev => ({
            totalChecked: prev.totalChecked + r.data.eventCount,
            threats: prev.threats + newEvents.filter((e: GuardEvent) => e.riskScore >= 25).length,
          }))
        }
      } catch {}
    }
    poll()
    intervalRef.current = setInterval(poll, 12000)
  }

  const start = async () => {
    await window.moleAPI.guardControl('start')
    setActive(true)
    setEvents([])
    setStats({ totalChecked: 0, threats: 0 })
    startPolling()
  }

  const stop = async () => {
    await window.moleAPI.guardControl('stop')
    setActive(false)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Eye size={24} className="text-mole-accent" /> {tx('Canlı Koruma', 'Real-time Protection')}
        </h1>
        <p className="text-mole-text-muted mt-1">{tx('Kritik klasörleri canlı izle, yeni dosyaları anında tara', 'Monitor critical folders live, scan new files instantly')}</p>
      </div>

      {/* Status + toggle */}
      <div className={`rounded-xl p-6 border flex items-center justify-between ${
        active ? 'bg-mole-safe/5 border-mole-safe/30' : 'bg-mole-surface border-mole-border'
      }`}>
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
            active ? 'bg-mole-safe/20' : 'bg-mole-bg'
          }`}>
            {active
              ? <Shield size={28} className="text-mole-safe" />
              : <Eye size={28} className="text-mole-text-muted" />}
          </div>
          <div>
            <p className="font-semibold text-lg">{active ? tx('Canlı Koruma Aktif', 'Real-time Protection Active') : tx('Koruma Kapalı', 'Protection Off')}</p>
            <p className="text-sm text-mole-text-muted">
              {active ? tx('Her 12 saniyede yeni dosyalar kontrol ediliyor...', 'New files checked every 12 seconds...') : tx('Baslatmak için tikla', 'Click to start')}
            </p>
            {active && (
              <div className="flex items-center gap-1 mt-1">
                <Loader2 size={12} className="animate-spin text-mole-safe" />
                <span className="text-xs text-mole-safe">{tx('Izleniyor', 'Monitoring')}</span>
              </div>
            )}
          </div>
        </div>
        <button onClick={active ? stop : start}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
            active ? 'bg-mole-danger hover:bg-mole-danger/80' : 'bg-mole-safe hover:bg-mole-safe/80 text-black'
          }`}>
          {active ? <><Square size={16} /> {tx('Durdur', 'Stop')}</> : <><Play size={16} /> {tx('Baslat', 'Start')}</>}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-mole-surface rounded-lg p-4 border border-mole-border">
          <p className="text-xs text-mole-text-muted">{tx('Izlenen Klasör', 'Watched Folders')}</p>
          <p className="text-xl font-bold mt-1">{watchPaths.length}</p>
        </div>
        <div className="bg-mole-surface rounded-lg p-4 border border-mole-border">
          <p className="text-xs text-mole-text-muted">{tx('Kontrol Edilen', 'Checked')}</p>
          <p className="text-xl font-bold mt-1">{stats.totalChecked}</p>
        </div>
        <div className="bg-mole-surface rounded-lg p-4 border border-mole-border">
          <p className="text-xs text-mole-text-muted">{tx('Tehdit', 'Threats')}</p>
          <p className={`text-xl font-bold mt-1 ${stats.threats > 0 ? 'text-red-400' : 'text-mole-safe'}`}>{stats.threats}</p>
        </div>
      </div>

      {/* Watched folders */}
      <div className="bg-mole-surface rounded-xl p-4 border border-mole-border">
        <p className="font-medium text-sm mb-3">{tx('Izlenen Klasörler', 'Watched Folders')}</p>
        {watchPaths.map((p, i) => (
          <div key={i} className="flex items-center gap-3 py-1.5">
            <div className={`w-2 h-2 rounded-full ${active ? 'bg-mole-safe animate-pulse' : 'bg-mole-text-muted/30'}`} />
            <span className="text-sm text-mole-text-muted">{p}</span>
          </div>
        ))}
      </div>

      {/* Event feed */}
      {events.length > 0 && (
        <div className="bg-mole-surface rounded-xl p-4 border border-mole-border">
          <p className="font-medium text-sm mb-3">{tx('Canlı Olay Akısı', 'Live Event Feed')}</p>
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {events.map((e, i) => (
              <div key={i} className={`flex items-center gap-3 p-2.5 rounded-lg text-sm ${
                e.riskScore >= 50 ? 'bg-red-400/5' : e.riskScore >= 25 ? 'bg-yellow-400/5' : 'bg-mole-bg'
              }`}>
                {e.riskScore >= 50
                  ? <AlertTriangle size={14} className="text-red-400 shrink-0" />
                  : e.riskScore >= 25
                    ? <Shield size={14} className="text-yellow-400 shrink-0" />
                    : <CheckCircle2 size={14} className="text-mole-safe shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-xs">{e.fileName}</p>
                  <p className="text-[11px] text-mole-text-muted truncate">{e.path}</p>
                  {e.reason && <p className="text-[11px] text-mole-warning">{e.reason}</p>}
                </div>
                <div className="text-right shrink-0">
                  {e.isFromInternet && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-mole-warning/20 text-mole-warning rounded-full">web</span>
                  )}
                  {e.riskScore > 0 && <p className="text-xs font-bold text-mole-warning mt-0.5">{e.riskScore}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
