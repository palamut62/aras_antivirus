import { useEffect, useMemo, useState } from 'react'
import {
  FileText,
  Search,
  Trash2,
  Shield,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Filter,
  Copy,
  Check,
  RefreshCw,
  TerminalSquare,
  Calendar,
  Activity,
} from 'lucide-react'
import { useLang } from '../contexts/LangContext'

type ActionFilter = 'all' | 'scan' | 'clean' | 'quarantine' | 'delete' | 'restore' | 'block' | 'purge'
type LogsTab = 'activity' | 'operations' | 'runtime'

interface RuntimeLogEntry {
  timestamp: string
  level: 'info' | 'warn' | 'error' | 'debug'
  source: string
  message: string
  raw: string
}

interface OperationLog {
  timestamp: string
  action: string
  category: string
  itemCount: number
  sizeFreed: number
  status: 'success' | 'partial' | 'error'
  details?: string
}

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

  const [tab, setTab] = useState<LogsTab>('activity')

  const [filter, setFilter] = useState<ActionFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [entries, setEntries] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const [operationDates, setOperationDates] = useState<string[]>([])
  const [operationDate, setOperationDate] = useState<string>('')
  const [operationLogs, setOperationLogs] = useState<OperationLog[]>([])
  const [operationsLoading, setOperationsLoading] = useState(false)

  const [runtimeLogs, setRuntimeLogs] = useState<RuntimeLogEntry[]>([])
  const [runtimeQuery, setRuntimeQuery] = useState('')
  const [runtimeLoading, setRuntimeLoading] = useState(false)

  const actionConfig: Record<string, { label: string; icon: any; color: string }> = {
    scan: { label: tx('Tarama', 'Scan'), icon: ShieldCheck, color: 'text-mole-accent' },
    clean: { label: tx('Temizlik', 'Cleanup'), icon: Sparkles, color: 'text-mole-safe' },
    quarantine: { label: tx('Karantina', 'Quarantine'), icon: Shield, color: 'text-mole-warning' },
    delete: { label: tx('Silme', 'Delete'), icon: Trash2, color: 'text-red-400' },
    restore: { label: tx('Geri Yukleme', 'Restore'), icon: RotateCcw, color: 'text-blue-400' },
    block: { label: tx('Engelleme', 'Block'), icon: Shield, color: 'text-red-400' },
    purge: { label: tx('Purge', 'Purge'), icon: Trash2, color: 'text-orange-400' },
  }

  const fetchActivity = async () => {
    setLoading(true)
    try {
      const [statsData, historyData] = await Promise.all([
        window.moleAPI.historyStats(),
        filter === 'all'
          ? searchQuery
            ? window.moleAPI.historySearch(searchQuery)
            : window.moleAPI.historyList(300)
          : window.moleAPI.historyByAction(filter),
      ])
      setStats(statsData)
      setEntries(historyData || [])
    } catch {
      setEntries([])
    }
    setLoading(false)
  }

  const fetchOperationDates = async () => {
    try {
      const dates = await window.moleAPI.logsDates()
      const safeDates = dates || []
      setOperationDates(safeDates)
      if (!operationDate && safeDates.length > 0) {
        setOperationDate(safeDates[0])
        return safeDates[0]
      }
      return operationDate
    } catch {
      setOperationDates([])
      return ''
    }
  }

  const fetchOperations = async (dateArg?: string) => {
    setOperationsLoading(true)
    try {
      const dateToLoad = dateArg || operationDate || undefined
      const logs = await window.moleAPI.logsList(dateToLoad)
      setOperationLogs((logs || []) as OperationLog[])
    } catch {
      setOperationLogs([])
    }
    setOperationsLoading(false)
  }

  const fetchRuntime = async () => {
    setRuntimeLoading(true)
    try {
      const logs = await window.moleAPI.logsRuntime(800)
      setRuntimeLogs((logs || []) as RuntimeLogEntry[])
    } catch {
      setRuntimeLogs([])
    }
    setRuntimeLoading(false)
  }

  const refreshAll = async () => {
    await fetchActivity()
    const autoDate = await fetchOperationDates()
    await fetchOperations(autoDate)
    await fetchRuntime()
  }

  useEffect(() => {
    void fetchActivity()
  }, [filter])

  useEffect(() => {
    void (async () => {
      const autoDate = await fetchOperationDates()
      await fetchOperations(autoDate)
      await fetchRuntime()
    })()
  }, [])

  useEffect(() => {
    if (operationDate) {
      void fetchOperations(operationDate)
    }
  }, [operationDate])

  const handleSearch = () => {
    void fetchActivity()
  }

  const runtimeFiltered = useMemo(() => {
    const q = runtimeQuery.trim().toLowerCase()
    const list = [...runtimeLogs].reverse()
    if (!q) return list
    return list.filter((r) =>
      r.raw.toLowerCase().includes(q) ||
      r.source.toLowerCase().includes(q) ||
      r.message.toLowerCase().includes(q),
    )
  }, [runtimeLogs, runtimeQuery])

  const filters: { id: ActionFilter; label: string }[] = [
    { id: 'all', label: tx('Tumu', 'All') },
    { id: 'scan', label: tx('Taramalar', 'Scans') },
    { id: 'clean', label: tx('Temizlik', 'Cleanup') },
    { id: 'quarantine', label: tx('Karantina', 'Quarantine') },
    { id: 'delete', label: tx('Silinenler', 'Deleted') },
    { id: 'restore', label: tx('Geri Yuklenen', 'Restored') },
    { id: 'block', label: tx('Engellenen', 'Blocked') },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText size={24} className="text-mole-accent" /> {tx('Merkezi Log Merkezi', 'Central Logs Hub')}
          </h1>
          <p className="text-mole-text-muted mt-1">{tx('Uygulamadaki tum islemler, gecmis ve runtime kayitlari tek ekranda', 'All app operations, history, and runtime records in one screen')}</p>
        </div>
        <button
          onClick={() => void refreshAll()}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-mole-border hover:bg-mole-bg text-sm"
        >
          <RefreshCw size={14} /> {tx('Yenile', 'Refresh')}
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-4 gap-3">
          <StatCard label={tx('Toplam Aktivite', 'Total Activity')} value={stats.totalEntries || 0} />
          <StatCard label={tx('Bugun', 'Today')} value={stats.todayEntries || 0} color="text-mole-accent" />
          <StatCard label={tx('Operasyon Logu', 'Operation Logs')} value={operationLogs.length} color="text-mole-safe" />
          <StatCard label={tx('Runtime Logu', 'Runtime Logs')} value={runtimeLogs.length} color="text-mole-warning" />
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <TabButton active={tab === 'activity'} onClick={() => setTab('activity')} label={tx('Aktivite Gecmisi', 'Activity History')} icon={<Activity size={12} />} />
        <TabButton active={tab === 'operations'} onClick={() => setTab('operations')} label={tx('Operasyon Loglari', 'Operation Logs')} icon={<Calendar size={12} />} />
        <TabButton active={tab === 'runtime'} onClick={() => setTab('runtime')} label={tx('Runtime Loglari', 'Runtime Logs')} icon={<TerminalSquare size={12} />} />
      </div>

      {tab === 'activity' && (
        <>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-mole-text-muted" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder={tx('Dosya, yol, detay ara...', 'Search by file, path, detail...')}
                className="w-full bg-mole-surface border border-mole-border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-mole-accent"
              />
            </div>
            <button onClick={handleSearch} className="px-4 py-2 bg-mole-accent rounded-lg text-sm font-medium hover:bg-mole-accent-hover transition-colors">
              {tx('Ara', 'Search')}
            </button>
          </div>

          <div className="flex gap-1 flex-wrap items-center">
            {filters.map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs transition-colors ${
                  filter === f.id ? 'bg-mole-accent text-white' : 'bg-mole-surface border border-mole-border text-mole-text-muted hover:text-mole-text'
                }`}
              >
                <Filter size={10} /> {f.label}
              </button>
            ))}
            {entries.length > 0 && (
              <button
                onClick={() => {
                  const text = entries.map(e => `[${new Date(e.timestamp).toLocaleString()}] [${e.action}] ${e.target} - ${e.details} (${e.status})`).join('\n')
                  copy(text, 'all-activity')
                }}
                className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded text-xs bg-mole-surface border border-mole-border text-mole-text-muted hover:text-mole-text transition-colors"
              >
                {copiedId === 'all-activity' ? <Check size={10} className="text-mole-safe" /> : <Copy size={10} />}
                {copiedId === 'all-activity' ? tx('Kopyalandi', 'Copied') : tx('Tumunu Kopyala', 'Copy All')}
              </button>
            )}
          </div>

          {entries.length > 0 ? (
            <div className="space-y-1.5 max-h-[460px] overflow-y-auto">
              {entries.map((entry, i) => {
                const cfg = actionConfig[entry.action] || { label: entry.action, icon: FileText, color: 'text-mole-text-muted' }
                const Icon = cfg.icon
                return (
                  <div key={i} className="group flex items-start gap-3 p-3 bg-mole-surface rounded-lg border border-mole-border">
                    <Icon size={16} className={`${cfg.color} shrink-0 mt-0.5`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${entry.status === 'success' ? 'bg-mole-safe/20 text-mole-safe' : 'bg-mole-danger/20 text-mole-danger'}`}>
                          {entry.status}
                        </span>
                      </div>
                      <p className="text-sm mt-0.5 truncate">{entry.target}</p>
                      <p className="text-xs text-mole-text-muted mt-0.5">{entry.details}</p>
                    </div>
                    <div className="flex items-start gap-2 shrink-0">
                      <button
                        onClick={() => copy(`[${new Date(entry.timestamp).toLocaleString()}] [${entry.action}] ${entry.target} - ${entry.details} (${entry.status})`, `entry-${i}`)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-mole-bg transition-all"
                        title={tx('Kopyala', 'Copy')}
                      >
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
            <EmptyBox loading={loading} text={tx('Aktivite kaydi yok', 'No activity records')} />
          )}
        </>
      )}

      {tab === 'operations' && (
        <>
          <div className="flex items-center gap-2">
            <select
              value={operationDate}
              onChange={(e) => setOperationDate(e.target.value)}
              className="bg-mole-surface border border-mole-border rounded px-3 py-2 text-sm"
            >
              {operationDates.length === 0 && <option value="">{tx('Kayit yok', 'No dates')}</option>}
              {operationDates.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <button
              onClick={() => void fetchOperations(operationDate)}
              className="px-3 py-2 rounded-lg border border-mole-border hover:bg-mole-bg text-sm"
            >
              {tx('Yukle', 'Load')}
            </button>
          </div>

          {operationLogs.length > 0 ? (
            <div className="space-y-1.5 max-h-[460px] overflow-y-auto">
              {operationLogs.slice().reverse().map((log, i) => (
                <div key={i} className="bg-mole-surface border border-mole-border rounded-lg p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-mole-accent uppercase">{log.action}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        log.status === 'success' ? 'bg-mole-safe/20 text-mole-safe' :
                        log.status === 'partial' ? 'bg-mole-warning/20 text-mole-warning' :
                        'bg-mole-danger/20 text-mole-danger'
                      }`}>{log.status}</span>
                    </div>
                    <span className="text-[11px] text-mole-text-muted">{new Date(log.timestamp).toLocaleString()}</span>
                  </div>
                  <p className="text-sm mt-1">{log.category}</p>
                  <p className="text-xs text-mole-text-muted mt-1">
                    {tx('Ogeler', 'Items')}: {log.itemCount} | {tx('Bosalan Alan', 'Freed Space')}: {formatBytes(log.sizeFreed)}
                  </p>
                  {log.details && <p className="text-xs text-mole-text-muted mt-1">{log.details}</p>}
                </div>
              ))}
            </div>
          ) : (
            <EmptyBox loading={operationsLoading} text={tx('Operasyon logu yok', 'No operation logs')} />
          )}
        </>
      )}

      {tab === 'runtime' && (
        <>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-mole-text-muted" />
              <input
                value={runtimeQuery}
                onChange={(e) => setRuntimeQuery(e.target.value)}
                placeholder={tx('Runtime loglarda ara...', 'Search runtime logs...')}
                className="w-full bg-mole-surface border border-mole-border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-mole-accent"
              />
            </div>
            <button onClick={() => setRuntimeQuery('')} className="px-3 py-2 border border-mole-border rounded text-sm hover:bg-mole-bg">
              {tx('Temizle', 'Clear')}
            </button>
          </div>

          {runtimeFiltered.length > 0 ? (
            <div className="bg-mole-surface rounded-lg border border-mole-border max-h-[500px] overflow-y-auto p-2 font-mono text-xs space-y-1">
              {runtimeFiltered.map((line, i) => (
                <div key={i} className="px-2 py-1 rounded hover:bg-mole-bg/60 flex gap-2">
                  <span className="text-mole-text-muted shrink-0">{line.timestamp || '--'}</span>
                  <span className={`shrink-0 uppercase ${runtimeLevelColor(line.level)}`}>{line.level}</span>
                  <span className="text-mole-accent shrink-0">[{line.source}]</span>
                  <span className="text-mole-text break-all">{line.message}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyBox loading={runtimeLoading} text={tx('Runtime log kaydi yok', 'No runtime logs')} />
          )}
        </>
      )}
    </div>
  )
}

function TabButton({ active, onClick, label, icon }: { active: boolean; onClick: () => void; label: string; icon: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs border transition-colors ${
        active ? 'bg-mole-accent text-white border-mole-accent' : 'bg-mole-surface border-mole-border text-mole-text-muted hover:text-mole-text'
      }`}
    >
      {icon} {label}
    </button>
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

function EmptyBox({ loading, text }: { loading: boolean; text: string }) {
  return (
    <div className="bg-mole-surface rounded-xl p-8 border border-mole-border text-center">
      <p className="text-mole-text-muted">{loading ? 'Yukleniyor...' : text}</p>
    </div>
  )
}

function formatBytes(bytes: number) {
  if (!bytes || bytes <= 0) return '0 B'
  if (bytes >= 1e9) return (bytes / 1e9).toFixed(2) + ' GB'
  if (bytes >= 1e6) return (bytes / 1e6).toFixed(1) + ' MB'
  if (bytes >= 1e3) return (bytes / 1e3).toFixed(0) + ' KB'
  return `${bytes} B`
}

function runtimeLevelColor(level: string) {
  if (level === 'error') return 'text-red-400'
  if (level === 'warn') return 'text-mole-warning'
  if (level === 'debug') return 'text-blue-400'
  return 'text-mole-safe'
}
