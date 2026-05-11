import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Info, CheckCircle2, AlertTriangle, AlertCircle, ArrowRight } from 'lucide-react'
import { useNotificationStore, type NotificationType } from '../stores/notificationStore'

const iconMap: Record<NotificationType, JSX.Element> = {
  info: <Info size={15} className="text-blue-400 shrink-0" />,
  success: <CheckCircle2 size={15} className="text-mole-safe shrink-0" />,
  warning: <AlertTriangle size={15} className="text-mole-warning shrink-0" />,
  error: <AlertCircle size={15} className="text-red-400 shrink-0" />,
}

const bgMap: Record<NotificationType, string> = {
  info: 'bg-blue-500/10 border-blue-500/30',
  success: 'bg-mole-safe/10 border-mole-safe/30',
  warning: 'bg-mole-warning/10 border-mole-warning/30',
  error: 'bg-red-500/10 border-red-500/30',
}

const labelMap: Record<NotificationType, string> = {
  info: 'INFO',
  success: 'OK',
  warning: 'WARN',
  error: 'ERROR',
}

export default function TopBanner() {
  const { notifications, dismiss } = useNotificationStore()
  const navigate = useNavigate()
  const timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map())
  const visible = [...notifications].slice(-3).reverse()

  useEffect(() => {
    for (const n of notifications) {
      if (n.autoDismiss && n.autoDismiss > 0 && !timersRef.current.has(n.id)) {
        const timer = setTimeout(() => {
          dismiss(n.id)
          timersRef.current.delete(n.id)
        }, n.autoDismiss)
        timersRef.current.set(n.id, timer)
      }
    }

    // Cleanup timers for removed notifications
    for (const [id, timer] of timersRef.current) {
      if (!notifications.find((n) => n.id === id)) {
        clearTimeout(timer)
        timersRef.current.delete(id)
      }
    }
  }, [notifications, dismiss])

  if (visible.length === 0) return null

  return (
    <div className="flex justify-end px-4 py-2 shrink-0 pointer-events-none">
      <div className="w-full max-w-3xl space-y-1.5 pointer-events-auto">
      {visible.map((n) => (
        <div
          key={n.id}
          className={`group flex items-start gap-2.5 px-3 py-2.5 rounded-xl border text-xs shadow-sm backdrop-blur-sm ${bgMap[n.type]}`}
          style={{ animation: 'slideDown 0.25s ease-out' }}
        >
          <div className="pt-0.5">{iconMap[n.type]}</div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] px-1.5 py-0.5 rounded-md border border-current/20 text-mole-text-muted font-semibold tracking-wide">
                {labelMap[n.type]}
              </span>
              <span className="text-[10px] text-mole-text-muted">{new Date(n.createdAt).toLocaleTimeString()}</span>
            </div>
            <p className="font-semibold text-[12px] leading-4 mt-1">{n.title}</p>
            {n.message && (
              <p className="text-mole-text-muted leading-4 mt-0.5 break-all">{n.message}</p>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0 ml-1">
            {n.action && (
              <button
                onClick={() => { navigate(n.action!.route); dismiss(n.id) }}
                className="flex items-center gap-1 px-2 py-1 rounded-md bg-mole-accent/15 text-mole-accent hover:bg-mole-accent/25 font-semibold transition-colors"
              >
                {n.action.label} <ArrowRight size={12} />
              </button>
            )}
            <button
              onClick={() => dismiss(n.id)}
              className="p-1 rounded text-mole-text-muted hover:text-mole-text hover:bg-mole-bg/40 transition-colors"
              aria-label="Dismiss notification"
            >
              <X size={13} />
            </button>
          </div>
        </div>
      ))}
      </div>
    </div>
  )
}
