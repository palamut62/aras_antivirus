import { useState, useEffect, useMemo } from 'react'
import { Network, RefreshCw, ChevronRight, ChevronDown } from 'lucide-react'
import { useLang } from '../contexts/LangContext'

interface Proc {
  pid: number
  parentPid: number
  name: string
  path: string
  memoryMB: number
}

export default function ProcessTree() {
  const { tx } = useLang()
  const [list, setList] = useState<Proc[]>([])
  const [expanded, setExpanded] = useState<Set<number>>(new Set([0, 4]))
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    const r = await window.moleAPI.processTree?.()
    if (r?.success) setList(r.data.processes)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const children = useMemo(() => {
    const m = new Map<number, Proc[]>()
    list.forEach(p => {
      if (!m.has(p.parentPid)) m.set(p.parentPid, [])
      m.get(p.parentPid)!.push(p)
    })
    return m
  }, [list])

  const matchFilter = (p: Proc): boolean => {
    if (!filter) return true
    return p.name.toLowerCase().includes(filter.toLowerCase()) || String(p.pid).includes(filter)
  }

  const subtreeMatches = (pid: number): boolean => {
    const c = children.get(pid) || []
    return c.some(p => matchFilter(p) || subtreeMatches(p.pid))
  }

  const toggle = (pid: number) => {
    setExpanded(prev => {
      const n = new Set(prev)
      if (n.has(pid)) n.delete(pid); else n.add(pid)
      return n
    })
  }

  const render = (pid: number, depth: number): any => {
    const kids = children.get(pid) || []
    return kids.filter(k => matchFilter(k) || subtreeMatches(k.pid)).map(k => {
      const hasKids = (children.get(k.pid) || []).length > 0
      const isOpen = expanded.has(k.pid) || !!filter
      return (
        <div key={k.pid}>
          <div className="flex items-center gap-1 py-0.5 text-sm hover:bg-mole-bg/50" style={{ paddingLeft: depth * 16 }}>
            {hasKids
              ? <button onClick={() => toggle(k.pid)} className="text-mole-text-muted">{isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}</button>
              : <span className="w-3" />}
            <span className="text-mole-text">{k.name}</span>
            <span className="text-mole-text-muted text-xs">PID {k.pid}</span>
            {k.memoryMB > 0 && <span className="text-mole-text-muted text-xs ml-auto">{k.memoryMB} MB</span>}
          </div>
          {isOpen && hasKids && render(k.pid, depth + 1)}
        </div>
      )
    })
  }

  // Roots: pid where parent is not in list, or parent is 0
  const pidSet = new Set(list.map(p => p.pid))
  const rootPids = new Set<number>()
  list.forEach(p => { if (!pidSet.has(p.parentPid)) rootPids.add(p.parentPid) })

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Network size={24} className="text-mole-accent" /> {tx('Process Ağacı', 'Process Tree')}</h1>
      </div>
      <div className="flex gap-2">
        <input value={filter} onChange={e => setFilter(e.target.value)} placeholder={tx('Süzgeç (isim/pid)', 'Filter (name/pid)')}
          className="bg-mole-surface border border-mole-border rounded px-3 py-1.5 text-sm flex-1" />
        <button onClick={load} disabled={loading} className="flex items-center gap-1 px-3 py-1.5 bg-mole-accent rounded text-sm">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> {tx('Yenile', 'Refresh')}
        </button>
      </div>
      <p className="text-xs text-mole-text-muted">{list.length} process</p>
      <div className="bg-mole-surface border border-mole-border rounded p-2 max-h-[600px] overflow-y-auto font-mono">
        {Array.from(rootPids).map(pid => render(pid, 0))}
      </div>
    </div>
  )
}
