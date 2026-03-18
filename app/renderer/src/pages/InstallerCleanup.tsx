import { useState } from 'react'
import { FileBox, Check, Trash2, Loader2, Calendar, MapPin } from 'lucide-react'
import { useLang } from '../contexts/LangContext'
import { useNotificationStore } from '../stores/notificationStore'

interface InstallerFile {
  path: string
  name: string
  sizeBytes: number
  lastModified: string
  ageDays: number
  location: string
  extension: string
  isOld: boolean
  selected: boolean
}

export default function InstallerCleanup() {
  const { tx } = useLang()
  const pushNotification = useNotificationStore(s => s.push)
  const [files, setFiles] = useState<InstallerFile[]>([])
  const [scanning, setScanning] = useState(false)
  const [cleaning, setCleaning] = useState(false)
  const [result, setResult] = useState<{ cleaned: number; cleanedSize: number } | null>(null)

  const formatSize = (bytes: number) => {
    if (!bytes || bytes <= 0) return '—'
    if (bytes >= 1e9) return (bytes / 1e9).toFixed(2) + ' GB'
    if (bytes >= 1e6) return (bytes / 1e6).toFixed(1) + ' MB'
    return (bytes / 1e3).toFixed(0) + ' KB'
  }

  const handleScan = async () => {
    setScanning(true)
    setResult(null)
    try {
      const res = await window.moleAPI.installerCleanup('scan')
      if (res.success && res.data?.installers) {
        setFiles(res.data.installers.map((f: any) => ({ ...f, selected: f.isOld })))
      }
    } catch { /* */ }
    setScanning(false)
  }

  const toggleFile = (path: string) => {
    setFiles(prev => prev.map(f => f.path === path ? { ...f, selected: !f.selected } : f))
  }

  const selectAll = () => {
    const allSelected = files.every(f => f.selected)
    setFiles(prev => prev.map(f => ({ ...f, selected: !allSelected })))
  }

  const handleClean = async () => {
    const selected = files.filter(f => f.selected).map(f => f.path)
    if (selected.length === 0) return
    setCleaning(true)
    try {
      const res = await window.moleAPI.installerCleanup('clean', selected)
      if (res.success && res.data) {
        setResult({ cleaned: res.data.cleaned, cleanedSize: res.data.cleanedSize })
        setFiles(prev => prev.filter(f => !f.selected))
        pushNotification({
          type: 'success',
          title: tx('Installer temizligi tamamlandi!', 'Installer cleanup completed!'),
          message: `${res.data.cleaned} ${tx('dosya', 'files')} — ${formatSize(res.data.cleanedSize)} ${tx('kazanildi', 'freed')}`,
        })
      }
    } catch { /* */ }
    setCleaning(false)
  }

  const totalSelected = files.filter(f => f.selected).reduce((s, f) => s + f.sizeBytes, 0)
  const selectedCount = files.filter(f => f.selected).length

  const extColor = (ext: string) => {
    switch (ext) {
      case '.exe': return 'bg-blue-500/20 text-blue-400'
      case '.msi': return 'bg-purple-500/20 text-purple-400'
      case '.msix': case '.msixbundle': return 'bg-emerald-500/20 text-emerald-400'
      default: return 'bg-mole-text-muted/20 text-mole-text-muted'
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileBox size={24} className="text-mole-accent" /> {tx('Installer Temizleyici', 'Installer Cleanup')}
        </h1>
        <p className="text-mole-text-muted mt-1">{tx('Eski kurulum dosyalarini (.exe, .msi) bul ve temizle', 'Find and clean old installer files (.exe, .msi)')}</p>
      </div>

      <div className="flex gap-2">
        <button onClick={handleScan} disabled={scanning || cleaning}
          className="px-6 py-2.5 bg-mole-accent hover:bg-mole-accent-hover disabled:opacity-50 rounded-lg font-medium transition-colors">
          {scanning ? tx('Taraniyor...', 'Scanning...') : tx('Installer Dosyalarini Tara', 'Scan Installer Files')}
        </button>
      </div>

      {result && (
        <div className="p-4 rounded-lg border bg-mole-safe/10 border-mole-safe/30">
          <p className="font-medium">{result.cleaned} {tx('dosya temizlendi', 'files cleaned')} — {formatSize(result.cleanedSize)} {tx('kazanildi', 'freed')}</p>
        </div>
      )}

      {files.length > 0 && (
        <>
          <div className="flex items-center justify-between text-sm">
            <span className="text-mole-text-muted">{files.length} {tx('dosya bulundu', 'files found')} — {tx('Toplam', 'Total')}: {formatSize(files.reduce((s, f) => s + f.sizeBytes, 0))}</span>
            <button onClick={selectAll} className="text-mole-accent hover:underline text-xs">
              {files.every(f => f.selected) ? tx('Hicbirini Secme', 'Deselect All') : tx('Tumunu Sec', 'Select All')}
            </button>
          </div>

          <div className="space-y-1.5 max-h-[calc(100vh-400px)] overflow-y-auto">
            {files.map(file => (
              <label key={file.path}
                className="flex items-center gap-3 p-3 bg-mole-surface rounded-lg border border-mole-border cursor-pointer hover:bg-mole-bg/50 transition-colors">
                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors shrink-0 ${
                  file.selected ? 'bg-mole-accent border-mole-accent' : 'border-mole-border'
                }`} onClick={() => toggleFile(file.path)}>
                  {file.selected && <Check size={14} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{file.name}</p>
                  <div className="flex items-center gap-3 text-xs text-mole-text-muted mt-0.5">
                    <span className="flex items-center gap-1"><MapPin size={10} /> {file.location}</span>
                    <span className="flex items-center gap-1"><Calendar size={10} /> {file.lastModified}</span>
                    <span>{file.ageDays} {tx('gun once', 'days ago')}</span>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${extColor(file.extension)}`}>{file.extension}</span>
                <span className="text-sm font-medium shrink-0 w-20 text-right">{formatSize(file.sizeBytes)}</span>
                {file.isOld && <span className="text-xs px-1.5 py-0.5 rounded bg-mole-warning/20 text-mole-warning shrink-0">{tx('Eski', 'Old')}</span>}
              </label>
            ))}
          </div>

          <div className="flex items-center justify-between bg-mole-surface rounded-lg p-4 border border-mole-border">
            <p>{tx('Secili', 'Selected')}: <span className="font-bold text-mole-accent">{selectedCount} {tx('dosya', 'files')} — {formatSize(totalSelected)}</span></p>
            <button onClick={handleClean} disabled={cleaning || selectedCount === 0}
              className="px-6 py-2 bg-mole-danger hover:bg-mole-danger/80 disabled:opacity-50 rounded-lg font-medium transition-colors flex items-center gap-2">
              {cleaning ? <><Loader2 size={16} className="animate-spin" /> {tx('Temizleniyor...', 'Cleaning...')}</> : <><Trash2 size={16} /> {tx('Secilenleri Sil', 'Delete Selected')}</>}
            </button>
          </div>
        </>
      )}

      {scanning && (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-mole-accent" />
        </div>
      )}
    </div>
  )
}
