import { useState, useEffect, useCallback } from 'react'
import { AlertTriangle, Shield, Info, X, Wifi } from 'lucide-react'

interface DialogData {
  id: string
  type: 'threat' | 'network' | 'info'
  title: string
  message: string
  detail: string
  buttons: string[]
}

export default function AlertDialog() {
  const [dialogs, setDialogs] = useState<DialogData[]>([])

  useEffect(() => {
    const handler = (_event: any, data: DialogData) => {
      setDialogs(prev => [...prev, data])
    }
    window.moleAPI.onDialog(handler)
    return () => window.moleAPI.offDialog(handler)
  }, [])

  const respond = useCallback((dialog: DialogData, buttonIndex: number) => {
    window.moleAPI.dialogRespond(dialog.id, buttonIndex)
    setDialogs(prev => prev.filter(d => d.id !== dialog.id))
  }, [])

  if (dialogs.length === 0) return null

  const current = dialogs[0]

  const iconMap = {
    threat: <AlertTriangle size={28} className="text-red-400" />,
    network: <Wifi size={28} className="text-yellow-400" />,
    info: <Info size={28} className="text-mole-accent" />,
  }

  const borderMap = {
    threat: 'border-red-500/40',
    network: 'border-yellow-500/40',
    info: 'border-mole-accent/40',
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className={`bg-mole-surface border-2 ${borderMap[current.type]} rounded-2xl shadow-2xl w-[480px] max-w-[90vw] overflow-hidden animate-in`}>
        {/* Header */}
        <div className="flex items-center gap-3 px-6 pt-5 pb-3">
          {iconMap[current.type]}
          <h2 className="text-lg font-bold flex-1">{current.title}</h2>
          <button onClick={() => respond(current, current.buttons.length - 1)}
            className="text-mole-text-muted hover:text-mole-text transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 pb-4">
          <p className="text-sm font-medium text-mole-text mb-2">{current.message}</p>
          {current.detail && (
            <div className="bg-mole-bg rounded-lg p-3 text-xs text-mole-text-muted whitespace-pre-line leading-relaxed">
              {current.detail}
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-2 px-6 pb-5">
          {current.buttons.map((label, i) => {
            // First button = primary action (green/allow), second = danger, third = neutral
            let cls = 'px-4 py-2 rounded-lg text-sm font-medium transition-colors '
            if (current.buttons.length === 1) {
              cls += 'bg-mole-accent hover:bg-mole-accent-hover text-white'
            } else if (i === 0) {
              cls += 'bg-mole-safe/20 text-mole-safe hover:bg-mole-safe/30 border border-mole-safe/30'
            } else if (i === 1) {
              cls += 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30'
            } else {
              cls += 'bg-mole-bg text-mole-text-muted hover:bg-mole-border border border-mole-border'
            }
            return (
              <button key={i} onClick={() => respond(current, i)} className={cls}>
                {label}
              </button>
            )
          })}
        </div>

        {/* Queue indicator */}
        {dialogs.length > 1 && (
          <div className="px-6 pb-3 text-xs text-mole-text-muted text-center border-t border-mole-border pt-2">
            +{dialogs.length - 1} uyarı daha bekliyor
          </div>
        )}
      </div>
    </div>
  )
}
