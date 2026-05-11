import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Download, X, Loader2 } from 'lucide-react'

interface UpdateInfo {
  available: boolean
  version?: string
  current_version: string
  notes?: string
  date?: string
}

const DISMISS_KEY = 'aras-update-dismissed'

export default function UpdateChecker() {
  const [info, setInfo] = useState<UpdateInfo | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [installing, setInstalling] = useState(false)

  useEffect(() => {
    // Only run under Tauri (skip under Electron / web preview).
    if (!(window as any).__TAURI_INTERNALS__ && !(window as any).__TAURI__) return

    const check = async () => {
      try {
        const r: UpdateInfo = await invoke('check_for_update')
        if (r.available) {
          const lastDismissed = localStorage.getItem(DISMISS_KEY)
          if (lastDismissed !== r.version) {
            setInfo(r)
            setDismissed(false)
          }
        }
      } catch (e) {
        console.warn('update check failed', e)
      }
    }
    // First check 30s after launch (let app stabilize)
    const t1 = setTimeout(check, 30_000)
    // Then every 6 hours
    const t2 = setInterval(check, 6 * 60 * 60 * 1000)
    return () => { clearTimeout(t1); clearInterval(t2) }
  }, [])

  if (!info || !info.available || dismissed) return null

  const dismiss = () => {
    if (info.version) localStorage.setItem(DISMISS_KEY, info.version)
    setDismissed(true)
  }

  const install = async () => {
    setInstalling(true)
    try {
      await invoke('download_and_install_update')
      // Tauri restarts the app after install.
    } catch (e: any) {
      alert(`Güncelleme yüklenemedi: ${e}`)
      setInstalling(false)
    }
  }

  return (
    <div className="fixed bottom-12 right-4 z-50 w-80 bg-mole-surface border border-mole-accent/40 rounded-lg shadow-xl overflow-hidden">
      <div className="flex items-start gap-3 p-3">
        <Download size={18} className="text-mole-accent shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">Yeni sürüm hazır</p>
          <p className="text-xs text-mole-text-muted">v{info.current_version} → v{info.version}</p>
          {info.notes && <p className="text-xs text-mole-text-muted mt-2 line-clamp-3">{info.notes}</p>}
          <div className="flex gap-2 mt-3">
            <button onClick={install} disabled={installing}
              className="flex items-center gap-1 px-3 py-1 bg-mole-accent rounded text-xs hover:bg-mole-accent-hover disabled:opacity-50">
              {installing ? <><Loader2 size={12} className="animate-spin" /> Yükleniyor...</> : 'Yükle ve Yeniden Başla'}
            </button>
            <button onClick={dismiss} className="px-2 py-1 text-xs text-mole-text-muted hover:text-mole-text">Sonra</button>
          </div>
        </div>
        <button onClick={dismiss} className="text-mole-text-muted hover:text-mole-text shrink-0"><X size={14} /></button>
      </div>
    </div>
  )
}
