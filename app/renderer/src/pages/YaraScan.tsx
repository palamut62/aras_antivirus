import { useState, useEffect } from 'react'
import { ScanSearch, FolderOpen, Loader2, AlertTriangle, RefreshCw } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import { useLang } from '../contexts/LangContext'

interface Match {
  file: string
  rule: string
  severity: string
  description: string
  matched_strings: number
  size_bytes: number
}

const sevColor: Record<string, string> = {
  critical: 'text-mole-danger',
  high: 'text-mole-danger',
  medium: 'text-yellow-400',
  low: 'text-mole-text-muted',
}

export default function YaraScan() {
  const { tx } = useLang()
  const [target, setTarget] = useState('')
  const [maxMb, setMaxMb] = useState(50)
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [ruleCount, setRuleCount] = useState(0)

  useEffect(() => {
    invoke<number>('yara_rule_count').then(setRuleCount).catch(() => {})
  }, [])

  const pick = async () => {
    const f = await window.moleAPI.pickFolder()
    if (f) setTarget(f)
  }

  const reload = async () => {
    try {
      const n = await invoke<number>('yara_reload')
      setRuleCount(n)
    } catch {}
  }

  const scan = async () => {
    if (!target) return
    setScanning(true); setResult(null)
    try {
      const r = await invoke('yara_scan', { target, maxFileMb: maxMb })
      setResult({ success: true, data: r })
    } catch (e: any) {
      setResult({ success: false, error: String(e) })
    } finally { setScanning(false) }
  }

  const matches: Match[] = result?.data?.matches || []
  const byRule: Record<string, Match[]> = {}
  matches.forEach(m => { (byRule[m.rule] ||= []).push(m) })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><ScanSearch size={24} className="text-mole-accent" /> {tx('YARA Kural Taraması', 'YARA Rule Scan')}</h1>
        <p className="text-mole-text-muted mt-1">{tx('Klasör içeriğini YARA kuralları ile tara (10 bundled rule + kullanıcı .yar dosyaları)', 'Scan folder contents with YARA rules (10 bundled + user .yar files)')}</p>
      </div>

      <div className="bg-mole-surface border border-mole-border rounded p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm text-mole-text-muted">
          <span>{tx('Yüklü kural', 'Rules loaded')}: <span className="text-mole-accent font-bold">{ruleCount}</span></span>
          <button onClick={reload} className="ml-2 flex items-center gap-1 text-xs hover:text-mole-text"><RefreshCw size={12} /> {tx('Yeniden yükle', 'Reload')}</button>
        </div>
        <div className="flex gap-2">
          <input value={target} onChange={e => setTarget(e.target.value)} placeholder={tx('Klasör veya dosya yolu', 'Folder or file path')}
            className="flex-1 bg-mole-bg border border-mole-border rounded px-3 py-2 text-sm" />
          <button onClick={pick} className="px-3 py-2 bg-mole-accent rounded text-sm"><FolderOpen size={14} /></button>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <label className="text-mole-text-muted">{tx('Maks dosya boyutu (MB)', 'Max file size (MB)')}</label>
          <input type="number" value={maxMb} onChange={e => setMaxMb(parseInt(e.target.value) || 50)}
            className="bg-mole-bg border border-mole-border rounded px-2 py-1 w-20" />
        </div>
        <button onClick={scan} disabled={scanning || !target}
          className="flex items-center gap-2 px-4 py-2 bg-mole-accent rounded text-sm disabled:opacity-50">
          {scanning ? <><Loader2 size={14} className="animate-spin" /> {tx('Taranıyor...', 'Scanning...')}</> : tx('Taramaya Başla', 'Start Scan')}
        </button>
      </div>

      {result?.success && (
        <div className="flex items-center gap-4 text-sm">
          <span className="text-mole-text-muted">{tx('Dosya', 'Files')}: {result.data?.files_scanned}</span>
          <span className="text-mole-text-muted">{(result.data?.bytes_scanned / 1e6).toFixed(1)} MB</span>
          <span className={matches.length > 0 ? 'text-mole-danger font-bold' : 'text-mole-safe'}>
            {tx('Eşleşme', 'Matches')}: {matches.length}
          </span>
        </div>
      )}

      {result?.error && (
        <div className="bg-mole-danger/10 border border-mole-danger/30 rounded p-3 text-sm">{result.error}</div>
      )}

      {Object.entries(byRule).map(([rule, ms]) => (
        <div key={rule} className="bg-mole-surface border border-mole-danger/30 rounded p-3">
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} className={sevColor[ms[0].severity] || 'text-mole-text-muted'} />
            <h3 className="font-semibold">{rule}</h3>
            <span className={`px-2 py-0.5 rounded text-xs ${sevColor[ms[0].severity] || ''} bg-mole-bg`}>{ms[0].severity}</span>
            <span className="text-xs text-mole-text-muted">({ms.length})</span>
          </div>
          {ms[0].description && <p className="text-xs text-mole-text-muted mt-1">{ms[0].description}</p>}
          <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
            {ms.map((m, i) => (
              <div key={i} className="text-xs font-mono bg-mole-bg p-1.5 rounded flex items-center justify-between gap-2">
                <span className="truncate text-mole-accent">{m.file}</span>
                <span className="text-mole-text-muted shrink-0">{(m.size_bytes/1024).toFixed(0)}KB · {m.matched_strings} hit</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
