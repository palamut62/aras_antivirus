import { useState, useEffect } from 'react'
import { useTaskQueue } from '../stores/taskQueue'
import { useLang } from '../contexts/LangContext'
import { Loader2, CheckCircle2, AlertCircle, Clock, X, Shield, ShieldOff, Cpu, MemoryStick } from 'lucide-react'

export default function StatusBar() {
  const { tasks, clearDone } = useTaskQueue()
  const { t } = useLang()
  const [guardRunning, setGuardRunning] = useState(true)
  const [cpuUsage, setCpuUsage] = useState(0)
  const [memUsage, setMemUsage] = useState({ used: 0, total: 0, percent: 0 })

  useEffect(() => {
    const fetchStatus = () => {
      if (typeof window.moleAPI?.guardControl === 'function') {
        window.moleAPI.guardControl('status').then(r => setGuardRunning(r.running)).catch(() => {})
      }
    }
    const fetchResources = () => {
      if (typeof window.moleAPI?.getResourceUsage === 'function') {
        window.moleAPI.getResourceUsage().then(r => {
          setCpuUsage(r.cpu)
          setMemUsage(r.memory)
        }).catch(() => {})
      }
    }
    fetchStatus()
    fetchResources()
    const guardInterval = setInterval(fetchStatus, 10000)
    const resourceInterval = setInterval(fetchResources, 3000)
    return () => { clearInterval(guardInterval); clearInterval(resourceInterval) }
  }, [])

  const active = tasks.find(t => t.status === 'running')
  const queued = tasks.filter(t => t.status === 'queued')
  const recent = tasks.filter(t => t.status === 'done' || t.status === 'error').slice(-3)

  return (
    <div className="h-8 min-h-[32px] w-full bg-mole-surface/80 backdrop-blur-sm border-t border-mole-border flex items-center px-4 gap-4 text-xs z-50 transition-colors">
      {/* App info */}
      <span className="text-[10px] text-mole-text-muted/60 font-medium shrink-0">Aras Antivirüs v1.3</span>
      <div className="w-px h-3.5 bg-mole-border/50" />

      {/* Active task */}
      {active && (
        <div className="flex items-center gap-2 text-mole-accent">
          <Loader2 size={11} className="animate-spin" />
          <span className="font-medium">{active.label}</span>
          {active.progress && <span className="text-mole-text-muted">— {active.progress}</span>}
        </div>
      )}

      {/* Queue */}
      {queued.length > 0 && (
        <div className="flex items-center gap-1.5 text-mole-text-muted">
          <Clock size={11} />
          <span>{t('status.queue')}: {queued.map(t => t.label).join(', ')}</span>
        </div>
      )}

      {/* Recent */}
      {!active && recent.length > 0 && (
        <div className="flex items-center gap-2">
          {recent.map(t => (
            <div key={t.id} className="flex items-center gap-1">
              {t.status === 'done'
                ? <CheckCircle2 size={11} className="text-mole-safe" />
                : <AlertCircle size={11} className="text-mole-danger" />}
              <span className="text-mole-text-muted">{t.label}</span>
            </div>
          ))}
          <button onClick={clearDone} className="ml-1 text-mole-text-muted hover:text-mole-text">
            <X size={11} />
          </button>
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* CPU & Memory */}
      <div className="flex items-center gap-3 mr-3 text-mole-text-muted">
        <div className="flex items-center gap-1.5">
          <Cpu size={11} className={cpuUsage > 80 ? 'text-red-400' : cpuUsage > 50 ? 'text-mole-warning' : 'text-mole-safe'} />
          <span className={`font-mono ${cpuUsage > 80 ? 'text-red-400' : ''}`}>{cpuUsage.toFixed(0)}%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <MemoryStick size={11} className={memUsage.percent > 85 ? 'text-red-400' : memUsage.percent > 60 ? 'text-mole-warning' : 'text-mole-safe'} />
          <span className={`font-mono ${memUsage.percent > 85 ? 'text-red-400' : ''}`}>
            {(memUsage.used / 1e9).toFixed(1)}/{(memUsage.total / 1e9).toFixed(0)}GB
          </span>
        </div>
      </div>

      {/* Guard status */}
      <div className="flex items-center gap-1.5">
        {guardRunning ? (
          <>
            <Shield size={11} className="text-mole-safe" />
            <div className="w-1.5 h-1.5 rounded-full bg-mole-safe animate-pulse" />
            <span className="text-mole-safe/80 font-medium">{t('status.protectionActive')}</span>
          </>
        ) : (
          <>
            <ShieldOff size={11} className="text-mole-text-muted" />
            <span className="text-mole-text-muted">{t('status.protectionOff')}</span>
          </>
        )}
      </div>
    </div>
  )
}
