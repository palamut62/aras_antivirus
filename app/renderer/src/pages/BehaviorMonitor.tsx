import { useState } from 'react'
import { Activity, RefreshCw, Loader2, AlertTriangle } from 'lucide-react'
import { useLang } from '../contexts/LangContext'

export default function BehaviorMonitor() {
  const { tx } = useLang()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const scan = async () => {
    setLoading(true)
    const r = await window.moleAPI.behaviorScan?.()
    setResult(r)
    setLoading(false)
  }

  const findings = result?.data?.findings || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Activity size={24} className="text-mole-accent" /> {tx('Davranış Tabanlı Tespit', 'Behavior-Based Detection')}</h1>
        <p className="text-mole-text-muted mt-1">{tx('Şüpheli process spawn pattern\'leri, LOLBAS, Office→Shell, encoded PS', 'Suspicious process patterns, LOLBAS, Office→Shell, encoded PS')}</p>
      </div>

      <button onClick={scan} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-mole-accent rounded text-sm disabled:opacity-50">
        {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} {tx('Tara', 'Scan')}
      </button>

      {result?.success && (
        <p className="text-sm text-mole-text-muted">{result.data.total} {tx('process taranan', 'processes scanned')} · <span className={findings.length > 0 ? 'text-mole-danger font-bold' : 'text-mole-safe'}>{findings.length} {tx('şüpheli', 'flagged')}</span></p>
      )}

      <div className="space-y-2">
        {findings.map((f: any) => (
          <div key={f.pid} className="bg-mole-surface border border-mole-danger/30 rounded p-3">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-mole-danger" />
              <span className="font-medium">{f.name}</span>
              <span className="text-mole-text-muted text-xs">PID {f.pid}</span>
              <span className="ml-auto px-2 py-0.5 bg-mole-danger/20 text-mole-danger rounded text-xs font-bold">Risk {f.riskScore}</span>
            </div>
            {f.parentName && <p className="text-xs text-mole-text-muted mt-1">Parent: {f.parentName} (PID {f.parentPid})</p>}
            <p className="text-xs font-mono text-mole-text-muted mt-1 truncate">{f.commandLine}</p>
            <ul className="text-xs text-mole-danger mt-2 list-disc list-inside">
              {f.reasons.map((r: string, i: number) => <li key={i}>{r}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
