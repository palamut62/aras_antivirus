import { useState, useEffect } from 'react'
import { Wifi, RefreshCw, Loader2, AlertTriangle, CheckCircle2, Globe, Server, Ban, Skull, Unlock, ShieldOff, Shield } from 'lucide-react'
import { useLang } from '../contexts/LangContext'

type ViewTab = 'suspicious' | 'all' | 'dns' | 'blocked'

export default function NetworkMonitor() {
  const { tx } = useLang()
  const [activeTab, setActiveTab] = useState<ViewTab>('suspicious')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [manualIP, setManualIP] = useState('')
  const [manualBlockMsg, setManualBlockMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  const actionMap: Record<string, string> = {
    suspicious: 'suspicious-connections',
    all: 'active-connections',
    dns: 'dns-cache',
    blocked: 'blocked-list',
  }

  const fetchData = async (tab?: ViewTab) => {
    const t = tab || activeTab
    setLoading(true)
    setData(null)
    try {
      const r = await window.moleAPI.networkMonitor(actionMap[t])
      if (r.success) setData(r.data)
    } catch {}
    setLoading(false)
  }

  // Auto-refresh every 15s when enabled
  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(() => fetchData(), 15000)
    return () => clearInterval(interval)
  }, [autoRefresh, activeTab])

  // Auto-fetch on first load
  useEffect(() => { fetchData() }, [])

  const blockIP = async (remoteAddress: string) => {
    setActionLoading(`block-${remoteAddress}`)
    try {
      const r = await window.moleAPI.networkMonitor('block-ip', remoteAddress)
      if (r.success) {
        // Refresh
        await fetchData()
      }
    } catch {}
    setActionLoading(null)
  }

  const killConnection = async (remoteAddress: string, pid?: number) => {
    setActionLoading(`kill-${remoteAddress}-${pid}`)
    try {
      await window.moleAPI.networkMonitor('kill-connection', remoteAddress, pid || 0)
      await fetchData()
    } catch {}
    setActionLoading(null)
  }

  const unblockIP = async (ruleName: string) => {
    setActionLoading(`unblock-${ruleName}`)
    try {
      await window.moleAPI.networkMonitor('unblock-ip', undefined, 0, ruleName)
      await fetchData('blocked')
    } catch {}
    setActionLoading(null)
  }

  const handleManualBlock = async () => {
    const ip = manualIP.trim()
    if (!ip) return
    setActionLoading('manual-block')
    setManualBlockMsg(null)
    try {
      const r = await window.moleAPI.networkMonitor('block-ip', ip)
      if (r.success) {
        setManualBlockMsg({ text: `${ip} ${tx('engellendi', 'blocked')}`, type: 'success' })
        setManualIP('')
        if (activeTab === 'blocked') await fetchData('blocked')
      } else {
        setManualBlockMsg({ text: r.error || tx('Engelleme basarisiz', 'Block failed'), type: 'error' })
      }
    } catch {
      setManualBlockMsg({ text: tx('Engelleme basarisiz', 'Block failed'), type: 'error' })
    }
    setActionLoading(null)
  }

  const riskColor = (score: number) => {
    if (score >= 50) return 'text-red-400'
    if (score >= 25) return 'text-yellow-400'
    return 'text-mole-text-muted'
  }

  const riskBg = (score: number) => {
    if (score >= 50) return 'bg-red-500/5 border-red-500/20'
    if (score >= 25) return 'bg-yellow-500/5 border-yellow-500/20'
    return 'bg-mole-surface border-mole-border'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wifi size={24} className="text-mole-accent" /> {tx('Ag Izleme', 'Network Monitor')}
          </h1>
          <p className="text-mole-text-muted mt-1">{tx('Ag bağlantılarını izle, şüphelileri engelle', 'Monitor network connections, block suspicious ones')}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Auto-refresh toggle */}
          <button onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors border ${
              autoRefresh ? 'bg-mole-safe/10 border-mole-safe/30 text-mole-safe' : 'bg-mole-surface border-mole-border text-mole-text-muted hover:text-mole-text'
            }`}>
            {autoRefresh ? <Shield size={12} /> : <ShieldOff size={12} />}
            {autoRefresh ? tx('Canlı', 'Live') : tx('Canlı Izleme', 'Live Monitor')}
          </button>
          <button onClick={() => fetchData()} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-mole-surface border border-mole-border rounded-lg text-sm hover:bg-mole-bg transition-colors">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} {tx('Tara', 'Scan')}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-mole-surface rounded-lg p-1 w-fit border border-mole-border">
        {([
          { id: 'suspicious' as ViewTab, label: tx('Süpheli', 'Suspicious'), icon: AlertTriangle },
          { id: 'all' as ViewTab, label: tx('Tüm Bağlantılar', 'All Connections'), icon: Server },
          { id: 'dns' as ViewTab, label: 'DNS Cache', icon: Globe },
          { id: 'blocked' as ViewTab, label: tx('Engellenenler', 'Blocked'), icon: Ban },
        ]).map(tab => (
          <button key={tab.id} onClick={() => { setActiveTab(tab.id); setData(null); fetchData(tab.id) }}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded text-sm transition-colors ${
              activeTab === tab.id ? 'bg-mole-accent text-white' : 'text-mole-text-muted hover:text-mole-text'
            }`}>
            <tab.icon size={14} /> {tab.label}
          </button>
        ))}
      </div>

      {/* Manual IP Block */}
      <div className="flex gap-2 items-center">
        <input type="text" value={manualIP} onChange={e => setManualIP(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleManualBlock()}
          placeholder={tx('IP adresi gir (orn: 192.168.1.100)', 'Enter IP address (e.g. 192.168.1.100)')}
          className="flex-1 px-4 py-2.5 bg-mole-surface border border-mole-border rounded-lg text-sm focus:outline-none focus:border-mole-accent" />
        <button onClick={handleManualBlock} disabled={!manualIP.trim() || actionLoading === 'manual-block'}
          className="flex items-center gap-2 px-5 py-2.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
          {actionLoading === 'manual-block' ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />}
          {tx('IP Engelle', 'Block IP')}
        </button>
      </div>
      {manualBlockMsg && (
        <div className={`p-2.5 rounded-lg border text-sm ${manualBlockMsg.type === 'success' ? 'bg-mole-safe/10 border-mole-safe/30 text-mole-safe' : 'bg-mole-danger/10 border-mole-danger/30 text-mole-danger'}`}>
          {manualBlockMsg.text}
        </div>
      )}

      {/* Stats */}
      {data && activeTab !== 'blocked' && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-mole-surface rounded-lg p-4 border border-mole-border">
            <p className="text-xs text-mole-text-muted">{tx('Toplam', 'Total')}</p>
            <p className="text-xl font-bold mt-1">{data.totalConnections || data.totalEntries || 0}</p>
          </div>
          <div className="bg-mole-surface rounded-lg p-4 border border-mole-border">
            <p className="text-xs text-mole-text-muted">{tx('Isaretlenen', 'Flagged')}</p>
            <p className={`text-xl font-bold mt-1 ${(data.flaggedCount || 0) > 0 ? 'text-red-400' : 'text-mole-safe'}`}>
              {data.flaggedCount || 0}
            </p>
          </div>
          <div className="bg-mole-surface rounded-lg p-4 border border-mole-border">
            <p className="text-xs text-mole-text-muted">{tx('Durum', 'Status')}</p>
            <p className="text-sm font-medium mt-1 flex items-center gap-1.5">
              {autoRefresh && <span className="w-2 h-2 rounded-full bg-mole-safe animate-pulse" />}
              {autoRefresh ? tx('Canlı Izleniyor', 'Live Monitoring') : tx('Manuel', 'Manual')}
            </p>
          </div>
        </div>
      )}

      {/* Blocked list */}
      {activeTab === 'blocked' && data && (
        <>
          <div className="bg-mole-surface rounded-lg p-4 border border-mole-border">
            <p className="text-xs text-mole-text-muted">{tx('Engellenen IP Sayısı', 'Blocked IP Count')}</p>
            <p className="text-xl font-bold mt-1">{data.count || 0}</p>
          </div>
          {data.rules?.length > 0 ? (
            <div className="space-y-1.5 max-h-[450px] overflow-y-auto">
              {data.rules.map((rule: any, i: number) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-mole-surface rounded-lg border border-mole-border">
                  <Ban size={14} className="text-red-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{rule.remoteAddress}</p>
                    <p className="text-xs text-mole-text-muted">{rule.ruleName}</p>
                  </div>
                  <button onClick={() => unblockIP(rule.ruleName)}
                    disabled={actionLoading === `unblock-${rule.ruleName}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-mole-safe/10 text-mole-safe rounded-lg text-xs font-medium hover:bg-mole-safe/20 transition-colors disabled:opacity-50">
                    {actionLoading === `unblock-${rule.ruleName}`
                      ? <Loader2 size={12} className="animate-spin" />
                      : <Unlock size={12} />}
                    {tx('Engeli Kaldır', 'Unblock')}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-mole-surface rounded-xl p-8 border border-mole-border text-center">
              <CheckCircle2 size={40} className="text-mole-safe mx-auto mb-3" />
              <p className="text-mole-text-muted">{tx('Engellenen IP yok', 'No blocked IPs')}</p>
            </div>
          )}
        </>
      )}

      {/* Connection list */}
      {data?.connections && activeTab !== 'blocked' && (
        <div className="space-y-1.5 max-h-[450px] overflow-y-auto">
          {data.connections.map((conn: any, i: number) => (
            <div key={i} className={`flex items-center gap-3 p-3 rounded-lg border ${riskBg(conn.riskScore || 0)}`}>
              {(conn.riskScore || 0) > 0
                ? <AlertTriangle size={14} className={riskColor(conn.riskScore)} />
                : activeTab === 'dns'
                  ? <Globe size={14} className="text-mole-text-muted" />
                  : <CheckCircle2 size={14} className="text-mole-safe" />}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{conn.processName || conn.domain || conn.name || 'N/A'}</p>
                  {conn.pid && <span className="text-[10px] text-mole-text-muted">PID:{conn.pid}</span>}
                  {conn.type && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      conn.type === 'dns' ? 'bg-blue-500/20 text-blue-400' : 'bg-mole-accent/20 text-mole-accent'
                    }`}>{conn.type === 'dns' ? 'DNS' : 'TCP'}</span>
                  )}
                </div>
                <p className="text-xs text-mole-text-muted mt-0.5">
                  {conn.localAddress && `${conn.localAddress}:${conn.localPort}`}
                  {conn.remoteAddress && ` → ${conn.remoteAddress}:${conn.remotePort}`}
                  {conn.domain && !conn.remoteAddress && conn.domain}
                </p>
                {conn.reason && <p className="text-xs text-mole-warning mt-0.5">{conn.reason}</p>}
                {Array.isArray(conn.reasons) && conn.reasons.map((r: string, j: number) => (
                  <p key={j} className="text-xs text-mole-warning mt-0.5">{r}</p>
                ))}
                {typeof conn.reasons === 'string' && conn.reasons && (
                  <p className="text-xs text-mole-warning mt-0.5">{conn.reasons}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {conn.state && <span className="text-xs text-mole-text-muted">{conn.state}</span>}
                {(conn.riskScore || 0) > 0 && (
                  <span className={`text-sm font-bold ${riskColor(conn.riskScore)}`}>{conn.riskScore}</span>
                )}
                {/* Action buttons for all connections with remote address */}
                {conn.remoteAddress && (
                  <div className="flex gap-1 ml-1">
                    <button onClick={() => killConnection(conn.remoteAddress, conn.pid)}
                      disabled={actionLoading === `kill-${conn.remoteAddress}-${conn.pid}`}
                      title={tx('Bağlantıyı Kes (Process\'i Öldür)', 'Kill Connection (Kill Process)')}
                      className="p-1.5 bg-yellow-500/10 text-yellow-400 rounded hover:bg-yellow-500/20 transition-colors disabled:opacity-50">
                      {actionLoading === `kill-${conn.remoteAddress}-${conn.pid}`
                        ? <Loader2 size={12} className="animate-spin" />
                        : <Skull size={12} />}
                    </button>
                    <button onClick={() => blockIP(conn.remoteAddress)}
                      disabled={actionLoading === `block-${conn.remoteAddress}`}
                      title={tx('IP\'yi Engelle (Firewall Kuralı)', 'Block IP (Firewall Rule)')}
                      className="p-1.5 bg-red-500/10 text-red-400 rounded hover:bg-red-500/20 transition-colors disabled:opacity-50">
                      {actionLoading === `block-${conn.remoteAddress}`
                        ? <Loader2 size={12} className="animate-spin" />
                        : <Ban size={12} />}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DNS entries (kept separate for non-connection format) */}
      {data?.entries && activeTab === 'dns' && (
        <div className="space-y-1.5 max-h-[450px] overflow-y-auto">
          {data.entries.map((entry: any, i: number) => (
            <div key={i} className={`flex items-center gap-3 p-3 rounded-lg border ${riskBg(entry.riskScore || 0)}`}>
              {(entry.riskScore || 0) > 0
                ? <AlertTriangle size={14} className={riskColor(entry.riskScore)} />
                : <Globe size={14} className="text-mole-text-muted" />}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{entry.domain || entry.name}</p>
                {entry.ipAddress && <p className="text-xs text-mole-text-muted">{entry.ipAddress}</p>}
                {entry.reason && <p className="text-xs text-mole-warning mt-0.5">{entry.reason}</p>}
                {Array.isArray(entry.reasons) && entry.reasons.map((r: string, j: number) => (
                  <p key={j} className="text-xs text-mole-warning mt-0.5">{r}</p>
                ))}
                {typeof entry.reasons === 'string' && entry.reasons && (
                  <p className="text-xs text-mole-warning mt-0.5">{entry.reasons}</p>
                )}
              </div>
              {(entry.riskScore || 0) > 0 && (
                <span className={`text-sm font-bold ${riskColor(entry.riskScore)}`}>{entry.riskScore}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {!data && !loading && (
        <div className="bg-mole-surface rounded-xl p-8 border border-mole-border text-center">
          <Wifi size={48} className="text-mole-text-muted mx-auto mb-4" />
          <p className="text-mole-text-muted">{tx('Tarama baslatmak için yukardaki "Tara" butonuna tıkla', 'Click the "Scan" button above to start scanning')}</p>
        </div>
      )}
    </div>
  )
}
