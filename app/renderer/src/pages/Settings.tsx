import { useState, useEffect } from 'react'
import { Settings as SettingsIcon, Save, Plus, X, Shield, Power, Clock } from 'lucide-react'
import { useLang } from '../contexts/LangContext'
import { useAutopilotStore } from '../stores/autopilotStore'

export default function Settings() {
  const { tx } = useLang()
  const [settings, setSettings] = useState<any>(null)
  const [saved, setSaved] = useState(false)
  const [newPath, setNewPath] = useState('')
  const [guardRunning, setGuardRunning] = useState(false)
  const autopilotRunning = useAutopilotStore(s => s.running)
  const setAutopilotEnabled = useAutopilotStore(s => s.setEnabled)

  useEffect(() => {
    window.moleAPI.settingsGet().then((s: any) => setSettings({ ...s, autopilotEnabled: Boolean(s?.autopilotEnabled) }))
    window.moleAPI.guardControl('status').then(r => setGuardRunning(r.running))
  }, [])

  const save = async () => {
    if (!settings) return

    const updated = await window.moleAPI.settingsUpdate(settings)
    setSettings(updated)

    // Apply guard setting immediately
    if (settings.liveProtection && !guardRunning) {
      await window.moleAPI.guardControl('start')
      setGuardRunning(true)
    } else if (!settings.liveProtection && guardRunning) {
      await window.moleAPI.guardControl('stop')
      setGuardRunning(false)
    }

    // Apply autopilot setting immediately
    await setAutopilotEnabled(Boolean(settings.autopilotEnabled))

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

  if (!settings) return <p className="text-mole-text-muted">Yukleniyor...</p>

  return (
    <div className="w-full max-w-[1200px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <SettingsIcon size={24} className="text-mole-accent" /> {tx('Ayarlar', 'Settings')}
        </h1>
        <p className="text-mole-text-muted mt-1">{tx('Uygulama davranisini yapilandir', 'Configure app behavior')}</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px] items-start">
        <section className="space-y-6">
          {/* Protection */}
          <div className="bg-mole-surface rounded-xl p-5 border border-mole-border space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Shield size={16} className="text-mole-accent" />
              <p className="font-medium">{tx('Koruma Ayarlari', 'Protection Settings')}</p>
            </div>

            <Toggle
              label={tx('Canli Koruma', 'Live Protection')}
              description={tx('Arka planda dosya, ag ve USB izleme (acik tutmaniz onerilir)', 'Background file, network and USB monitoring (recommended)')}
              value={settings.liveProtection ?? true}
              onChange={v => setSettings({ ...settings, liveProtection: v })}
              activeColor="bg-mole-safe"
            />
            <div className="flex items-center justify-between pl-6">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${guardRunning ? 'bg-mole-safe animate-pulse' : 'bg-mole-text-muted/30'}`} />
                <span className="text-xs text-mole-text-muted">
                  {guardRunning ? tx('Koruma su an aktif', 'Protection is active') : tx('Koruma kapali', 'Protection is off')}
                </span>
              </div>
            </div>

            <Toggle
              label={tx('Autopilot Modu', 'Autopilot Mode')}
              description={tx('Guvenlik, ag, USB ve guvenli temizlik dongulerini otomatik calistir', 'Automatically run security, network, USB and safe cleanup cycles')}
              value={settings.autopilotEnabled ?? false}
              onChange={v => setSettings({ ...settings, autopilotEnabled: v })}
              activeColor="bg-mole-accent"
            />
            <div className="flex items-center justify-between pl-6">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${autopilotRunning ? 'bg-mole-safe animate-pulse' : 'bg-mole-text-muted/30'}`} />
                <span className="text-xs text-mole-text-muted">
                  {autopilotRunning ? tx('Autopilot su an aktif', 'Autopilot is active') : tx('Autopilot pasif', 'Autopilot is inactive')}
                </span>
              </div>
            </div>

            <Toggle
              label={tx('Bilgisayar acilinca baslat', 'Start on boot')}
              description={tx('Windows acildiginda uygulama otomatik calissin', 'Auto-start when Windows boots')}
              value={settings.autoStart ?? true}
              onChange={v => setSettings({ ...settings, autoStart: v })}
              activeColor="bg-mole-accent"
            />
          </div>

          {/* General */}
          <div className="bg-mole-surface rounded-xl p-5 border border-mole-border space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Power size={16} className="text-mole-accent" />
              <p className="font-medium">{tx('Genel Ayarlar', 'General Settings')}</p>
            </div>
            <Toggle label={tx('Onizleme modu', 'Preview mode')} description={tx('Ilk taramada silme yerine onizleme goster', 'Show preview instead of deleting on first scan')}
              value={settings.dryRunDefault} onChange={v => setSettings({ ...settings, dryRunDefault: v })} />
            <Toggle label={tx('Geri Donusum Kutusuna gonder', 'Send to Recycle Bin')} description={tx('Kalici silme yerine Geri Donusum Kutusu kullan', 'Use Recycle Bin instead of permanent delete')}
              value={settings.sendToRecycleBin} onChange={v => setSettings({ ...settings, sendToRecycleBin: v })} />
            <Toggle label={tx('Loglama', 'Logging')} description={tx('Islem loglarini kaydet', 'Save operation logs')}
              value={settings.loggingEnabled} onChange={v => setSettings({ ...settings, loggingEnabled: v })} />
          </div>

          {/* Scheduled scan */}
          <div className="bg-mole-surface rounded-xl p-5 border border-mole-border space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock size={16} className="text-mole-accent" />
              <p className="font-medium">{tx('Zamanlanmis Tarama', 'Scheduled Scan')}</p>
            </div>
            <Toggle label={tx('Otomatik tarama', 'Automatic scan')}
              description={tx('Belirli araliklarla gereksiz dosyalari tara ve bildir', 'Scan for junk files at regular intervals and notify')}
              value={settings.scheduledScan ?? false}
              onChange={v => setSettings({ ...settings, scheduledScan: v })}
              activeColor="bg-mole-accent" />

            {settings.scheduledScan && (
              <div className="pl-6 space-y-3">
                <div>
                  <p className="text-sm font-medium mb-2">{tx('Tarama sikligi', 'Scan frequency')}</p>
                  <div className="flex gap-2 flex-wrap">
                    {([
                      { value: 'hourly', label: tx('Saatlik', 'Hourly') },
                      { value: 'daily', label: tx('Gunluk', 'Daily') },
                      { value: 'weekly', label: tx('Haftalik', 'Weekly') },
                    ] as const).map(opt => (
                      <button key={opt.value}
                        onClick={() => setSettings({ ...settings, scheduledScanInterval: opt.value })}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
                          settings.scheduledScanInterval === opt.value
                            ? 'bg-mole-accent/20 border-mole-accent text-mole-accent'
                            : 'bg-mole-bg border-mole-border text-mole-text-muted hover:border-mole-accent/50'
                        }`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                {settings.scheduledScanInterval === 'hourly' && (
                  <div>
                    <p className="text-sm font-medium mb-2">{tx('Kac saatte bir', 'Every X hours')}</p>
                    <div className="flex items-center gap-3">
                      <input type="range" min={1} max={12} value={settings.scheduledScanHours || 6}
                        onChange={e => setSettings({ ...settings, scheduledScanHours: Number(e.target.value) })}
                        className="flex-1 accent-[var(--mole-accent)]" />
                      <span className="text-sm font-mono w-16 text-center bg-mole-bg rounded px-2 py-1">
                        {settings.scheduledScanHours || 6} {tx('saat', 'hrs')}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Protected folders */}
          <div className="bg-mole-surface rounded-xl p-5 border border-mole-border space-y-3">
            <p className="font-medium">{tx('Korunan Klasorler', 'Protected Folders')}</p>
            <p className="text-xs text-mole-text-muted">{tx('Bu klasorler asla silinmez', 'These folders are never deleted')}</p>
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
                placeholder={tx('Korunan klasor ekle...', 'Add protected folder...')}
                className="flex-1 bg-mole-bg border border-mole-border rounded px-3 py-2 text-sm focus:outline-none focus:border-mole-accent" />
              <button onClick={addProtectedPath} className="p-2 bg-mole-accent rounded hover:bg-mole-accent-hover transition-colors"
                title="Elle ekle">
                <Plus size={16} />
              </button>
              <button onClick={pickProtectedPath} className="p-2 bg-mole-accent rounded hover:bg-mole-accent-hover transition-colors"
                title="Klasor sec">
                <SettingsIcon size={16} />
              </button>
            </div>
          </div>

          <button onClick={save}
            className="xl:hidden w-full flex items-center justify-center gap-2 px-6 py-2.5 bg-mole-accent hover:bg-mole-accent-hover rounded-lg font-medium transition-colors">
            <Save size={16} /> {saved ? tx('Kaydedildi!', 'Saved!') : tx('Kaydet', 'Save')}
          </button>
        </section>

        <aside className="space-y-4 xl:sticky xl:top-6">
          <div className="bg-mole-surface rounded-xl p-5 border border-mole-border">
            <p className="text-sm font-semibold mb-3">{tx('Durum Ozeti', 'Status Summary')}</p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-mole-text-muted">{tx('Canli Koruma', 'Live Protection')}</span>
                <span className={guardRunning ? 'text-mole-safe' : 'text-mole-warning'}>
                  {guardRunning ? tx('Aktif', 'Active') : tx('Pasif', 'Inactive')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-mole-text-muted">{tx('Autopilot', 'Autopilot')}</span>
                <span className={autopilotRunning ? 'text-mole-safe' : 'text-mole-warning'}>
                  {autopilotRunning ? tx('Aktif', 'Active') : tx('Pasif', 'Inactive')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-mole-text-muted">{tx('Zamanlanmis Tarama', 'Scheduled Scan')}</span>
                <span className={settings.scheduledScan ? 'text-mole-safe' : 'text-mole-warning'}>
                  {settings.scheduledScan ? tx('Acik', 'On') : tx('Kapali', 'Off')}
                </span>
              </div>
            </div>
          </div>

          <button onClick={save}
            className="hidden xl:flex w-full items-center justify-center gap-2 px-6 py-2.5 bg-mole-accent hover:bg-mole-accent-hover rounded-lg font-medium transition-colors">
            <Save size={16} /> {saved ? tx('Kaydedildi!', 'Saved!') : tx('Kaydet', 'Save')}
          </button>
        </aside>
      </div>
    </div>
  )
}

function Toggle({ label, description, value, onChange, activeColor }: {
  label: string; description: string; value: boolean; onChange: (v: boolean) => void; activeColor?: string
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-mole-text-muted">{description}</p>
      </div>
      <button onClick={() => onChange(!value)}
        className={`w-11 h-6 rounded-full transition-colors relative mt-0.5 ${value ? (activeColor || 'bg-mole-accent') : 'bg-mole-border'}`}>
        <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${value ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  )
}
