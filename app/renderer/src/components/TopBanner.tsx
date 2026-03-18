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

export default function TopBanner() {
  const { notifications, dismiss } = useNotificationStore()
  const navigate = useNavigate()
  const timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map())

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

  if (notifications.length === 0) return null

  return (
    <div className="flex flex-col gap-1 px-4 py-1.5 shrink-0">
      {notifications.slice(-3).map((n) => (
        <div
          key={n.id}
          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-xs animate-in ${bgMap[n.type]}`}
          style={{ animation: 'slideDown 0.25s ease-out' }}
        >
          {iconMap[n.type]}
          <span className="font-medium">{n.title}</span>
          {n.message && (
            <span className="text-mole-text-muted">{n.message}</span>
          )}
          {n.action && (
            <button
              onClick={() => { navigate(n.action!.route); dismiss(n.id) }}
              className="flex items-center gap-1 ml-auto text-mole-accent hover:text-mole-accent-hover font-medium transition-colors"
            >
              {n.action.label} <ArrowRight size={12} />
            </button>
          )}
          <button
            onClick={() => dismiss(n.id)}
            className={`${n.action ? '' : 'ml-auto'} text-mole-text-muted hover:text-mole-text transition-colors shrink-0`}
          >
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  )
}
