import { useState, useEffect } from 'react'
import { Shield, Eye, Clock, Key, Check, X, Bot } from 'lucide-react'
import { useAutopilotStore } from '../stores/autopilotStore'

interface State {
  liveProtection: boolean
  autoStart: boolean
  scheduledScan: boolean
  scheduledScanHours: number
  virusTotalApiKey: string
  autopilotEnabled: boolean
}

const STORAGE_KEY = 'aras-onboarded-v1'

export default function Onboarding() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const setAutopilotEnabled = useAutopilotStore(s => s.setEnabled)

  const [s, setS] = useState<State>({
    liveProtection: true,
    autoStart: true,
    scheduledScan: true,
    scheduledScanHours: 24,
    virusTotalApiKey: '',
    autopilotEnabled: false,
  })

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      window.moleAPI.settingsGet?.().then((cur: any) => {
        if (cur) {
          setS({
            liveProtection: cur.liveProtection ?? true,
            autoStart: cur.autoStart ?? true,
            scheduledScan: cur.scheduledScan ?? true,
            scheduledScanHours: cur.scheduledScanHours ?? 24,
            virusTotalApiKey: cur.virusTotalApiKey ?? '',
            autopilotEnabled: Boolean(cur.autopilotEnabled),
          })
        }
      })
      setOpen(true)
    }
  }, [])

  const finish = async () => {
    await window.moleAPI.settingsUpdate?.(s)
    await setAutopilotEnabled(Boolean(s.autopilotEnabled))
    localStorage.setItem(STORAGE_KEY, '1')
    setOpen(false)
  }

  if (!open) return null

  const steps = [
    {
      icon: Shield,
      title: 'Aras Antivirus\'e Hos Geldiniz',
      body: 'Bu kisa kurulum ile temel koruma ayarlarini yapacagiz (30 saniye).',
      content: null,
    },
    {
      icon: Eye,
      title: 'Canli Koruma',
      body: 'Downloads, Desktop, Documents, Pictures ve Temp klasorlerine dusen yeni exe/msi/ps1 dosyalari aninda bildirilir.',
      content: (
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={s.liveProtection} onChange={e => setS({ ...s, liveProtection: e.target.checked })} className="accent-mole-accent w-4 h-4" />
          <span>Canli korumayi etkinlestir</span>
        </label>
      ),
    },
    {
      icon: Clock,
      title: 'Otomatik Tarama',
      body: 'Belirli araliklarla sistemi otomatik tarayalim.',
      content: (
        <div className="space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={s.scheduledScan} onChange={e => setS({ ...s, scheduledScan: e.target.checked })} className="accent-mole-accent w-4 h-4" />
            <span>Zamanlanmis tarama acik</span>
          </label>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-mole-text-muted">Her</span>
            <input type="number" min={1} max={168} value={s.scheduledScanHours}
              onChange={e => setS({ ...s, scheduledScanHours: parseInt(e.target.value, 10) || 24 })}
              className="bg-mole-bg border border-mole-border rounded px-2 py-1 w-20" />
            <span className="text-mole-text-muted">saatte bir</span>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={s.autoStart} onChange={e => setS({ ...s, autoStart: e.target.checked })} className="accent-mole-accent w-4 h-4" />
            <span>Bilgisayar acilinca otomatik basla</span>
          </label>
        </div>
      ),
    },
    {
      icon: Bot,
      title: 'Autopilot',
      body: 'Guvenlik taramasi, supheli ag kontrolu, USB taramasi ve guvenli temizlik dongulerini otomatik calistirir.',
      content: (
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={s.autopilotEnabled} onChange={e => setS({ ...s, autopilotEnabled: e.target.checked })} className="accent-mole-accent w-4 h-4" />
          <span>Autopilot acik kalsin (uygulama acilisinda otomatik baslat)</span>
        </label>
      ),
    },
    {
      icon: Key,
      title: 'VirusTotal API (Opsiyonel)',
      body: 'VirusTotal API key girerseniz ekstra kontrol yapilir. Bos birakabilirsiniz.',
      content: (
        <input
          type="text"
          value={s.virusTotalApiKey}
          onChange={e => setS({ ...s, virusTotalApiKey: e.target.value })}
          placeholder="API key (opsiyonel)"
          className="w-full bg-mole-bg border border-mole-border rounded px-3 py-2 text-sm font-mono"
        />
      ),
    },
    {
      icon: Check,
      title: 'Hazir!',
      body: 'Ayarlar uygulanacak. Istediginiz zaman Ayarlar sayfasindan degistirebilirsiniz.',
      content: null,
    },
  ]

  const cur = steps[step]
  const Icon = cur.icon

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-mole-surface border border-mole-border rounded-lg w-[520px] max-w-[90vw] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-mole-border">
          <div className="flex items-center gap-2">
            <Icon size={18} className="text-mole-accent" />
            <h2 className="font-semibold">{cur.title}</h2>
          </div>
          <button onClick={() => { localStorage.setItem(STORAGE_KEY, '1'); setOpen(false) }} className="text-mole-text-muted hover:text-mole-text"><X size={16} /></button>
        </div>
        <div className="px-4 py-5 space-y-4">
          <p className="text-sm text-mole-text-muted">{cur.body}</p>
          {cur.content}
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-mole-border">
          <div className="flex gap-1">
            {steps.map((_, i) => (
              <span key={i} className={`w-2 h-2 rounded-full ${i === step ? 'bg-mole-accent' : 'bg-mole-border'}`} />
            ))}
          </div>
          <div className="flex gap-2">
            {step > 0 && <button onClick={() => setStep(step - 1)} className="px-3 py-1.5 text-sm border border-mole-border rounded hover:bg-mole-bg">Geri</button>}
            {step < steps.length - 1
              ? <button onClick={() => setStep(step + 1)} className="px-4 py-1.5 text-sm bg-mole-accent rounded hover:bg-mole-accent-hover">Ileri</button>
              : <button onClick={finish} className="px-4 py-1.5 text-sm bg-mole-accent rounded hover:bg-mole-accent-hover">Bitir</button>}
          </div>
        </div>
      </div>
    </div>
  )
}
