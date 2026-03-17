import { useState, useEffect } from 'react'
import { Bug, Search, Filter, Trash2, Shield, AlertTriangle, XCircle, CheckCircle2 } from 'lucide-react'
import { useLang } from '../contexts/LangContext'

type ThreatFilter = 'all' | 'virus' | 'trojan' | 'malware' | 'adware' | 'spyware' | 'ransomware' | 'pup'

export default function Threats() {
  const { tx } = useLang()
  const [filter, setFilter] = useState<ThreatFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [threats, setThreats] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<any>(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [statsData, listData] = await Promise.all([
        window.moleAPI.threatStats(),
        filter === 'all'
          ? searchQuery
            ? window.moleAPI.threatSearch(searchQuery)
            : window.moleAPI.threatList(200)
          : window.moleAPI.threatByType(filter)
      ])
      setStats(statsData)
      setThreats(listData || [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [filter])

  const handleSearch = () => fetchData()

  const severityColor = (s: string) => {
    if (s === 'critical') return 'text-red-500 bg-red-500/10'
    if (s === 'high') return 'text-red-400 bg-red-400/10'
    if (s === 'medium') return 'text-orange-400 bg-orange-400/10'
    return 'text-yellow-400 bg-yellow-400/10'
  }

  const severityIcon = (s: string) => {
    if (s === 'critical' || s === 'high') return <XCircle size={14} className="text-red-400" />
    if (s === 'medium') return <AlertTriangle size={14} className="text-orange-400" />
    return <Shield size={14} className="text-yellow-400" />
  }

  const typeLabel = (t: string) => {
    const map: Record<string, string> = {
      virus: 'Virus', trojan: 'Trojan', malware: 'Malware', adware: 'Adware',
      spyware: 'Spyware', ransomware: 'Ransomware', pup: 'PUP', unknown: tx('Bilinmeyen', 'Unknown'),
    }
    return map[t] || t
  }

  const actionLabel = (a: string) => {
    const map: Record<string, string> = {
      quarantined: tx('Karantina', 'Quarantined'),
      deleted: tx('Silindi', 'Deleted'),
      ignored: tx('Yok Sayıldı', 'Ignored'),
      detected: tx('Tespit Edildi', 'Detected'),
    }
    return map[a] || a
  }

  const actionColor = (a: string) => {
    if (a === 'quarantined') return 'bg-mole-warning/20 text-mole-warning'
    if (a === 'deleted') return 'bg-red-400/20 text-red-400'
    if (a === 'detected') return 'bg-mole-accent/20 text-mole-accent'
    return 'bg-mole-text-muted/20 text-mole-text-muted'
  }

  const handleAction = async (id: string, action: string) => {
    await window.moleAPI.threatUpdateAction(id, action)
    fetchData()
    if (selected?.id === id) setSelected(null)
  }

  const handleDelete = async (id: string) => {
    await window.moleAPI.threatDelete(id)
    fetchData()
    if (selected?.id === id) setSelected(null)
  }

  const filters: { id: ThreatFilter; label: string }[] = [
    { id: 'all', label: tx('Tümü', 'All') },
    { id: 'virus', label: 'Virus' },
    { id: 'trojan', label: 'Trojan' },
    { id: 'malware', label: 'Malware' },
    { id: 'adware', label: 'Adware' },
    { id: 'spyware', label: 'Spyware' },
    { id: 'ransomware', label: 'Ransomware' },
    { id: 'pup', label: 'PUP' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bug size={24} className="text-mole-danger" /> {tx('Tehdit Veritabanı', 'Threat Database')}
        </h1>
        <p className="text-mole-text-muted mt-1">{tx('Tespit edilen tüm zararlı dosyalar ve virüsler', 'All detected malware, viruses and threats')}</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-5 gap-3">
          <StatCard label={tx('Toplam Tehdit', 'Total Threats')} value={stats.total} />
          <StatCard label={tx('Bugün', 'Today')} value={stats.today} color="text-mole-accent" />
          <StatCard label={tx('Karantina', 'Quarantined')} value={stats.quarantined} color="text-mole-warning" />
          <StatCard label={tx('Silinen', 'Deleted')} value={stats.deleted} color="text-red-400" />
          <StatCard label="Virus" value={stats.byType?.virus || 0} color="text-red-500" />
        </div>
      )}

      {/* Type breakdown */}
      {stats?.byType && (
        <div className="grid grid-cols-8 gap-2">
          {Object.entries(stats.byType).map(([type, count]) => (
            <div key={type} className="bg-mole-surface rounded-lg p-2 border border-mole-border text-center">
              <p className="text-[10px] text-mole-text-muted uppercase">{typeLabel(type)}</p>
              <p className="text-lg font-bold">{count as number}</p>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-mole-text-muted" />
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder={tx('Dosya adı, SHA-256, tehdit adı ara...', 'Search by filename, SHA-256, threat name...')}
            className="w-full bg-mole-surface border border-mole-border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-mole-accent" />
        </div>
        <button onClick={handleSearch}
          className="px-4 py-2 bg-mole-accent rounded-lg text-sm font-medium hover:bg-mole-accent-hover transition-colors">
          {tx('Ara', 'Search')}
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 flex-wrap">
        {filters.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs transition-colors ${
              filter === f.id ? 'bg-mole-accent text-white' : 'bg-mole-surface border border-mole-border text-mole-text-muted hover:text-mole-text'
            }`}>
            <Filter size={10} /> {f.label}
          </button>
        ))}
      </div>

      {/* Threat list */}
      {threats.length > 0 ? (
        <div className="flex gap-4">
          <div className="flex-1 space-y-1.5 max-h-[450px] overflow-y-auto">
            {threats.map((t) => (
              <button key={t.id} onClick={() => setSelected(t)}
                className={`w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-colors ${
                  selected?.id === t.id ? 'border-mole-accent bg-mole-accent/5' : 'bg-mole-surface border-mole-border hover:bg-mole-bg/50'
                }`}>
                {severityIcon(t.severity)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-red-400">{typeLabel(t.threatType)}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${actionColor(t.action)}`}>{actionLabel(t.action)}</span>
                  </div>
                  <p className="text-sm mt-0.5 truncate font-medium">{t.fileName}</p>
                  <p className="text-xs text-mole-text-muted truncate">{t.threatName}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[11px] text-mole-text-muted">{new Date(t.timestamp).toLocaleDateString()}</p>
                  <p className="text-xs font-bold text-mole-warning">Risk: {t.riskScore}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Detail panel */}
          {selected && (
            <div className="w-80 bg-mole-surface rounded-xl p-5 border border-mole-border space-y-3 max-h-[450px] overflow-y-auto shrink-0">
              <div>
                <p className="font-bold">{selected.fileName}</p>
                <p className="text-xs text-mole-text-muted break-all mt-1">{selected.filePath}</p>
              </div>
              <div className="space-y-2 text-sm">
                <Row label={tx('Tür', 'Type')} value={typeLabel(selected.threatType)} />
                <Row label={tx('Tehdit Adı', 'Threat Name')} value={selected.threatName} />
                <Row label={tx('Seviye', 'Severity')} value={<span className={`px-2 py-0.5 rounded text-xs ${severityColor(selected.severity)}`}>{selected.severity}</span>} />
                <Row label={tx('Risk Skoru', 'Risk Score')} value={selected.riskScore} />
                <Row label={tx('Durum', 'Status')} value={<span className={`px-2 py-0.5 rounded text-xs ${actionColor(selected.action)}`}>{actionLabel(selected.action)}</span>} />
                <Row label={tx('Kaynak', 'Source')} value={selected.source} />
                {selected.entropy && <Row label="Entropy" value={selected.entropy.toFixed(2)} />}
                {selected.sizeBytes && <Row label={tx('Boyut', 'Size')} value={formatBytes(selected.sizeBytes)} />}
                <Row label={tx('Tarih', 'Date')} value={new Date(selected.timestamp).toLocaleString()} />
              </div>
              {selected.sha256 && (
                <div>
                  <p className="text-xs font-semibold text-mole-text-muted mb-1">SHA-256</p>
                  <p className="text-[10px] font-mono text-mole-text-muted break-all bg-mole-bg rounded p-2">{selected.sha256}</p>
                </div>
              )}
              {selected.details && (
                <div>
                  <p className="text-xs font-semibold mb-1">{tx('Detaylar', 'Details')}</p>
                  <p className="text-xs text-mole-text-muted">{selected.details}</p>
                </div>
              )}
              {selected.heuristicMatches?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold mb-1">{tx('Heuristic Eşleşmeler', 'Heuristic Matches')}</p>
                  <div className="space-y-1">
                    {selected.heuristicMatches.map((m: string, i: number) => (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        <AlertTriangle size={10} className="text-mole-warning shrink-0 mt-0.5" />
                        <span>{m}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                {selected.action === 'detected' && (
                  <button onClick={() => handleAction(selected.id, 'quarantined')}
                    className="flex-1 py-2 bg-mole-warning/20 text-mole-warning rounded-lg text-xs font-medium hover:bg-mole-warning/30 transition-colors">
                    {tx('Karantina', 'Quarantine')}
                  </button>
                )}
                <button onClick={() => handleDelete(selected.id)}
                  className="flex-1 py-2 bg-red-400/20 text-red-400 rounded-lg text-xs font-medium hover:bg-red-400/30 transition-colors flex items-center justify-center gap-1">
                  <Trash2 size={12} /> {tx('Kayıt Sil', 'Delete Record')}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-mole-surface rounded-xl p-8 border border-mole-border text-center">
          {loading ? (
            <p className="text-mole-text-muted">{tx('Yükleniyor...', 'Loading...')}</p>
          ) : (
            <>
              <CheckCircle2 size={48} className="text-mole-safe mx-auto mb-4" />
              <p className="text-mole-safe font-semibold">{tx('Tehdit kaydı bulunamadı', 'No threat records found')}</p>
              <p className="text-sm text-mole-text-muted mt-1">{tx('Güvenlik taraması yaparak tehditleri tespit edebilirsiniz', 'Run a security scan to detect threats')}</p>
            </>
          )}
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

function Row({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-mole-text-muted text-xs">{label}</span>
      <span className="text-xs font-medium">{value}</span>
    </div>
  )
}

function formatBytes(bytes: number) {
  if (bytes >= 1e9) return (bytes / 1e9).toFixed(2) + ' GB'
  if (bytes >= 1e6) return (bytes / 1e6).toFixed(1) + ' MB'
  if (bytes >= 1e3) return (bytes / 1e3).toFixed(0) + ' KB'
  return bytes + ' B'
}
