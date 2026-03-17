import { useState, useEffect } from 'react'
import { Cpu, RefreshCw, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'
import { useLang } from '../contexts/LangContext'

interface ProcessInfo {
  name: string
  pid: number
  parentPid: number
  path: string
  commandLine: string
  company: string
  memoryMB: number
  cpuPercent: number
  riskScore: number
  reasons: string[]
}

export default function Processes() {
  const { tx } = useLang()
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any>(null)
  const [filter, setFilter] = useState<'all' | 'flagged'>('flagged')
  const [selected, setSelected] = useState<ProcessInfo | null>(null)

  const fetch = async () => {
    setLoading(true)
    try {
      const r = await window.moleAPI.processMonitor()
      if (r.success) setData(r.data)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { fetch() }, [])

  const processes: ProcessInfo[] = data?.processes || []
  const filtered = filter === 'flagged' ? processes.filter(p => p.riskScore > 0) : processes

  const riskColor = (score: number) => {
    if (score >= 70) return 'text-red-400'
    if (score >= 50) return 'text-orange-400'
    if (score >= 25) return 'text-yellow-400'
    if (score > 0) return 'text-mole-warning'
    return 'text-mole-safe'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Cpu size={24} className="text-mole-accent" /> {tx('Süreç Izleme', 'Process Monitor')}
          </h1>
          <p className="text-mole-text-muted mt-1">{tx('Çalısan süreçleri analiz et ve süpheli davranısları tespit et', 'Analyze running processes and detect suspicious behavior')}</p>
        </div>
        <button onClick={fetch} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-mole-surface border border-mole-border rounded-lg text-sm hover:bg-mole-bg transition-colors">
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} {tx('Yenile', 'Refresh')}
        </button>
      </div>

      {data && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-mole-surface rounded-lg p-4 border border-mole-border">
              <p className="text-xs text-mole-text-muted">{tx('Toplam Süreç', 'Total Processes')}</p>
              <p className="text-xl font-bold mt-1">{data.totalProcesses}</p>
            </div>
            <div className="bg-mole-surface rounded-lg p-4 border border-mole-border">
              <p className="text-xs text-mole-text-muted">{tx('Isaretlenen', 'Flagged')}</p>
              <p className="text-xl font-bold text-mole-warning mt-1">{data.flaggedCount}</p>
            </div>
            <div className="bg-mole-surface rounded-lg p-4 border border-mole-border">
              <p className="text-xs text-mole-text-muted">{tx('Filtre', 'Filter')}</p>
              <div className="flex gap-1 mt-1">
                <button onClick={() => setFilter('flagged')}
                  className={`px-3 py-1 rounded text-xs ${filter === 'flagged' ? 'bg-mole-accent text-white' : 'bg-mole-bg text-mole-text-muted'}`}>
                  {tx('Süpheli', 'Suspicious')}
                </button>
                <button onClick={() => setFilter('all')}
                  className={`px-3 py-1 rounded text-xs ${filter === 'all' ? 'bg-mole-accent text-white' : 'bg-mole-bg text-mole-text-muted'}`}>
                  {tx('Tümü', 'All')}
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-1 space-y-1 max-h-[500px] overflow-y-auto">
              {filtered.map((p, i) => (
                <button key={i} onClick={() => setSelected(p)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                    selected?.pid === p.pid ? 'border-mole-accent bg-mole-accent/5' : 'border-mole-border bg-mole-surface hover:bg-mole-bg/50'
                  }`}>
                  {p.riskScore > 0 ? <AlertTriangle size={14} className={riskColor(p.riskScore)} /> : <CheckCircle2 size={14} className="text-mole-safe" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-mole-text-muted">PID: {p.pid} | {p.company || tx('Imzasız', 'Unsigned')}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-mole-text-muted">{p.memoryMB?.toFixed(0)} MB</p>
                    {p.riskScore > 0 && <p className={`text-sm font-bold ${riskColor(p.riskScore)}`}>{p.riskScore}</p>}
                  </div>
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="text-center py-8 text-mole-text-muted text-sm">
                  {filter === 'flagged' ? tx('Süpheli süreç bulunamadı', 'No suspicious processes found') : tx('Süreç bulunamadı', 'No processes found')}
                </div>
              )}
            </div>

            {selected && (
              <div className="w-80 bg-mole-surface rounded-xl p-5 border border-mole-border space-y-3 max-h-[500px] overflow-y-auto shrink-0">
                <p className="font-bold text-lg">{selected.name}</p>
                <div className="space-y-2 text-sm">
                  <Row label="PID" value={String(selected.pid)} />
                  <Row label="Parent PID" value={String(selected.parentPid)} />
                  <Row label={tx('Sirket', 'Company')} value={selected.company || tx('Bilinmiyor', 'Unknown')} />
                  <Row label={tx('Bellek', 'Memory')} value={`${selected.memoryMB?.toFixed(1)} MB`} />
                  <Row label={tx('Risk Skoru', 'Risk Score')} value={String(selected.riskScore)} className={riskColor(selected.riskScore)} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-mole-text-muted mb-1">{tx('Dosya Yolu', 'File Path')}</p>
                  <p className="text-xs font-mono text-mole-text-muted break-all bg-mole-bg rounded p-2">{selected.path || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-mole-text-muted mb-1">{tx('Komut Satırı', 'Command Line')}</p>
                  <p className="text-xs font-mono text-mole-text-muted break-all bg-mole-bg rounded p-2">{selected.commandLine || 'N/A'}</p>
                </div>
                {selected.reasons.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold mb-2">{tx('Uyarılar', 'Warnings')}</p>
                    {selected.reasons.map((r, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs mb-1">
                        <AlertTriangle size={12} className="text-mole-warning shrink-0 mt-0.5" />
                        <span>{r}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function Row({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-mole-text-muted">{label}</span>
      <span className={className || ''}>{value}</span>
    </div>
  )
}
