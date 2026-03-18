import { useState, useEffect } from 'react'
import { Code2, FolderOpen, Trash2, Loader2, CheckCircle2 } from 'lucide-react'
import { useLang } from '../contexts/LangContext'
import { useNotificationStore } from '../stores/notificationStore'

interface PurgeTarget {
  path: string
  type: string
  sizeBytes: number
  selected: boolean
}

export default function DevPurge() {
  const { tx } = useLang()
  const pushNotification = useNotificationStore(s => s.push)
  const [folders, setFolders] = useState<string[]>([])
  const [foldersLoaded, setFoldersLoaded] = useState(false)

  // Load saved folders from settings
  useEffect(() => {
    window.moleAPI.settingsGet().then((s: any) => {
      if (s.devFolders?.length > 0) setFolders(s.devFolders)
      setFoldersLoaded(true)
    }).catch(() => setFoldersLoaded(true))
  }, [])

  // Save folders to settings when they change
  useEffect(() => {
    if (foldersLoaded) {
      window.moleAPI.settingsUpdate({ devFolders: folders })
    }
  }, [folders, foldersLoaded])
  const [folderInput, setFolderInput] = useState('')
  const [scanning, setScanning] = useState(false)
  const [purging, setPurging] = useState(false)
  const [targets, setTargets] = useState<PurgeTarget[]>([])
  const [scanLog, setScanLog] = useState<string[]>([])
  const [purgeResult, setPurgeResult] = useState<any>(null)

  const formatSize = (bytes: number) => {
    if (bytes >= 1e9) return (bytes / 1e9).toFixed(2) + ' GB'
    if (bytes >= 1e6) return (bytes / 1e6).toFixed(1) + ' MB'
    return (bytes / 1e3).toFixed(0) + ' KB'
  }

  const addFolder = () => {
    const f = folderInput.trim()
    if (f && !folders.includes(f)) {
      setFolders([...folders, f])
      setFolderInput('')
    }
  }

  const pickFolder = async () => {
    const folder = await window.moleAPI.pickFolder()
    if (folder && !folders.includes(folder)) {
      setFolders([...folders, folder])
    }
  }

  const handleScan = async () => {
    if (folders.length === 0) return
    setScanning(true)
    setTargets([])
    setPurgeResult(null)
    setScanLog([tx('Tarama baslatılıyor...', 'Starting scan...')])

    const artifactNames = ['node_modules', 'dist', 'build', '.next', '.turbo', '.cache', '__pycache__', '.pytest_cache', 'bin', 'obj', 'target']
    let logIdx = 0
    const interval = setInterval(() => {
      if (logIdx < artifactNames.length) {
        setScanLog(prev => [...prev, tx(`"${artifactNames[logIdx]}" klasörleri aranıyor...`, `Searching for "${artifactNames[logIdx]}" folders...`)])
        logIdx++
      }
    }, 500)

    try {
      const result = await window.moleAPI.purgeScan(folders)
      clearInterval(interval)

      if (result.success && result.data) {
        // PowerShell tek obje döndüğünde array olmaz, normalize et
        const items = Array.isArray(result.data) ? result.data : [result.data]
        const valid = items.filter((t: any) => t && t.path && t.sizeBytes > 0)
        setTargets(valid.map((t: any) => ({ ...t, selected: true })))
        setScanLog(prev => [...prev, tx(`Tarama tamamlandı! ${valid.length} artifact bulundu.`, `Scan complete! ${valid.length} artifacts found.`)])
      } else {
        setScanLog(prev => [...prev, result.error ? `${tx('Hata', 'Error')}: ${result.error}` : tx('Hiç artifact bulunamadı.', 'No artifacts found.')])
      }
    } catch (err: any) {
      clearInterval(interval)
      setScanLog(prev => [...prev, `${tx('Hata', 'Error')}: ${err.message}`])
    }
    setScanning(false)
  }

  const handlePurge = async () => {
    const selected = targets.filter(t => t.selected).map(t => t.path)
    if (selected.length === 0) return
    setPurging(true)
    try {
      const result = await window.moleAPI.purgeExecute(selected)
      setPurgeResult(result)
      if (result.success) {
        setTargets(prev => prev.filter(t => !t.selected))
        pushNotification({
          type: 'success',
          title: tx('Artifact temizligi tamamlandi!', 'Artifact cleanup completed!'),
          message: result.data?.sizeFreed > 0 ? `${formatSize(result.data.sizeFreed)} ${tx('kazanildi', 'freed')}` : undefined,
        })
      }
    } catch (err) {
      console.error(err)
    }
    setPurging(false)
  }

  const toggleAll = (val: boolean) => {
    setTargets(prev => prev.map(t => ({ ...t, selected: val })))
  }

  const totalSelected = targets.filter(t => t.selected).reduce((s, t) => s + t.sizeBytes, 0)
  const selectedCount = targets.filter(t => t.selected).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Code2 size={24} className="text-mole-accent" /> {tx('Geliştirici Temizliği', 'Developer Purge')}
        </h1>
        <p className="text-mole-text-muted mt-1">{tx('Build artifact ve gelistirici artıklarını temizle', 'Clean build artifacts and developer leftovers')}</p>
      </div>

      {/* Folder input */}
      <div className="bg-mole-surface rounded-lg p-4 border border-mole-border space-y-3">
        <p className="text-sm font-medium">{tx('Proje Klasörleri', 'Project Folders')}</p>
        <p className="text-xs text-mole-text-muted">{tx('Taranacak üst klasörleri ekleyin (node_modules, dist, __pycache__ vb. aranacak)', 'Add parent folders to scan (will search for node_modules, dist, __pycache__, etc.)')}</p>
        <div className="flex gap-2">
          <input value={folderInput} onChange={e => setFolderInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addFolder()}
            placeholder="C:\Users\you\projects"
            className="flex-1 bg-mole-bg border border-mole-border rounded px-3 py-2 text-sm focus:outline-none focus:border-mole-accent" />
          <button onClick={addFolder}
            className="px-3 py-2 bg-mole-accent rounded text-sm font-medium hover:bg-mole-accent-hover transition-colors"
            title={tx('Elle ekle', 'Add manually')}>+</button>
          <button onClick={pickFolder}
            className="px-4 py-2 bg-mole-accent rounded text-sm font-medium hover:bg-mole-accent-hover transition-colors"
            title={tx('Klasör seç', 'Pick folder')}>
            <FolderOpen size={16} />
          </button>
        </div>
        {folders.map(f => (
          <div key={f} className="flex items-center justify-between bg-mole-bg rounded px-3 py-2 text-sm">
            <span className="truncate">{f}</span>
            <button onClick={() => setFolders(prev => prev.filter(x => x !== f))} className="text-mole-danger hover:text-red-400 shrink-0 ml-2">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        <button onClick={handleScan} disabled={scanning || folders.length === 0}
          className="flex items-center gap-2 px-6 py-2 bg-mole-accent hover:bg-mole-accent-hover disabled:opacity-50 rounded-lg text-sm font-medium transition-colors">
          {scanning ? <><Loader2 size={16} className="animate-spin" /> {tx('Taranıyor...', 'Scanning...')}</> : tx('Artifact Tara', 'Scan Artifacts')}
        </button>
      </div>

      {/* Scan log */}
      {scanLog.length > 0 && (
        <div className="bg-mole-bg rounded-lg p-4 max-h-36 overflow-y-auto font-mono text-xs space-y-1">
          {scanLog.map((line, i) => (
            <div key={i} className="flex items-center gap-2">
              {i === scanLog.length - 1 && scanning
                ? <Loader2 size={12} className="animate-spin text-mole-accent shrink-0" />
                : <CheckCircle2 size={12} className="text-mole-safe shrink-0" />}
              <span className="text-mole-text-muted">{line}</span>
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      {targets.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-mole-text-muted">{targets.length} {tx('artifact bulundu', 'artifacts found')}</p>
            <div className="flex gap-2">
              <button onClick={() => toggleAll(true)} className="text-xs px-3 py-1 bg-mole-surface border border-mole-border rounded hover:bg-mole-bg transition-colors">
                {tx('Tümünü Seç', 'Select All')}
              </button>
              <button onClick={() => toggleAll(false)} className="text-xs px-3 py-1 bg-mole-surface border border-mole-border rounded hover:bg-mole-bg transition-colors">
                {tx('Hiçbirini Seçme', 'Select None')}
              </button>
            </div>
          </div>

          <div className="space-y-1.5 max-h-72 overflow-y-auto">
            {targets.map((t, i) => (
              <label key={i} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                t.selected ? 'bg-mole-accent/5 border-mole-accent/30' : 'bg-mole-surface border-mole-border hover:bg-mole-bg/50'
              }`}>
                <input type="checkbox" checked={t.selected}
                  onChange={() => setTargets(prev => prev.map((x, j) => j === i ? { ...x, selected: !x.selected } : x))}
                  className="accent-mole-accent w-4 h-4 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{t.path}</p>
                  <p className="text-xs text-mole-text-muted">{t.type}</p>
                </div>
                <p className="text-sm font-semibold shrink-0">{formatSize(t.sizeBytes)}</p>
              </label>
            ))}
          </div>

          <div className="flex items-center justify-between bg-mole-surface rounded-lg p-4 border border-mole-border">
            <div>
              <p className="text-sm text-mole-text-muted">{selectedCount} / {targets.length} {tx('seçili', 'selected')}</p>
              <p className="text-lg font-bold text-mole-accent">{formatSize(totalSelected)}</p>
            </div>
            <button onClick={handlePurge} disabled={purging || totalSelected === 0}
              className="flex items-center gap-2 px-6 py-2.5 bg-mole-danger hover:bg-mole-danger/80 disabled:opacity-50 rounded-lg font-medium transition-colors">
              {purging ? <><Loader2 size={16} className="animate-spin" /> {tx('Siliniyor...', 'Deleting...')}</> : <><Trash2 size={16} /> {tx('Seçilenleri Sil', 'Delete Selected')}</>}
            </button>
          </div>
        </>
      )}

      {/* Purge result */}
      {purgeResult && (
        <div className={`p-4 rounded-lg border ${purgeResult.success ? 'bg-mole-safe/10 border-mole-safe/30' : 'bg-mole-danger/10 border-mole-danger/30'}`}>
          <p className="font-medium">{purgeResult.success ? tx('Temizlik tamamlandı!', 'Cleanup completed!') : tx('Temizlik hatası', 'Cleanup error')}</p>
          {purgeResult.data?.sizeFreed > 0 && (
            <p className="text-sm text-mole-text-muted mt-1">{tx('Kazanılan alan', 'Space freed')}: {formatSize(purgeResult.data.sizeFreed)}</p>
          )}
        </div>
      )}
    </div>
  )
}
