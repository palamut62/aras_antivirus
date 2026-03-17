import { useState, useEffect } from 'react'
import { FileText, Search, Trash2, Shield, RotateCcw, ShieldCheck, Sparkles, Filter, Copy, Check } from 'lucide-react'
import { useLang } from '../contexts/LangContext'

type ActionFilter = 'all' | 'scan' | 'clean' | 'quarantine' | 'delete' | 'restore' | 'block' | 'purge'

function useCopyFeedback() {
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1500)
  }
  return { copiedId, copy }
}

export default function Logs() {
  const { tx } = useLang()
  const { copiedId, copy } = useCopyFeedback()

  const actionConfig: Record<string, { label: string; icon: any; color: string }> = {
    scan: { label: tx('Tarama', 'Scan'), icon: ShieldCheck, color: 'text-mole-accent' },
    clean: { label: tx('Temizlik', 'Cleanup'), icon: Sparkles, color: 'text-mole-safe' },
    quarantine: { label: tx('Karantina', 'Quarantine'), icon: Shield, color: 'text-mole-warning' },
    delete: { label: tx('Silme', 'Delete'), icon: Trash2, color: 'text-red-400' },
    restore: { label: tx('Geri Yükleme', 'Restore'), icon: RotateCcw, color: 'text-blue-400' },
    block: { label: tx('Engelleme', 'Block'), icon: Shield, color: 'text-red-400' },
    purge: { label: tx('Purge', 'Purge'), icon: Trash2, color: 'text-orange-400' },
  }
  const [filter, setFilter] = useState<ActionFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [entries, setEntries] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [statsData, historyData] = await Promise.all([
        window.moleAPI.historyStats(),
        filter === 'all'
          ? searchQuery
            ? window.moleAPI.historySearch(searchQuery)
            : window.moleAPI.historyList(200)
          : window.moleAPI.historyByAction(filter)
      ])
      setStats(statsData)
      setEntries(historyData || [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [filter])

  const handleSearch = () => { fetchData() }

  const filters: { id: ActionFilter; label: string }[] = [
    { id: 'all', label: tx('Tümü', 'All') },
    { id: 'scan', label: tx('Taramalar', 'Scans') },
    { id: 'clean', label: tx('Temizlik', 'Cleanup') },
    { id: 'quarantine', label: tx('Karantina', 'Quarantine') },
    { id: 'delete', label: tx('Silinenler', 'Deleted') },
    { id: 'restore', label: tx('Geri Yüklenen', 'Restored') },
    { id: 'block', label: tx('Engellenen', 'Blocked') },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileText size={24} className="text-mole-accent" /> {tx('Geçmis & Loglar', 'History & Logs')}
        </h1>
        <p className="text-mole-text-muted mt-1">{tx('Tüm islem geçmisi ve veritabani', 'All operation history and database')}</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-3">
          <StatCard label={tx('Toplam Kayit', 'Total Records')} value={stats.totalEntries} />
          <StatCard label={tx('Bugün', 'Today')} value={stats.todayEntries} />
          <StatCard label={tx('Karantina', 'Quarantine')} value={stats.totalQuarantined} color="text-mole-warning" />
          <StatCard label={tx('Silinen', 'Deleted')} value={stats.totalDeleted} color="text-red-400" />
        </div>
      )}

      {/* Search */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-mole-text-muted" />
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder={tx('Dosya adi, yol veya detay ara...', 'Search by filename, path or detail...')}
            className="w-full bg-mole-surface border border-mole-border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-mole-accent" />
        </div>
        <button onClick={handleSearch}
          className="px-4 py-2 bg-mole-accent rounded-lg text-sm font-medium hover:bg-mole-accent-hover transition-colors">
          {tx('Ara', 'Search')}
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 flex-wrap items-center">
        {filters.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs transition-colors ${
              filter === f.id ? 'bg-mole-accent text-white' : 'bg-mole-surface border border-mole-border text-mole-text-muted hover:text-mole-text'
            }`}>
            <Filter size={10} /> {f.label}
          </button>
        ))}
        {entries.length > 0 && (
          <button onClick={() => {
            const text = entries.map(e => `[${new Date(e.timestamp).toLocaleString()}] [${e.action}] ${e.target} - ${e.details} (${e.status})`).join('\n')
            copy(text, 'all')
          }}
            className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded text-xs bg-mole-surface border border-mole-border text-mole-text-muted hover:text-mole-text transition-colors">
            {copiedId === 'all' ? <Check size={10} className="text-mole-safe" /> : <Copy size={10} />}
            {copiedId === 'all' ? tx('Kopyalandı!', 'Copied!') : tx('Tümünü Kopyala', 'Copy All')}
          </button>
        )}
      </div>

      {/* Entries */}
      {entries.length > 0 ? (
        <div className="space-y-1.5 max-h-[450px] overflow-y-auto">
          {entries.map((entry, i) => {
            const cfg = actionConfig[entry.action] || { label: entry.action, icon: FileText, color: 'text-mole-text-muted' }
            const Icon = cfg.icon
            return (
              <div key={i} className="group flex items-start gap-3 p-3 bg-mole-surface rounded-lg border border-mole-border">
                <Icon size={16} className={`${cfg.color} shrink-0 mt-0.5`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      entry.status === 'success' ? 'bg-mole-safe/20 text-mole-safe' : 'bg-mole-danger/20 text-mole-danger'
                    }`}>{entry.status}</span>
                  </div>
                  <p className="text-sm mt-0.5 truncate">{entry.target}</p>
                  <p className="text-xs text-mole-text-muted mt-0.5">{entry.details}</p>
                </div>
                <div className="flex items-start gap-2 shrink-0">
                  <button onClick={() => copy(`[${new Date(entry.timestamp).toLocaleString()}] [${entry.action}] ${entry.target} - ${entry.details} (${entry.status})`, `entry-${i}`)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-mole-bg transition-all"
                    title={tx('Kopyala', 'Copy')}>
                    {copiedId === `entry-${i}` ? <Check size={12} className="text-mole-safe" /> : <Copy size={12} className="text-mole-text-muted" />}
                  </button>
                  <div className="text-right">
                    <p className="text-[11px] text-mole-text-muted">{new Date(entry.timestamp).toLocaleString()}</p>
                    {entry.riskScore > 0 && <p className="text-xs font-bold text-mole-warning mt-0.5">Risk: {entry.riskScore}</p>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-mole-surface rounded-xl p-8 border border-mole-border text-center">
          <FileText size={48} className="text-mole-text-muted mx-auto mb-4" />
          <p className="text-mole-text-muted">{loading ? tx('Yükleniyor...', 'Loading...') : tx('Henüz kayit yok', 'No records yet')}</p>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="bg-mole-surface rounded-lg p-4 border border-mole-border">
      <p className="text-xs text-mole-text-muted">{label}</p>
      <p className={`text-xl font-bold mt-1 ${color || ''}`}>{value}</p>
    </div>
  )
}
