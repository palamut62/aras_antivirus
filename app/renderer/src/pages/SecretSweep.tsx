import { useState } from 'react'
import { KeyRound, FolderOpen, Loader2, AlertTriangle } from 'lucide-react'
import { useLang } from '../contexts/LangContext'

export default function SecretSweep() {
  const { tx } = useLang()
  const [roots, setRoots] = useState<string[]>([])
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<any>(null)

  const addRoot = async () => {
    const f = await window.moleAPI.pickFolder()
    if (f && !roots.includes(f)) setRoots([...roots, f])
  }

  const scan = async () => {
    setScanning(true); setResult(null)
    try {
      const r = await window.moleAPI.devSecretSweep(roots)
      setResult(r)
    } finally { setScanning(false) }
  }

  const findings = result?.data?.findings || []
  const grouped: Record<string, any[]> = {}
  findings.forEach((f: any) => { (grouped[f.pattern] ||= []).push(f) })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><KeyRound size={24} className="text-mole-accent" /> {tx('Çoklu-Repo Secret Tarama', 'Multi-Repo Secret Sweep')}</h1>
        <p className="text-mole-text-muted mt-1">{tx('Tüm projelerde API key, token, parola sızıntısı ara', 'Scan all projects for API keys, tokens, password leaks')}</p>
      </div>

      <div className="bg-mole-surface rounded p-4 border border-mole-border space-y-3">
        <button onClick={addRoot} className="flex items-center gap-1 px-3 py-1.5 bg-mole-accent rounded text-sm"><FolderOpen size={14} /> {tx('Kök ekle', 'Add root')}</button>
        <p className="text-xs text-mole-text-muted">{roots.length === 0 ? tx('Boş = varsayılan proje klasörleri', 'Empty = default project folders') : roots.join(' · ')}</p>
        <button onClick={scan} disabled={scanning} className="flex items-center gap-2 px-4 py-2 bg-mole-accent rounded text-sm disabled:opacity-50">
          {scanning ? <><Loader2 size={14} className="animate-spin" /> {tx('Taranıyor...', 'Scanning...')}</> : tx('Taramaya Başla', 'Start Scan')}
        </button>
      </div>

      {result?.success && (
        <div className="flex items-center gap-4 text-sm">
          <span className="text-mole-text-muted">{tx('Taranan dosya', 'Files scanned')}: {result.data?.filesScanned || 0}</span>
          <span className={findings.length > 0 ? 'text-mole-danger font-bold' : 'text-mole-safe'}>
            {tx('Bulgular', 'Findings')}: {findings.length}
          </span>
        </div>
      )}

      {Object.keys(grouped).map(pattern => (
        <div key={pattern} className="bg-mole-surface border border-mole-danger/30 rounded p-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-mole-danger" />
            <h3 className="font-semibold">{pattern}</h3>
            <span className="text-xs text-mole-text-muted">({grouped[pattern].length})</span>
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {grouped[pattern].map((f: any, i: number) => (
              <div key={i} className="text-xs font-mono bg-mole-bg p-2 rounded">
                <p className="truncate text-mole-accent">{f.file}:{f.line}</p>
                <p className="text-mole-text-muted truncate">{f.snippet}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
