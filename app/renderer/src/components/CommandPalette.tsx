import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'

interface Cmd {
  id: string
  label: string
  hint?: string
  group: string
  action: () => void | Promise<void>
}

export default function CommandPalette() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault(); setOpen(v => !v); setQ(''); setIdx(0)
      } else if (e.key === 'Escape' && open) {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open])

  const commands: Cmd[] = useMemo(() => [
    // Navigation
    { id: 'nav-dashboard', label: 'Kontrol Paneli', group: 'Sayfa', action: () => navigate('/') },
    { id: 'nav-security', label: 'Güvenlik Tarama', group: 'Sayfa', action: () => navigate('/security-scan') },
    { id: 'nav-realtime', label: 'Canlı Koruma', group: 'Sayfa', action: () => navigate('/realtime') },
    { id: 'nav-web', label: 'Web Koruma', group: 'Sayfa', action: () => navigate('/web-protection') },
    { id: 'nav-network', label: 'Ağ İzleme', group: 'Sayfa', action: () => navigate('/network') },
    { id: 'nav-usb', label: 'USB İzleme', group: 'Sayfa', action: () => navigate('/usb') },
    { id: 'nav-proc', label: 'Süreçler', group: 'Sayfa', action: () => navigate('/processes') },
    { id: 'nav-repo', label: 'Repo Güvenlik', group: 'Sayfa', action: () => navigate('/repo-scan') },
    { id: 'nav-vuln', label: 'Güvenlik Açığı Taraması (CVE)', group: 'Sayfa', action: () => navigate('/vuln-scan') },
    { id: 'nav-threats', label: 'Tehdit Veritabanı', group: 'Sayfa', action: () => navigate('/threats') },
    { id: 'nav-quar', label: 'Karantina', group: 'Sayfa', action: () => navigate('/quarantine') },
    { id: 'nav-deep', label: 'Derin Temizlik', group: 'Sayfa', action: () => navigate('/deep-clean') },
    { id: 'nav-dev-purge', label: 'Geliştirici Temizle', group: 'Sayfa', action: () => navigate('/dev-purge') },
    { id: 'nav-dev-servers', label: 'Dev Sunucular', group: 'Sayfa', action: () => navigate('/dev-servers') },
    { id: 'nav-nm-bulk', label: 'node_modules Toplu', group: 'Sayfa', action: () => navigate('/node-modules-bulk') },
    { id: 'nav-docker', label: 'Docker Temizlik', group: 'Sayfa', action: () => navigate('/docker-cleanup') },
    { id: 'nav-editor', label: 'Editor Orphan', group: 'Sayfa', action: () => navigate('/editor-cleanup') },
    { id: 'nav-secret', label: 'Secret Tarama', group: 'Sayfa', action: () => navigate('/secret-sweep') },
    { id: 'nav-uninst', label: 'Program Kaldırıcı', group: 'Sayfa', action: () => navigate('/app-uninstaller') },
    { id: 'nav-optimize', label: 'Sistem Optimize', group: 'Sayfa', action: () => navigate('/system-optimize') },
    { id: 'nav-installer', label: 'Installer Temizle', group: 'Sayfa', action: () => navigate('/installer-cleanup') },
    { id: 'nav-files', label: 'Dosya Yöneticisi', group: 'Sayfa', action: () => navigate('/file-explorer') },
    { id: 'nav-logs', label: 'Geçmiş', group: 'Sayfa', action: () => navigate('/logs') },
    { id: 'nav-settings', label: 'Ayarlar', group: 'Sayfa', action: () => navigate('/settings') },
    // Actions
    { id: 'act-quick-scan', label: 'Hızlı Tarama Başlat', group: 'Eylem', action: async () => { await window.moleAPI.securityScan('quick'); navigate('/security-scan') } },
    { id: 'act-full-scan', label: 'Tam Tarama Başlat', group: 'Eylem', action: async () => { await window.moleAPI.securityScan('full'); navigate('/security-scan') } },
    { id: 'act-list-dev-servers', label: 'Çalışan Dev Sunucuları Listele', group: 'Eylem', action: () => { navigate('/dev-servers') } },
    { id: 'act-kill-all-dev', label: 'Tüm Dev Sunucuları Kapat', group: 'Eylem', action: async () => { await window.moleAPI.devServers('kill-all') } },
  ], [navigate])

  const filtered = useMemo(() => {
    const term = q.toLowerCase().trim()
    if (!term) return commands
    return commands.filter(c => c.label.toLowerCase().includes(term) || c.group.toLowerCase().includes(term))
  }, [q, commands])

  useEffect(() => { setIdx(0) }, [q])

  const run = (c: Cmd) => { setOpen(false); c.action() }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIdx(i => Math.min(i + 1, filtered.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); if (filtered[idx]) run(filtered[idx]) }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-24 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)}>
      <div className="w-[600px] max-w-[90vw] bg-mole-surface border border-mole-border rounded-lg shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 px-3 py-2 border-b border-mole-border">
          <Search size={16} className="text-mole-text-muted" />
          <input autoFocus value={q} onChange={e => setQ(e.target.value)} onKeyDown={onKey}
            placeholder="Komut ara... (Esc kapat)"
            className="flex-1 bg-transparent outline-none text-sm" />
          <span className="text-xs text-mole-text-muted">{filtered.length}</span>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {filtered.map((c, i) => (
            <button key={c.id} onClick={() => run(c)} onMouseEnter={() => setIdx(i)}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-sm ${i === idx ? 'bg-mole-accent/20' : 'hover:bg-mole-bg/50'}`}>
              <span>{c.label}</span>
              <span className="text-xs text-mole-text-muted">{c.group}</span>
            </button>
          ))}
          {filtered.length === 0 && <p className="px-3 py-6 text-center text-sm text-mole-text-muted">Eşleşme yok</p>}
        </div>
        <div className="px-3 py-1.5 border-t border-mole-border text-[10px] text-mole-text-muted flex gap-3">
          <span>↑↓ gez</span><span>↵ çalıştır</span><span>Esc kapat</span><span className="ml-auto">Ctrl+K</span>
        </div>
      </div>
    </div>
  )
}
