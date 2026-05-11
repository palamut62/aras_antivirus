import { useState } from 'react'
import { ShieldAlert, Loader2, ExternalLink } from 'lucide-react'
import { useLang } from '../contexts/LangContext'

interface Finding {
  app: string
  version: string
  publisher: string
  cveId: string
  summary: string
  severity: string
  published: string
  referenceUrl: string
}

export default function VulnScan() {
  const { tx } = useLang()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const scan = async () => {
    setLoading(true); setResult(null)
    try {
      const r = await window.moleAPI.vulnScan()
      setResult(r)
    } finally { setLoading(false) }
  }

  const findings: Finding[] = result?.data?.findings || []
  const byApp: Record<string, Finding[]> = {}
  findings.forEach(f => { (byApp[f.app] ||= []).push(f) })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><ShieldAlert size={24} className="text-mole-accent" /> {tx('Güvenlik Açığı Taraması', 'Vulnerability Scan')}</h1>
        <p className="text-mole-text-muted mt-1">{tx('Yüklü programları OSV.dev CVE veritabanı ile eşleştir', 'Match installed programs against OSV.dev CVE database')}</p>
      </div>

      <button onClick={scan} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-mole-accent rounded text-sm disabled:opacity-50">
        {loading ? <><Loader2 size={14} className="animate-spin" /> {tx('Taranıyor (1–3 dk)...', 'Scanning (1-3 min)...')}</> : tx('Taramaya Başla', 'Start Scan')}
      </button>

      {result?.success && (
        <div className="flex gap-4 text-sm">
          <span className="text-mole-text-muted">{tx('Taranan program', 'Apps scanned')}: {result.data?.appsScanned}</span>
          <span className={findings.length > 0 ? 'text-mole-danger font-bold' : 'text-mole-safe'}>
            {tx('Zafiyet', 'Vulnerabilities')}: {findings.length}
          </span>
        </div>
      )}

      {Object.entries(byApp).map(([app, vs]) => (
        <div key={app} className="bg-mole-surface border border-mole-danger/30 rounded p-3">
          <h3 className="font-semibold">{app} <span className="text-mole-text-muted text-sm">v{vs[0].version}</span></h3>
          <div className="mt-2 space-y-1">
            {vs.map((v, i) => (
              <div key={i} className="text-xs bg-mole-bg p-2 rounded flex items-start gap-2">
                <span className="font-mono text-mole-accent">{v.cveId}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-mole-text">{v.summary || '—'}</p>
                  {v.severity && <p className="text-mole-text-muted">Severity: {v.severity}</p>}
                </div>
                {v.referenceUrl && <a href={v.referenceUrl} target="_blank" rel="noreferrer" className="text-mole-accent"><ExternalLink size={12} /></a>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
