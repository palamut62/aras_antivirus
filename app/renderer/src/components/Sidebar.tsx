import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Sparkles, Code2, HardDrive, Activity, FileText, Settings,
  ShieldCheck, Cpu, FolderLock, GitBranch, Eye, Globe, Usb, Wifi,
  ChevronLeft, ChevronRight, ChevronDown, HelpCircle, Bug, FolderOpen,
  Package, Zap, FileBox, Bot,
} from 'lucide-react'
import { useLang } from '../contexts/LangContext'

const cleanupItems = [
  { to: '/', icon: LayoutDashboard, labelKey: 'nav.dashboard' },
  { to: '/deep-clean', icon: Sparkles, labelKey: 'nav.deepClean' },
  { to: '/dev-purge', icon: Code2, labelKey: 'nav.devPurge' },
  { to: '/analyze', icon: HardDrive, labelKey: 'nav.diskAnalysis' },
]

const securityItems = [
  { to: '/autopilot', icon: Bot, labelKey: 'nav.autopilot' },
  { to: '/security-scan', icon: ShieldCheck, labelKey: 'nav.securityScan' },
  { to: '/realtime', icon: Eye, labelKey: 'nav.liveProtection' },
  { to: '/web-protection', icon: Globe, labelKey: 'nav.webProtection' },
  { to: '/network', icon: Wifi, labelKey: 'nav.networkMonitor' },
  { to: '/usb', icon: Usb, labelKey: 'nav.usbMonitor' },
  { to: '/processes', icon: Cpu, labelKey: 'nav.processes' },
  { to: '/repo-scan', icon: GitBranch, labelKey: 'nav.repoSecurity' },
  { to: '/threats', icon: Bug, labelKey: 'nav.threats' },
  { to: '/quarantine', icon: FolderLock, labelKey: 'nav.quarantine' },
]

const systemItems = [
  { to: '/app-uninstaller', icon: Package, labelKey: 'nav.appUninstaller' },
  { to: '/system-optimize', icon: Zap, labelKey: 'nav.systemOptimize' },
  { to: '/installer-cleanup', icon: FileBox, labelKey: 'nav.installerCleanup' },
  { to: '/file-explorer', icon: FolderOpen, labelKey: 'nav.fileExplorer' },
  { to: '/status', icon: Activity, labelKey: 'nav.systemStatus' },
  { to: '/logs', icon: FileText, labelKey: 'nav.logs' },
  { to: '/settings', icon: Settings, labelKey: 'nav.settings' },
  { to: '/help', icon: HelpCircle, labelKey: 'nav.help' },
]

function NavSection({ title, items, collapsed, expanded, onToggle }: {
  title: string
  items: typeof cleanupItems
  collapsed: boolean
  expanded: boolean
  onToggle: () => void
}) {
  const { t } = useLang()
  return (
    <div className="mb-1">
      {!collapsed ? (
        <button onClick={onToggle}
          className="w-full flex items-center justify-between px-4 py-1.5 text-[10px] uppercase tracking-[0.15em] text-mole-text-muted/50 font-bold hover:text-mole-text-muted transition-colors">
          <span>{title}</span>
          <ChevronDown size={12} className={`transition-transform duration-200 ${expanded ? '' : '-rotate-90'}`} />
        </button>
      ) : (
        <div className="h-px bg-mole-border/50 mx-3 my-2" />
      )}
      {(collapsed || expanded) && items.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.to === '/'}
          title={collapsed ? t(item.labelKey) : undefined}
          className={({ isActive }) =>
            `group flex items-center gap-3 mx-2 rounded-lg text-[13px] font-medium transition-all duration-200 ${
              collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2'
            } ${
              isActive
                ? 'text-mole-accent bg-mole-accent/10 shadow-sm shadow-mole-accent/5'
                : 'text-mole-text-muted hover:text-mole-text hover:bg-mole-surface/80'
            }`}>
          <item.icon size={collapsed ? 18 : 16} className="shrink-0 transition-transform duration-200 group-hover:scale-110" />
          {!collapsed && <span className="truncate">{t(item.labelKey)}</span>}
        </NavLink>
      ))}
    </div>
  )
}

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [expandedSections, setExpandedSections] = useState({ cleanup: true, security: true, system: true })
  const { t } = useLang()

  const toggleSection = (key: 'cleanup' | 'security' | 'system') => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <nav className={`${collapsed ? 'w-16' : 'w-56'} bg-mole-surface/50 backdrop-blur-sm border-r border-mole-border flex flex-col py-2 shrink-0 overflow-y-auto overflow-x-hidden transition-all duration-300`}>
      {/* Collapse toggle */}
      <button onClick={() => setCollapsed(!collapsed)}
        className="mx-2 mb-2 p-1.5 rounded-lg text-mole-text-muted hover:text-mole-text hover:bg-mole-bg/50 transition-colors self-end">
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      <NavSection title={t('nav.cleanup')} items={cleanupItems} collapsed={collapsed} expanded={expandedSections.cleanup} onToggle={() => toggleSection('cleanup')} />
      <NavSection title={t('nav.security')} items={securityItems} collapsed={collapsed} expanded={expandedSections.security} onToggle={() => toggleSection('security')} />
      <NavSection title={t('nav.system')} items={systemItems} collapsed={collapsed} expanded={expandedSections.system} onToggle={() => toggleSection('system')} />

      {/* Footer spacer */}
      <div className="mt-auto" />
    </nav>
  )
}
