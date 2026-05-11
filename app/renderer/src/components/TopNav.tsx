import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  Shield, Sparkles, Code2, Zap, Settings as SettingsIcon, Home, Search,
  ShieldCheck, Eye, Globe, Wifi, Usb, Cpu, GitBranch, ShieldAlert, Activity,
  Network, Bug, FolderLock, HardDrive, Package, FileBox, Server, PackageOpen,
  Container, Wind, KeyRound, FolderOpen, FileText, HelpCircle, Bot, ScanSearch,
} from 'lucide-react'
import { useLang } from '../contexts/LangContext'

type Item = { to: string; label: string; icon: any }

const categories: { id: string; label: string; icon: any; items: Item[] }[] = [
  {
    id: 'protect',
    label: 'Koruma',
    icon: Shield,
    items: [
      { to: '/autopilot', label: 'Autopilot', icon: Bot },
      { to: '/security-scan', label: 'Güvenlik Tarama', icon: ShieldCheck },
      { to: '/realtime', label: 'Canlı Koruma', icon: Eye },
      { to: '/web-protection', label: 'Web Koruma', icon: Globe },
      { to: '/network', label: 'Ağ İzleme', icon: Wifi },
      { to: '/usb', label: 'USB İzleme', icon: Usb },
      { to: '/processes', label: 'Süreçler', icon: Cpu },
      { to: '/process-tree', label: 'Process Ağacı', icon: Network },
      { to: '/behavior', label: 'Davranış İzleme', icon: Activity },
      { to: '/repo-scan', label: 'Repo Güvenlik', icon: GitBranch },
      { to: '/vuln-scan', label: 'Güvenlik Açıkları', icon: ShieldAlert },
      { to: '/yara', label: 'YARA Tarama', icon: ScanSearch },
      { to: '/threats', label: 'Tehdit DB', icon: Bug },
      { to: '/quarantine', label: 'Karantina', icon: FolderLock },
    ],
  },
  {
    id: 'clean',
    label: 'Temizlik',
    icon: Sparkles,
    items: [
      { to: '/deep-clean', label: 'Derin Temizlik', icon: Sparkles },
      { to: '/analyze', label: 'Disk Analizi', icon: HardDrive },
      { to: '/app-uninstaller', label: 'Program Kaldırıcı', icon: Package },
      { to: '/installer-cleanup', label: 'Installer Temizle', icon: FileBox },
    ],
  },
  {
    id: 'dev',
    label: 'Geliştirici',
    icon: Code2,
    items: [
      { to: '/dev-servers', label: 'Dev Sunucular', icon: Server },
      { to: '/dev-purge', label: 'Build Artifact', icon: Code2 },
      { to: '/node-modules-bulk', label: 'node_modules Toplu', icon: PackageOpen },
      { to: '/docker-cleanup', label: 'Docker', icon: Container },
      { to: '/editor-cleanup', label: 'Editor Orphan', icon: Wind },
      { to: '/secret-sweep', label: 'Secret Tarama', icon: KeyRound },
    ],
  },
  {
    id: 'system',
    label: 'Sistem',
    icon: Zap,
    items: [
      { to: '/system-optimize', label: 'Sistem Optimize', icon: Zap },
      { to: '/file-explorer', label: 'Dosya Yöneticisi', icon: FolderOpen },
      { to: '/status', label: 'Sistem Durumu', icon: Activity },
      { to: '/logs', label: 'Log Merkezi', icon: FileText },
    ],
  },
  {
    id: 'logs',
    label: 'Loglar',
    icon: FileText,
    items: [
      { to: '/logs', label: 'Log Merkezi', icon: FileText },
    ],
  },
  {
    id: 'settings',
    label: 'Ayarlar',
    icon: SettingsIcon,
    items: [
      { to: '/settings', label: 'Ayarlar', icon: SettingsIcon },
      { to: '/help', label: 'Yardım', icon: HelpCircle },
    ],
  },
]

export default function TopNav() {
  const loc = useLocation()
  const nav = useNavigate()
  const { tx } = useLang()

  const activeCategory = categories.find(c => c.items.some(i => i.to === loc.pathname))
  const isHome = loc.pathname === '/'

  const triggerSearch = () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))
  }

  return (
    <div className="border-b border-mole-border bg-mole-surface/40 backdrop-blur-sm shrink-0">
      <div className="flex items-center gap-3 px-4 h-12">
        <button onClick={() => nav('/')}
          className={`flex items-center gap-2 px-2 py-1 rounded font-bold text-sm ${isHome ? 'text-mole-accent' : 'text-mole-text hover:text-mole-accent'}`}>
          <Home size={16} /> Aras
        </button>

        <div className="h-6 w-px bg-mole-border mx-1" />

        <nav className="flex items-center gap-1">
          {categories.map(cat => {
            const Icon = cat.icon
            const isActive = activeCategory?.id === cat.id
            return (
              <button key={cat.id}
                onClick={() => nav(cat.items[0].to)}
                title={cat.label}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[13px] font-medium transition-colors ${
                  isActive ? 'bg-mole-accent/15 text-mole-accent' : 'text-mole-text-muted hover:text-mole-text hover:bg-mole-bg/60'
                }`}>
                <Icon size={15} />
                <span className="hidden md:inline">{cat.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="flex-1" />

        <button
          onClick={() => nav('/logs')}
          className={`flex items-center gap-2 px-3 py-1 text-xs border rounded transition-colors ${
            loc.pathname === '/logs'
              ? 'bg-mole-accent/15 text-mole-accent border-mole-accent/40'
              : 'text-mole-text-muted bg-mole-bg/60 border-mole-border hover:bg-mole-bg hover:text-mole-text'
          }`}
          title={tx('Log Merkezi', 'Logs Hub')}
        >
          <FileText size={12} />
          <span className="hidden sm:inline">{tx('Log Merkezi', 'Logs Hub')}</span>
        </button>

        <button onClick={triggerSearch}
          className="flex items-center gap-2 px-3 py-1 text-xs text-mole-text-muted bg-mole-bg/60 border border-mole-border rounded hover:bg-mole-bg">
          <Search size={12} />
          <span className="hidden sm:inline">{tx('Komut ara...', 'Search...')}</span>
          <kbd className="hidden sm:inline px-1.5 py-0.5 text-[10px] bg-mole-surface border border-mole-border rounded font-mono">Ctrl+K</kbd>
        </button>
      </div>

      {activeCategory && (
        <div className="px-4 h-10 flex items-center gap-1 overflow-x-auto border-t border-mole-border/50">
          {activeCategory.items.map(it => {
            const Icon = it.icon
            return (
              <NavLink key={it.to} to={it.to}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-2.5 py-1 rounded text-[12px] transition-colors whitespace-nowrap ${
                    isActive ? 'bg-mole-accent/10 text-mole-accent' : 'text-mole-text-muted hover:text-mole-text hover:bg-mole-bg/60'
                  }`
                }>
                <Icon size={13} />
                {it.label}
              </NavLink>
            )
          })}
        </div>
      )}
    </div>
  )
}