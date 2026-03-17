import { useState, useEffect } from 'react'
import {
  FolderOpen, File, ArrowUp, RefreshCw, Loader2, Trash2, Pencil, Copy,
  Scissors, FolderPlus, ExternalLink, HardDrive, Info, X, Check,
} from 'lucide-react'
import { useLang } from '../contexts/LangContext'

interface FileItem {
  name: string
  path: string
  isDirectory: boolean
  size: number
  extension: string
  lastModified: string
  createdAt: string
  isHidden: boolean
  isReadOnly: boolean
  driveInfo?: { totalSize: number; freeSpace: number; usedSpace: number; format: string }
}

export default function FileExplorer() {
  const { tx } = useLang()
  const [currentPath, setCurrentPath] = useState('')
  const [parentPath, setParentPath] = useState('')
  const [items, setItems] = useState<FileItem[]>([])
  const [loading, setLoading] = useState(false)
  const [isDriveRoot, setIsDriveRoot] = useState(true)
  const [pathInput, setPathInput] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [clipboard, setClipboard] = useState<{ paths: string[]; mode: 'copy' | 'cut' } | null>(null)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [infoItem, setInfoItem] = useState<any>(null)
  const [newFolderMode, setNewFolderMode] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')

  const formatSize = (bytes: number) => {
    if (!bytes) return '--'
    if (bytes >= 1e9) return (bytes / 1e9).toFixed(2) + ' GB'
    if (bytes >= 1e6) return (bytes / 1e6).toFixed(1) + ' MB'
    if (bytes >= 1e3) return (bytes / 1e3).toFixed(0) + ' KB'
    return bytes + ' B'
  }

  const loadDir = async (path?: string) => {
    setLoading(true)
    setSelected(new Set())
    setRenaming(null)
    setNewFolderMode(false)
    try {
      const r = await window.moleAPI.fileList(path)
      if (r.success) {
        setItems(r.data.items || [])
        setCurrentPath(r.data.currentPath || '')
        setParentPath(r.data.parentPath || '')
        setIsDriveRoot(r.data.isDriveRoot || false)
        setPathInput(r.data.currentPath || '')
      }
    } catch {}
    setLoading(false)
  }

  useEffect(() => { loadDir() }, [])

  const navigate = (path: string) => loadDir(path)
  const goUp = () => { if (parentPath) navigate(parentPath); else loadDir() }
  const goToPath = () => { if (pathInput.trim()) navigate(pathInput.trim()) }

  const toggleSelect = (path: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(path) ? next.delete(path) : next.add(path)
      return next
    })
  }

  const handleDelete = async () => {
    if (selected.size === 0) return
    for (const p of selected) {
      await window.moleAPI.fileDelete(p)
    }
    loadDir(currentPath || undefined)
  }

  const handleCopy = () => { setClipboard({ paths: [...selected], mode: 'copy' }); setSelected(new Set()) }
  const handleCut = () => { setClipboard({ paths: [...selected], mode: 'cut' }); setSelected(new Set()) }

  const handlePaste = async () => {
    if (!clipboard || !currentPath) return
    for (const p of clipboard.paths) {
      const name = p.split('\\').pop() || p.split('/').pop() || 'file'
      const dest = currentPath + '\\' + name
      if (clipboard.mode === 'copy') await window.moleAPI.fileCopy(p, dest)
      else await window.moleAPI.fileMove(p, dest)
    }
    setClipboard(null)
    loadDir(currentPath)
  }

  const handleRename = async (path: string) => {
    if (!renameValue.trim()) { setRenaming(null); return }
    await window.moleAPI.fileRename(path, renameValue.trim())
    setRenaming(null)
    loadDir(currentPath || undefined)
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || !currentPath) return
    await window.moleAPI.fileCreateFolder(currentPath + '\\' + newFolderName.trim())
    setNewFolderMode(false)
    setNewFolderName('')
    loadDir(currentPath)
  }

  const handleInfo = async (path: string) => {
    const r = await window.moleAPI.fileInfo(path)
    if (r.success) setInfoItem(r.data)
  }

  const handleOpen = async (path: string) => {
    await window.moleAPI.fileOpen(path)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FolderOpen size={24} className="text-mole-accent" />
          {tx('Dosya Yoneticisi', 'File Explorer')}
        </h1>
        <p className="text-mole-text-muted mt-1">
          {tx('Dosya ve klasorlerinizi yonetin', 'Manage your files and folders')}
        </p>
      </div>

      {/* Path bar */}
      <div className="flex gap-2">
        <button onClick={goUp} disabled={isDriveRoot && !currentPath}
          className="px-3 py-2.5 bg-mole-surface border border-mole-border rounded-lg hover:bg-mole-bg transition-colors disabled:opacity-30"
          title={tx('Ust klasor', 'Go up')}>
          <ArrowUp size={16} />
        </button>
        <input value={pathInput} onChange={e => setPathInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && goToPath()}
          placeholder="C:\Users\..."
          className="flex-1 bg-mole-surface border border-mole-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-mole-accent font-mono" />
        <button onClick={() => loadDir(currentPath || undefined)}
          className="px-3 py-2.5 bg-mole-surface border border-mole-border rounded-lg hover:bg-mole-bg transition-colors"
          title={tx('Yenile', 'Refresh')}>
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-1 flex-wrap">
        <button onClick={() => { setNewFolderMode(true); setNewFolderName('') }}
          disabled={!currentPath}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-mole-surface border border-mole-border rounded-lg hover:bg-mole-bg transition-colors disabled:opacity-30">
          <FolderPlus size={14} /> {tx('Yeni Klasor', 'New Folder')}
        </button>
        <div className="w-px h-5 bg-mole-border mx-1" />
        <button onClick={handleCopy} disabled={selected.size === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-mole-surface border border-mole-border rounded-lg hover:bg-mole-bg transition-colors disabled:opacity-30">
          <Copy size={14} /> {tx('Kopyala', 'Copy')}
        </button>
        <button onClick={handleCut} disabled={selected.size === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-mole-surface border border-mole-border rounded-lg hover:bg-mole-bg transition-colors disabled:opacity-30">
          <Scissors size={14} /> {tx('Kes', 'Cut')}
        </button>
        <button onClick={handlePaste} disabled={!clipboard || !currentPath}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-mole-surface border border-mole-border rounded-lg hover:bg-mole-bg transition-colors disabled:opacity-30">
          <Copy size={14} /> {tx('Yapistir', 'Paste')}
          {clipboard && <span className="text-mole-accent">({clipboard.paths.length})</span>}
        </button>
        <div className="w-px h-5 bg-mole-border mx-1" />
        <button onClick={handleDelete} disabled={selected.size === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors disabled:opacity-30">
          <Trash2 size={14} /> {tx('Sil', 'Delete')} {selected.size > 0 && `(${selected.size})`}
        </button>
      </div>

      {/* New folder input */}
      {newFolderMode && (
        <div className="flex gap-2 items-center">
          <FolderPlus size={16} className="text-mole-accent" />
          <input value={newFolderName} onChange={e => setNewFolderName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreateFolder(); if (e.key === 'Escape') setNewFolderMode(false) }}
            autoFocus placeholder={tx('Klasor adi...', 'Folder name...')}
            className="flex-1 bg-mole-surface border border-mole-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-mole-accent" />
          <button onClick={handleCreateFolder} className="p-2 text-mole-safe hover:bg-mole-safe/10 rounded-lg"><Check size={16} /></button>
          <button onClick={() => setNewFolderMode(false)} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg"><X size={16} /></button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-mole-accent" />
        </div>
      )}

      {/* File list */}
      {!loading && (
        <div className="space-y-1">
          {items.length === 0 && (
            <p className="text-center text-mole-text-muted py-8">{tx('Bos klasor', 'Empty folder')}</p>
          )}
          {items.map((item) => (
            <div key={item.path}
              className={`flex items-center gap-3 p-2.5 rounded-lg border transition-colors cursor-pointer group ${
                selected.has(item.path)
                  ? 'bg-mole-accent/10 border-mole-accent/30'
                  : 'bg-mole-surface border-mole-border hover:bg-mole-bg'
              } ${item.isHidden ? 'opacity-50' : ''}`}
              onClick={() => toggleSelect(item.path)}
              onDoubleClick={() => item.isDirectory ? navigate(item.path) : handleOpen(item.path)}>

              {/* Icon */}
              {item.driveInfo ? (
                <HardDrive size={18} className="text-mole-accent shrink-0" />
              ) : item.isDirectory ? (
                <FolderOpen size={18} className="text-yellow-400 shrink-0" />
              ) : (
                <File size={18} className="text-mole-text-muted shrink-0" />
              )}

              {/* Name */}
              <div className="flex-1 min-w-0">
                {renaming === item.path ? (
                  <input value={renameValue} onChange={e => setRenameValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleRename(item.path); if (e.key === 'Escape') setRenaming(null) }}
                    onClick={e => e.stopPropagation()} autoFocus
                    className="bg-mole-bg border border-mole-accent rounded px-2 py-0.5 text-sm w-full focus:outline-none" />
                ) : (
                  <p className="text-sm truncate">{item.name}</p>
                )}
                {item.driveInfo && (
                  <div className="mt-1">
                    <div className="h-1.5 bg-mole-bg rounded-full overflow-hidden w-32">
                      <div className="h-full bg-mole-accent rounded-full"
                        style={{ width: `${item.driveInfo.totalSize ? (item.driveInfo.usedSpace / item.driveInfo.totalSize) * 100 : 0}%` }} />
                    </div>
                    <p className="text-[10px] text-mole-text-muted mt-0.5">
                      {formatSize(item.driveInfo.freeSpace)} {tx('bos', 'free')} / {formatSize(item.driveInfo.totalSize)}
                    </p>
                  </div>
                )}
              </div>

              {/* Meta */}
              {!item.driveInfo && (
                <span className="text-xs text-mole-text-muted shrink-0 w-20 text-right">
                  {item.isDirectory ? '' : formatSize(item.size)}
                </span>
              )}
              {!item.driveInfo && (
                <span className="text-xs text-mole-text-muted shrink-0 w-36 text-right hidden lg:block">
                  {item.lastModified}
                </span>
              )}

              {/* Actions */}
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button onClick={e => { e.stopPropagation(); setRenaming(item.path); setRenameValue(item.name) }}
                  className="p-1.5 rounded hover:bg-mole-bg" title={tx('Yeniden adlandir', 'Rename')}>
                  <Pencil size={13} />
                </button>
                <button onClick={e => { e.stopPropagation(); handleInfo(item.path) }}
                  className="p-1.5 rounded hover:bg-mole-bg" title={tx('Bilgi', 'Info')}>
                  <Info size={13} />
                </button>
                <button onClick={e => { e.stopPropagation(); handleOpen(item.path) }}
                  className="p-1.5 rounded hover:bg-mole-bg" title={tx('Klasorde ac', 'Open in Explorer')}>
                  <ExternalLink size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info panel */}
      {infoItem && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setInfoItem(null)}>
          <div className="bg-mole-surface border border-mole-border rounded-xl p-6 w-96 max-w-[90vw] space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">{tx('Dosya Bilgisi', 'File Info')}</h3>
              <button onClick={() => setInfoItem(null)} className="p-1 rounded hover:bg-mole-bg"><X size={16} /></button>
            </div>
            <div className="space-y-2 text-sm">
              <Row label={tx('Ad', 'Name')} value={infoItem.name} />
              <Row label={tx('Yol', 'Path')} value={infoItem.path} mono />
              <Row label={tx('Boyut', 'Size')} value={formatSize(infoItem.size)} />
              <Row label={tx('Tur', 'Type')} value={infoItem.isDirectory ? tx('Klasor', 'Folder') : (infoItem.extension || '-')} />
              <Row label={tx('Degistirilme', 'Modified')} value={infoItem.lastModified} />
              <Row label={tx('Olusturulma', 'Created')} value={infoItem.createdAt} />
              {infoItem.fileCount !== undefined && <Row label={tx('Dosya Sayisi', 'Files')} value={infoItem.fileCount} />}
              {infoItem.folderCount !== undefined && <Row label={tx('Klasor Sayisi', 'Folders')} value={infoItem.folderCount} />}
              <Row label={tx('Gizli', 'Hidden')} value={infoItem.isHidden ? tx('Evet', 'Yes') : tx('Hayir', 'No')} />
              <Row label={tx('Salt Okunur', 'Read Only')} value={infoItem.isReadOnly ? tx('Evet', 'Yes') : tx('Hayir', 'No')} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ label, value, mono }: { label: string; value: any; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-mole-text-muted shrink-0">{label}</span>
      <span className={`text-right truncate ${mono ? 'font-mono text-xs' : ''}`}>{String(value)}</span>
    </div>
  )
}
