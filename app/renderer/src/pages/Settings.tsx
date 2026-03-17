import { useState, useEffect } from 'react'
import { Settings as SettingsIcon, Save, Plus, X, Shield, Power } from 'lucide-react'
import { useLang } from '../contexts/LangContext'

export default function Settings() {
  const { tx } = useLang()
  const [settings, setSettings] = useState<any>(null)
  const [saved, setSaved] = useState(false)
  const [newPath, setNewPath] = useState('')
  const [guardRunning, setGuardRunning] = useState(false)

  useEffect(() => {
    window.moleAPI.settingsGet().then(setSettings)
    window.moleAPI.guardControl('status').then(r => setGuardRunning(r.running))
  }, [])

  const save = async () => {
    if (!settings) return
    await window.moleAPI.settingsUpdate(settings)

    // Apply guard setting immediately
    if (settings.liveProtection && !guardRunning) {
      await window.moleAPI.guardControl('start')
      setGuardRunning(true)
    } else if (!settings.liveProtection && guardRunning) {
      await window.moleAPI.guardControl('stop')
      setGuardRunning(false)
    }

    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const addProtectedPath = () => {
    const p = newPath.trim()
    if (p && !settings.protectedPaths.includes(p)) {
      setSettings({ ...settings, protectedPaths: [...settings.protectedPaths, p] })
      setNewPath('')
    }
  }

  const pickProtectedPath = async () => {
    const folder = await window.moleAPI.pickFolder()
    if (folder && !settings.protectedPaths.includes(folder)) {
      setSettings({ ...settings, protectedPaths: [...settings.protectedPaths, folder] })
    }
  }

  if (!settings) return <p className="text-mole-text-muted">Yükleniyor...</p>

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <SettingsIcon size={24} className="text-mole-accent" /> {tx('Ayarlar', 'Settings')}
        </h1>
        <p className="text-mole-text-muted mt-1">{tx('Uygulama davranisini yapilandir', 'Configure app behavior')}</p>
      </div>

      {/* Koruma Ayarları */}
      <div className="bg-mole-surface rounded-xl p-5 border border-mole-border space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Shield size={16} className="text-mole-accent" />
          <p className="font-medium">{tx('Koruma Ayarlari', 'Protection Settings')}</p>
        </div>
        <Toggle label={tx('Canli Koruma', 'Live Protection')} description={tx('Arka planda dosya, ag ve USB izleme (acik tutmaniz önerilir)', 'Background file, network and USB monitoring (recommended)')}
          value={settings.liveProtection ?? true} onChange={v => setSettings({ ...settings, liveProtection: v })}
          activeColor="bg-mole-safe" />
        <div className="flex items-center justify-between pl-6">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${guardRunning ? 'bg-mole-safe animate-pulse' : 'bg-mole-text-muted/30'}`} />
            <span className="text-xs text-mole-text-muted">{guardRunning ? tx('Koruma su an aktif', 'Protection is active') : tx('Koruma kapali', 'Protection is off')}</span>
          </div>
        </div>
        <Toggle label={tx('Bilgisayar acilinca baslat', 'Start on boot')} description={tx('Windows acildiginda uygulama otomatik calissin', 'Auto-start when Windows boots')}
          value={settings.autoStart ?? true} onChange={v => setSettings({ ...settings, autoStart: v })}
          activeColor="bg-mole-accent" />
      </div>

      {/* Genel Ayarlar */}
      <div className="bg-mole-surface rounded-xl p-5 border border-mole-border space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Power size={16} className="text-mole-accent" />
          <p className="font-medium">{tx('Genel Ayarlar', 'General Settings')}</p>
        </div>
        <Toggle label={tx('Önizleme modu', 'Preview mode')} description={tx('Ilk taramada silme yerine önizleme göster', 'Show preview instead of deleting on first scan')}
          value={settings.dryRunDefault} onChange={v => setSettings({ ...settings, dryRunDefault: v })} />
        <Toggle label={tx('Geri Dönüsüm Kutusuna gönder', 'Send to Recycle Bin')} description={tx('Kalici silme yerine Geri Dönüsüm Kutusu kullan', 'Use Recycle Bin instead of permanent delete')}
          value={settings.sendToRecycleBin} onChange={v => setSettings({ ...settings, sendToRecycleBin: v })} />
        <Toggle label={tx('Loglama', 'Logging')} description={tx('Islem loglarini kaydet', 'Save operation logs')}
          value={settings.loggingEnabled} onChange={v => setSettings({ ...settings, loggingEnabled: v })} />
      </div>

      {/* Korunan Klasörler */}
      <div className="bg-mole-surface rounded-xl p-5 border border-mole-border space-y-3">
        <p className="font-medium">{tx('Korunan Klasörler', 'Protected Folders')}</p>
        <p className="text-xs text-mole-text-muted">{tx('Bu klasörler asla silinmez', 'These folders are never deleted')}</p>
        {settings.protectedPaths.map((p: string, i: number) => (
          <div key={i} className="flex items-center justify-between bg-mole-bg rounded px-3 py-2 text-sm">
            <span className="truncate">{p}</span>
            <button onClick={() => setSettings({ ...settings, protectedPaths: settings.protectedPaths.filter((_: any, j: number) => j !== i) })}
              className="text-mole-danger hover:text-red-400 shrink-0 ml-2"><X size={14} /></button>
          </div>
        ))}
        <div className="flex gap-2">
          <input value={newPath} onChange={e => setNewPath(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addProtectedPath()}
            placeholder={tx('Korunan klasör ekle...', 'Add protected folder...')}
            className="flex-1 bg-mole-bg border border-mole-border rounded px-3 py-2 text-sm focus:outline-none focus:border-mole-accent" />
          <button onClick={addProtectedPath} className="p-2 bg-mole-accent rounded hover:bg-mole-accent-hover transition-colors"
            title="Elle ekle">
            <Plus size={16} />
          </button>
          <button onClick={pickProtectedPath} className="p-2 bg-mole-accent rounded hover:bg-mole-accent-hover transition-colors"
            title="Klasör seç">
            <SettingsIcon size={16} />
          </button>
        </div>
      </div>

      {/* Kaydet */}
      <button onClick={save}
        className="flex items-center gap-2 px-6 py-2.5 bg-mole-accent hover:bg-mole-accent-hover rounded-lg font-medium transition-colors">
        <Save size={16} /> {saved ? tx('Kaydedildi!', 'Saved!') : tx('Kaydet', 'Save')}
      </button>
    </div>
  )
}

function Toggle({ label, description, value, onChange, activeColor }: {
  label: string; description: string; value: boolean; onChange: (v: boolean) => void; activeColor?: string
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-mole-text-muted">{description}</p>
      </div>
      <button onClick={() => onChange(!value)}
        className={`w-11 h-6 rounded-full transition-colors relative ${value ? (activeColor || 'bg-mole-accent') : 'bg-mole-border'}`}>
        <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${value ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  )
}
