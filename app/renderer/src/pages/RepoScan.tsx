import { useState } from 'react'
import { GitBranch, FolderOpen, Loader2, AlertTriangle, CheckCircle2, Shield } from 'lucide-react'
import { useLang } from '../contexts/LangContext'

interface Finding {
  file: string
  category: string
  description: string
  riskScore: number
  severity: string
}

export default function RepoScan() {
  const { tx } = useLang()
  const [repoPath, setRepoPath] = useState('')
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<any>(null)

  const pickFolder = async () => {
    const folder = await window.moleAPI.pickFolder()
    if (folder) setRepoPath(folder)
  }

  const handleScan = async () => {
    if (!repoPath.trim()) return
    setScanning(true)
    setResult(null)
    try {
      const r = await window.moleAPI.repoScan(repoPath.trim())
      if (r.success) setResult(r.data)
    } catch {}
    setScanning(false)
  }

  const severityIcon = (s: string) => {
    if (s === 'high') return <AlertTriangle size={14} className="text-red-400" />
    if (s === 'suspicious' || s === 'medium') return <Shield size={14} className="text-yellow-400" />
    return <CheckCircle2 size={14} className="text-mole-safe" />
  }

  const categoryLabel: Record<string, string> = {
    'suspicious_script': tx('Süpheli Script', 'Suspicious Script'),
    'secret_exposure': tx('Gizli Veri Sızıntısı', 'Secret Exposure'),
    'dangerous_dependency': tx('Tehlikeli Bagimlılık', 'Dangerous Dependency'),
    'install_hook': 'Install Hook',
    'obfuscation': tx('Kod Gizleme', 'Obfuscation'),
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <GitBranch size={24} className="text-mole-accent" /> {tx('Repo Güvenlik Taraması', 'Repo Security Scan')}
        </h1>
        <p className="text-mole-text-muted mt-1">{tx('Proje bagimlılıklarını, scriptleri ve gizli veri sızıntılarını kontrol et', 'Check project dependencies, scripts and secret exposures')}</p>
      </div>

      <div className="flex gap-2">
        <input value={repoPath} onChange={e => setRepoPath(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleScan()}
          placeholder="C:\Users\you\project-folder"
          className="flex-1 bg-mole-surface border border-mole-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-mole-accent" />
        <button onClick={pickFolder}
          className="px-4 py-2.5 bg-mole-surface border border-mole-border rounded-lg hover:bg-mole-bg transition-colors"
          title={tx('Klasör seç', 'Select folder')}>
          <FolderOpen size={16} />
        </button>
        <button onClick={handleScan} disabled={scanning || !repoPath.trim()}
          className="flex items-center gap-2 px-5 py-2.5 bg-mole-accent hover:bg-mole-accent-hover disabled:opacity-50 rounded-lg font-medium transition-colors">
          {scanning ? <Loader2 size={16} className="animate-spin" /> : <FolderOpen size={16} />}
          {scanning ? tx('Taranıyor...', 'Scanning...') : tx('Repo Tara', 'Scan Repo')}
        </button>
      </div>

      {result && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-mole-surface rounded-lg p-4 border border-mole-border">
              <p className="text-xs text-mole-text-muted">{tx('Toplam Bulgu', 'Total Findings')}</p>
              <p className="text-xl font-bold mt-1">{result.totalFindings}</p>
            </div>
            <div className="bg-mole-surface rounded-lg p-4 border border-mole-border">
              <p className="text-xs text-mole-text-muted">{tx('Risk Özeti', 'Risk Summary')}</p>
              <p className="text-xl font-bold text-mole-warning mt-1">{result.riskSummary || 'N/A'}</p>
            </div>
            <div className="bg-mole-surface rounded-lg p-4 border border-mole-border">
              <p className="text-xs text-mole-text-muted">Repo</p>
              <p className="text-sm font-medium mt-1 truncate">{result.repoPath}</p>
            </div>
          </div>

          {result.findings?.length > 0 ? (
            <div className="space-y-2">
              {result.findings.map((f: Finding, i: number) => (
                <div key={i} className="bg-mole-surface rounded-lg p-4 border border-mole-border">
                  <div className="flex items-start gap-3">
                    {severityIcon(f.severity)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{f.description}</p>
                        <span className="text-[10px] px-2 py-0.5 bg-mole-bg rounded-full text-mole-text-muted">
                          {categoryLabel[f.category] || f.category}
                        </span>
                      </div>
                      <p className="text-xs text-mole-text-muted mt-1 truncate">{f.file}</p>
                    </div>
                    <span className="text-sm font-bold text-mole-warning shrink-0">{f.riskScore}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-mole-safe/10 border border-mole-safe/30 rounded-xl p-6 text-center">
              <CheckCircle2 size={40} className="text-mole-safe mx-auto mb-3" />
              <p className="font-semibold text-mole-safe">{tx('Repo güvenli görünüyor!', 'Repo looks safe!')}</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
