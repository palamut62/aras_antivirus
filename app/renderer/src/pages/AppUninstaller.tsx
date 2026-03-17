import { useState } from 'react'
import { Package, Search, Trash2, FolderSearch, Loader2, AlertTriangle } from 'lucide-react'
import { useLang } from '../contexts/LangContext'

interface AppInfo {
  id: string
  name: string
  publisher: string
  version: string
  installDate: string
  sizeBytes: number
  uninstallString: string
}

interface Leftover {
  path: string
  type: string
  sizeBytes: number
  location: string
}

export default function AppUninstaller() {
  const { tx } = useLang()
  const [apps, setApps] = useState<AppInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [uninstalling, setUninstalling] = useState<string | null>(null)
  const [leftovers, setLeftovers] = useState<{ appName: string; items: Leftover[] } | null>(null)
  const [cleaningLeftovers, setCleaningLeftovers] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  const formatSize = (bytes: number) => {
    if (!bytes || bytes <= 0) return '—'
    if (bytes >= 1e9) return (bytes / 1e9).toFixed(2) + ' GB'
    if (bytes >= 1e6) return (bytes / 1e6).toFixed(1) + ' MB'
    return (bytes / 1e3).toFixed(0) + ' KB'
  }

  const loadApps = async () => {
    setLoading(true)
    setMessage(null)
    try {
      const result = await window.moleAPI.appUninstaller('list')
      if (result.success && result.data?.apps) {
        setApps(result.data.apps)
      }
    } catch { /* */ }
    setLoading(false)
  }

  const handleUninstall = async (app: AppInfo) => {
    setUninstalling(app.id)
    setMessage(null)
    try {
      const result = await window.moleAPI.appUninstaller('uninstall', app.id)
      if (result.success) {
        setMessage({ text: `${app.name} ${tx('kaldirildi', 'uninstalled')}`, type: 'success' })
        const data = result.data || result
        if (data.leftovers && data.leftovers.length > 0) {
          setLeftovers({ appName: app.name, items: data.leftovers })
        }
        setApps(prev => prev.filter(a => a.id !== app.id))
      } else {
        setMessage({ text: result.error || tx('Kaldirma basarisiz', 'Uninstall failed'), type: 'error' })
      }
    } catch {
      setMessage({ text: tx('Kaldirma basarisiz', 'Uninstall failed'), type: 'error' })
    }
    setUninstalling(null)
  }

  const handleFindLeftovers = async (app: AppInfo) => {
    setMessage(null)
    try {
      const result = await window.moleAPI.appUninstaller('leftovers', app.id)
      if (result.success && result.data?.leftovers) {
        setLeftovers({ appName: result.data.appName, items: result.data.leftovers })
      }
    } catch { /* */ }
  }

  const handleCleanLeftovers = async () => {
    if (!leftovers) return
    setCleaningLeftovers(true)
    try {
      const result = await window.moleAPI.appUninstaller('clean-leftovers', leftovers.appName)
      if (result.success) {
        const data = result.data || result
        setMessage({ text: `${data.cleaned || 0} ${tx('artik dosya temizlendi', 'leftover files cleaned')}`, type: 'success' })
        setLeftovers(null)
      }
    } catch { /* */ }
    setCleaningLeftovers(false)
  }

  const filtered = apps.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.publisher.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Package size={24} className="text-mole-accent" /> {tx('Program Kaldirici', 'App Uninstaller')}
        </h1>
        <p className="text-mole-text-muted mt-1">{tx('Programlari artik dosyalariyla birlikte kaldir', 'Uninstall apps with leftover cleanup')}</p>
      </div>

      <div className="flex gap-2">
        <button onClick={loadApps} disabled={loading}
          className="px-6 py-2.5 bg-mole-accent hover:bg-mole-accent-hover disabled:opacity-50 rounded-lg font-medium transition-colors">
          {loading ? tx('Yukleniyor...', 'Loading...') : tx('Programlari Listele', 'List Programs')}
        </button>
      </div>

      {apps.length > 0 && (
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-mole-text-muted" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder={tx('Program ara...', 'Search apps...')}
            className="w-full pl-10 pr-4 py-2.5 bg-mole-surface border border-mole-border rounded-lg text-sm focus:outline-none focus:border-mole-accent" />
        </div>
      )}

      {message && (
        <div className={`p-3 rounded-lg border ${message.type === 'success' ? 'bg-mole-safe/10 border-mole-safe/30' : 'bg-mole-danger/10 border-mole-danger/30'}`}>
          <p className="text-sm font-medium">{message.text}</p>
        </div>
      )}

      {leftovers && leftovers.items.length > 0 && (
        <div className="p-4 bg-mole-surface rounded-lg border border-mole-warning/30">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-mole-warning" />
              <span className="font-medium">{leftovers.appName} — {leftovers.items.length} {tx('artik dosya bulundu', 'leftover files found')}</span>
            </div>
            <button onClick={handleCleanLeftovers} disabled={cleaningLeftovers}
              className="px-4 py-1.5 bg-mole-danger hover:bg-mole-danger/80 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors">
              {cleaningLeftovers ? tx('Temizleniyor...', 'Cleaning...') : tx('Artiklari Temizle', 'Clean Leftovers')}
            </button>
          </div>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {leftovers.items.map((l, i) => (
              <div key={i} className="text-xs text-mole-text-muted flex justify-between">
                <span className="truncate flex-1 mr-2">{l.path}</span>
                <span className="shrink-0">{l.type === 'registry' ? 'REG' : formatSize(l.sizeBytes)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="space-y-1.5 max-h-[calc(100vh-360px)] overflow-y-auto">
          <div className="text-xs text-mole-text-muted px-1 mb-2">
            {filtered.length} / {apps.length} {tx('program', 'apps')}
          </div>
          {filtered.map(app => (
            <div key={app.id}
              className="flex items-center gap-4 p-3 bg-mole-surface rounded-lg border border-mole-border hover:bg-mole-bg/50 transition-colors">
              <Package size={20} className="text-mole-text-muted shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{app.name}</p>
                <p className="text-xs text-mole-text-muted truncate">
                  {app.publisher}{app.version ? ` v${app.version}` : ''}{app.installDate ? ` — ${app.installDate}` : ''}
                </p>
              </div>
              <span className="text-sm text-mole-text-muted shrink-0">{formatSize(app.sizeBytes)}</span>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => handleFindLeftovers(app)} title={tx('Artik Dosya Bul', 'Find Leftovers')}
                  className="p-2 rounded-lg hover:bg-mole-warning/20 text-mole-text-muted hover:text-mole-warning transition-colors">
                  <FolderSearch size={16} />
                </button>
                <button onClick={() => handleUninstall(app)} disabled={uninstalling === app.id}
                  title={tx('Kaldir', 'Uninstall')}
                  className="p-2 rounded-lg hover:bg-mole-danger/20 text-mole-text-muted hover:text-mole-danger transition-colors disabled:opacity-50">
                  {uninstalling === app.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-mole-accent" />
        </div>
      )}
    </div>
  )
}
