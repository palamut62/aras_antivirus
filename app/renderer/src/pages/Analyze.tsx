import { useState, useRef, useEffect } from 'react'
import { HardDrive, FolderOpen, Loader2, File, Folder, Search, CheckCircle2, Copy, Check } from 'lucide-react'
import { useLang } from '../contexts/LangContext'

interface FolderInfo { path: string; sizeBytes: number; fileCount: number }
interface FileInfo { path: string; sizeBytes: number; extension: string }

export default function Analyze() {
  const { tx } = useLang()
  const [pathInput, setPathInput] = useState('C:\\')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [view, setView] = useState<'folders' | 'files'>('folders')
  const [scanLog, setScanLog] = useState<string[]>([])
  const [logCopied, setLogCopied] = useState(false)
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [scanLog])

  const formatSize = (bytes: number) => {
    if (bytes >= 1e9) return (bytes / 1e9).toFixed(2) + ' GB'
    if (bytes >= 1e6) return (bytes / 1e6).toFixed(1) + ' MB'
    if (bytes >= 1e3) return (bytes / 1e3).toFixed(0) + ' KB'
    return bytes + ' B'
  }

  const sizeBar = (bytes: number, max: number) => max > 0 ? Math.min((bytes / max) * 100, 100) : 0

  const pickFolder = async () => {
    const folder = await window.moleAPI.pickFolder()
    if (folder) setPathInput(folder)
  }

  const appendLog = (msg: string) => setScanLog(prev => [...prev, msg])

  const handleAnalyze = async () => {
    if (!pathInput.trim()) return
    setLoading(true)
    setResult(null)
    setScanLog([tx('Disk analizi başlatılıyor...', 'Starting disk analysis...')])

    const steps = [
      tx('Hedef yol doğrulanıyor...', 'Validating target path...'),
      tx('Alt klasörler listeleniyor...', 'Listing subdirectories...'),
      tx('Klasör boyutları hesaplanıyor...', 'Calculating folder sizes...'),
      tx('Dosyalar taranıyor...', 'Scanning files...'),
      tx('En büyük dosyalar sıralanıyor...', 'Sorting largest files...'),
      tx('Boyut istatistikleri hesaplanıyor...', 'Computing size statistics...'),
    ]

    let idx = 0
    const interval = setInterval(() => {
      if (idx < steps.length) { appendLog(steps[idx]); idx++ }
    }, 800)

    try {
      const r = await window.moleAPI.analyzeDisk(pathInput.trim())
      clearInterval(interval)
      if (r.success) {
        setResult(r.data)
        appendLog(tx(
          `✓ Analiz tamamlandı — ${r.data?.scannedFolders || 0} klasör, ${r.data?.totalFiles?.toLocaleString() || 0} dosya bulundu`,
          `✓ Analysis complete — ${r.data?.scannedFolders || 0} folders, ${r.data?.totalFiles?.toLocaleString() || 0} files found`
        ))
      } else {
        appendLog(tx('✗ Analiz başarısız: ' + (r.error || 'Bilinmeyen hata'), '✗ Analysis failed: ' + (r.error || 'Unknown error')))
      }
    } catch (e: any) {
      clearInterval(interval)
      appendLog(tx('✗ Hata: ' + e.message, '✗ Error: ' + e.message))
    }
    setLoading(false)
  }

  const maxFolderSize = result?.folders?.[0]?.sizeBytes || 1
  const maxFileSize = result?.files?.[0]?.sizeBytes || 1

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <HardDrive size={24} className="text-mole-accent" /> {tx('Disk Analizi', 'Disk Analysis')}
        </h1>
        <p className="text-mole-text-muted mt-1">{tx('Klasör ve dosya boyutlarını incele', 'Inspect folder and file sizes')}</p>
      </div>

      <div className="flex gap-2">
        <input value={pathInput} onChange={e => setPathInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
          placeholder="C:\Users\you\projects"
          className="flex-1 bg-mole-surface border border-mole-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-mole-accent" />
        <button onClick={pickFolder}
          className="px-4 py-2.5 bg-mole-surface border border-mole-border rounded-lg hover:bg-mole-bg transition-colors"
          title={tx('Klasör seç', 'Pick folder')}>
          <FolderOpen size={16} />
        </button>
        <button onClick={handleAnalyze} disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 bg-mole-accent hover:bg-mole-accent-hover disabled:opacity-50 rounded-lg font-medium transition-colors">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
          {loading ? tx('Taranıyor...', 'Scanning...') : tx('Analiz Et', 'Analyze')}
        </button>
      </div>

      {/* Scan Log */}
      {scanLog.length > 0 && (
        <div ref={logRef} className="bg-mole-bg rounded-lg p-4 max-h-36 overflow-y-auto font-mono text-xs space-y-1 relative group/log">
          <button onClick={() => { navigator.clipboard.writeText(scanLog.join('\n')); setLogCopied(true); setTimeout(() => setLogCopied(false), 1500) }}
            className="absolute top-2 right-2 p-1.5 rounded bg-mole-surface/80 border border-mole-border opacity-0 group-hover/log:opacity-100 transition-opacity"
            title="Copy Logs">
            {logCopied ? <Check size={12} className="text-mole-safe" /> : <Copy size={12} className="text-mole-text-muted" />}
          </button>
          {scanLog.map((line, i) => (
            <div key={i} className="flex items-center gap-2">
              {i === scanLog.length - 1 && loading
                ? <Loader2 size={12} className="animate-spin text-mole-accent shrink-0" />
                : <CheckCircle2 size={12} className="text-mole-safe shrink-0" />}
              <span className="text-mole-text-muted">{line}</span>
            </div>
          ))}
        </div>
      )}

      {result && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-mole-surface rounded-lg p-4 border border-mole-border">
              <p className="text-xs text-mole-text-muted">{tx('Toplam Boyut', 'Total Size')}</p>
              <p className="text-xl font-bold text-mole-accent mt-1">{formatSize(result.totalSize)}</p>
            </div>
            <div className="bg-mole-surface rounded-lg p-4 border border-mole-border">
              <p className="text-xs text-mole-text-muted">{tx('Toplam Dosya', 'Total Files')}</p>
              <p className="text-xl font-bold mt-1">{result.totalFiles?.toLocaleString()}</p>
            </div>
            <div className="bg-mole-surface rounded-lg p-4 border border-mole-border">
              <p className="text-xs text-mole-text-muted">{tx('En Büyük Klasör', 'Largest Folder')}</p>
              <p className="text-xl font-bold mt-1">{result.folders?.[0] ? formatSize(result.folders[0].sizeBytes) : '--'}</p>
            </div>
          </div>

          {/* Tab toggle */}
          <div className="flex gap-1 bg-mole-surface rounded-lg p-1 w-fit border border-mole-border">
            <button onClick={() => setView('folders')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded text-sm transition-colors ${view === 'folders' ? 'bg-mole-accent text-white' : 'text-mole-text-muted hover:text-mole-text'}`}>
              <Folder size={14} /> {tx('Klasörler', 'Folders')}
            </button>
            <button onClick={() => setView('files')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded text-sm transition-colors ${view === 'files' ? 'bg-mole-accent text-white' : 'text-mole-text-muted hover:text-mole-text'}`}>
              <File size={14} /> {tx('Dosyalar', 'Files')}
            </button>
          </div>

          {/* Folder list */}
          {view === 'folders' && result.folders && (
            <div className="space-y-1.5">
              {result.folders.map((f: FolderInfo, i: number) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-mole-surface rounded-lg border border-mole-border">
                  <Folder size={16} className="text-mole-accent shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{f.path}</p>
                    <div className="mt-1.5 h-1.5 bg-mole-bg rounded-full overflow-hidden">
                      <div className="h-full bg-mole-accent rounded-full transition-all" style={{ width: `${sizeBar(f.sizeBytes, maxFolderSize)}%` }} />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold">{formatSize(f.sizeBytes)}</p>
                    <p className="text-xs text-mole-text-muted">{f.fileCount?.toLocaleString()} {tx('dosya', 'files')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* File list */}
          {view === 'files' && result.files && (
            <div className="space-y-1.5">
              {result.files.map((f: FileInfo, i: number) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-mole-surface rounded-lg border border-mole-border">
                  <File size={16} className="text-mole-warning shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{f.path}</p>
                    <div className="mt-1.5 h-1.5 bg-mole-bg rounded-full overflow-hidden">
                      <div className="h-full bg-mole-warning rounded-full transition-all" style={{ width: `${sizeBar(f.sizeBytes, maxFileSize)}%` }} />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold">{formatSize(f.sizeBytes)}</p>
                    <p className="text-xs text-mole-text-muted">{f.extension}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
