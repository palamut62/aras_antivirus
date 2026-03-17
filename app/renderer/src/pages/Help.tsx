import { HelpCircle, Shield, Sparkles, Code2, Eye, Wifi, Usb, FolderLock, Cpu, GitBranch, Globe, Keyboard, AlertTriangle, Settings } from 'lucide-react'
import { useLang } from '../contexts/LangContext'

interface HelpSection {
  icon: any
  titleTr: string
  titleEn: string
  descTr: string
  descEn: string
  tipsTr: string[]
  tipsEn: string[]
}

const sections: HelpSection[] = [
  {
    icon: Shield,
    titleTr: 'Guvenlik Tarama',
    titleEn: 'Security Scan',
    descTr: 'Sisteminizi viruslere, trojanlara ve zararli yazilimlara karsi tarayin.',
    descEn: 'Scan your system for viruses, trojans, and malware.',
    tipsTr: ['Hizli tarama en sik enfekte olan alanları kontrol eder', 'Tam tarama tum diski kontrol eder (daha uzun surer)', 'Bulunan tehditler otomatik karantinaya alinir'],
    tipsEn: ['Quick scan checks most commonly infected areas', 'Full scan checks entire disk (takes longer)', 'Found threats are automatically quarantined'],
  },
  {
    icon: Eye,
    titleTr: 'Canli Koruma',
    titleEn: 'Live Protection',
    descTr: 'Arka planda kritik klasorleri izler, yeni dosyalari aninda tarar.',
    descEn: 'Monitors critical folders in background, instantly scans new files.',
    tipsTr: ['Downloads, Desktop ve Temp klasorlerini izler', 'Her 12 saniyede yeni dosyalari kontrol eder', 'Ayarlardan acip kapatabilirsiniz'],
    tipsEn: ['Monitors Downloads, Desktop, and Temp folders', 'Checks new files every 12 seconds', 'Can be toggled on/off in Settings'],
  },
  {
    icon: Globe,
    titleTr: 'Web Koruma',
    titleEn: 'Web Protection',
    descTr: 'Indirilen dosyalari, tarayici uzantilarini ve gecici calistirilabilirleri kontrol eder.',
    descEn: 'Checks downloaded files, browser extensions, and temp executables.',
    tipsTr: ['Tarayici gecmisini zararli sitelere karsi tarar', 'Supheli uzantilari tespit eder', 'Temp klasorundeki calistirilan dosyalari izler'],
    tipsEn: ['Scans browser history for malicious sites', 'Detects suspicious extensions', 'Monitors executables in temp folder'],
  },
  {
    icon: Wifi,
    titleTr: 'Ag Izleme',
    titleEn: 'Network Monitor',
    descTr: 'Aktif ag baglantilarini izleyin, supheli IP\'leri engelleyin.',
    descEn: 'Monitor active connections, block suspicious IPs.',
    tipsTr: ['Supheli portlara baglantilari tespit eder', 'Tek tikla IP engelleyebilirsiniz (Firewall kurali)', 'Engellenen IP\'leri "Engellenenler" sekmesinden yonetebilirsiniz', 'Canli izleme 15 saniyede bir guncellenir'],
    tipsEn: ['Detects connections to suspicious ports', 'Block IPs with one click (Firewall rule)', 'Manage blocked IPs from "Blocked" tab', 'Live monitoring refreshes every 15 seconds'],
  },
  {
    icon: Usb,
    titleTr: 'USB Izleme',
    titleEn: 'USB Monitor',
    descTr: 'USB suruculerini tarayin, autorun tehditlerine karsi koruyun.',
    descEn: 'Scan USB drives, protect against autorun threats.',
    tipsTr: ['Yeni takillan USB\'ler otomatik taranir', 'Autorun dosyalari tespit edilir', 'Supheli dosyalar karantinaya alinir'],
    tipsEn: ['Newly connected USBs are auto-scanned', 'Autorun files are detected', 'Suspicious files are quarantined'],
  },
  {
    icon: Cpu,
    titleTr: 'Surec Yonetimi',
    titleEn: 'Process Manager',
    descTr: 'Calislan surecleri izleyin, supheli islemleri tespit edin.',
    descEn: 'Monitor running processes, detect suspicious operations.',
    tipsTr: ['Risk skoruna gore siralama yapar', 'Supheli surecler kirmizi isaretlenir', 'Detay panelinden surec bilgilerini inceleyebilirsiniz'],
    tipsEn: ['Sorted by risk score', 'Suspicious processes are flagged red', 'View process details in the detail panel'],
  },
  {
    icon: FolderLock,
    titleTr: 'Karantina',
    titleEn: 'Quarantine',
    descTr: 'Karantinaya alinan dosyalari yonetin.',
    descEn: 'Manage quarantined files.',
    tipsTr: ['Guvenli olduguna emin oldugunuz dosyalari geri yukleyebilirsiniz', 'Kalici silme islemi geri alinamaz', 'Karantina dosyalari sifreli saklanir'],
    tipsEn: ['Restore files you are sure are safe', 'Permanent deletion cannot be undone', 'Quarantined files are stored encrypted'],
  },
  {
    icon: Sparkles,
    titleTr: 'Derin Temizlik',
    titleEn: 'Deep Clean',
    descTr: 'Gecici dosyalari, onbellekleri ve gereksiz verileri temizleyin.',
    descEn: 'Clean temporary files, caches, and unnecessary data.',
    tipsTr: ['Kategorilere gore secim yapabilirsiniz', 'Onizleme modu once neler silinecegini gosterir', 'Geri Donusum Kutusu secenegi Ayarlardan acilabilir'],
    tipsEn: ['Select by category', 'Preview mode shows what will be deleted first', 'Recycle Bin option can be enabled in Settings'],
  },
  {
    icon: Code2,
    titleTr: 'Gelistirici Temizle',
    titleEn: 'Dev Purge',
    descTr: 'node_modules, .venv, build artefaktlari gibi gelistirici dosyalarini temizleyin.',
    descEn: 'Clean developer files like node_modules, .venv, build artifacts.',
    tipsTr: ['Proje klasorunu secip tarama yapin', 'GB\'larca yer kazanabilirsiniz', 'Korunan klasorler Ayarlardan yonetilebilir'],
    tipsEn: ['Select project folder and scan', 'Save GBs of space', 'Protected folders managed in Settings'],
  },
  {
    icon: GitBranch,
    titleTr: 'Repo Guvenlik',
    titleEn: 'Repo Security',
    descTr: 'Proje bagimlilik, gizli bilgi ve script analizleri.',
    descEn: 'Project dependency, secret, and script analysis.',
    tipsTr: ['package.json, requirements.txt gibi dosyalari analiz eder', 'API key, token gibi gizli bilgileri tespit eder', 'Supheli npm/pip scriptleri isaretler'],
    tipsEn: ['Analyzes package.json, requirements.txt etc.', 'Detects secrets like API keys and tokens', 'Flags suspicious npm/pip scripts'],
  },
  {
    icon: Settings,
    titleTr: 'Ayarlar',
    titleEn: 'Settings',
    descTr: 'Uygulama davranisini yapilandirin.',
    descEn: 'Configure app behavior.',
    tipsTr: ['Canli koruma burada acilip kapatilir', 'Otomatik baslama ayari buradan yapilir', 'Tema ve dil degisimi yapabilirsiniz'],
    tipsEn: ['Toggle live protection here', 'Configure auto-start here', 'Change theme and language'],
  },
]

const shortcuts = [
  { keys: 'Ctrl + Shift + S', descTr: 'Hizli tarama baslat', descEn: 'Start quick scan' },
  { keys: 'Ctrl + Q', descTr: 'Karantina', descEn: 'Quarantine' },
  { keys: 'Esc', descTr: 'Islemi iptal et', descEn: 'Cancel operation' },
]

export default function Help() {
  const { lang } = useLang()
  const isEn = lang === 'en'

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-mole-accent/20 via-purple-500/10 to-mole-bg p-8 border border-mole-accent/20">
        <div className="relative z-10">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <HelpCircle size={32} className="text-mole-accent" />
            {isEn ? 'Help Center' : 'Yardim Merkezi'}
          </h1>
          <p className="text-mole-text-muted mt-2 text-lg">
            {isEn ? 'Everything you need to know about Aras Antivirus' : 'Aras Antivirus hakkinda bilmeniz gereken her sey'}
          </p>
        </div>
        {/* Decorative */}
        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-mole-accent/5 blur-2xl" />
        <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-purple-500/5 blur-xl" />
      </div>

      {/* Feature sections */}
      <div className="space-y-3">
        {sections.map((s, i) => (
          <details key={i} className="group bg-mole-surface rounded-xl border border-mole-border overflow-hidden transition-all">
            <summary className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-mole-bg/30 transition-colors list-none">
              <s.icon size={18} className="text-mole-accent shrink-0" />
              <span className="font-semibold text-sm flex-1">{isEn ? s.titleEn : s.titleTr}</span>
              <svg className="w-4 h-4 text-mole-text-muted transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <div className="px-5 pb-4 pt-1 border-t border-mole-border/50">
              <p className="text-sm text-mole-text-muted mb-3">{isEn ? s.descEn : s.descTr}</p>
              <ul className="space-y-1.5">
                {(isEn ? s.tipsEn : s.tipsTr).map((tip, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm">
                    <span className="text-mole-accent mt-0.5">•</span>
                    <span className="text-mole-text/80">{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </details>
        ))}
      </div>

      {/* Keyboard shortcuts */}
      <div className="bg-mole-surface rounded-xl border border-mole-border p-5">
        <h2 className="font-semibold flex items-center gap-2 mb-4">
          <Keyboard size={18} className="text-mole-accent" />
          {isEn ? 'Keyboard Shortcuts' : 'Klavye Kisayollari'}
        </h2>
        <div className="space-y-2">
          {shortcuts.map((s, i) => (
            <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg bg-mole-bg/50">
              <span className="text-sm text-mole-text-muted">{isEn ? s.descEn : s.descTr}</span>
              <kbd className="px-2.5 py-1 rounded bg-mole-border/50 text-xs font-mono text-mole-text">{s.keys}</kbd>
            </div>
          ))}
        </div>
      </div>

      {/* About */}
      <div className="bg-mole-surface rounded-xl border border-mole-border p-5 text-center">
        <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-mole-accent to-purple-400 flex items-center justify-center">
          <Shield size={24} className="text-white" />
        </div>
        <h3 className="font-bold">Aras Antivirüs v1.0</h3>
        <p className="text-sm text-mole-text-muted mt-1">
          {isEn ? 'Developer-friendly antivirus & system cleanup' : 'Gelistirici dostu antivirus & sistem temizligi'}
        </p>
        <p className="text-xs text-mole-text-muted/50 mt-3">
          {isEn ? 'Built with Electron + React + TypeScript' : 'Electron + React + TypeScript ile yazildi'}
        </p>
      </div>
    </div>
  )
}
