import { create } from 'zustand'

interface QueuedTask {
  id: string
  label: string
  status: 'running' | 'queued' | 'done' | 'error'
  progress?: string
  startedAt?: number
}

interface TaskQueueState {
  tasks: QueuedTask[]
  activeTaskId: string | null

  // Bir işlem başlatmaya çalış. Eğer aktif işlem varsa sıraya al.
  // Callback'i çalıştırılacak fonksiyon. Return: task çalışmaya başladıysa true, sıraya alındıysa false.
  enqueue: (id: string, label: string, fn: () => Promise<any>) => Promise<{ started: boolean; result?: any }>

  updateProgress: (id: string, progress: string) => void
  clearDone: () => void
}

const pendingFns = new Map<string, () => Promise<any>>()

async function processNext(set: any, get: any) {
  const state: TaskQueueState = get()
  if (state.activeTaskId) return // Zaten bir şey çalışıyor

  const next = state.tasks.find(t => t.status === 'queued')
  if (!next) return

  const fn = pendingFns.get(next.id)
  if (!fn) return

  set((s: TaskQueueState) => ({
    activeTaskId: next.id,
    tasks: s.tasks.map(t => t.id === next.id ? { ...t, status: 'running' as const, startedAt: Date.now() } : t),
  }))

  try {
    const result = await fn()
    pendingFns.delete(next.id)
    set((s: TaskQueueState) => ({
      activeTaskId: null,
      tasks: s.tasks.map(t => t.id === next.id ? { ...t, status: 'done' as const } : t),
    }))
    // Process next in queue
    setTimeout(() => processNext(set, get), 100)
    return result
  } catch (err) {
    pendingFns.delete(next.id)
    set((s: TaskQueueState) => ({
      activeTaskId: null,
      tasks: s.tasks.map(t => t.id === next.id ? { ...t, status: 'error' as const } : t),
    }))
    setTimeout(() => processNext(set, get), 100)
  }
}

export const useTaskQueue = create<TaskQueueState>((set, get) => ({
  tasks: [],
  activeTaskId: null,

  enqueue: async (id: string, label: string, fn: () => Promise<any>) => {
    const state = get()

    // Aynı ID'li task zaten çalışıyorsa veya sıradaysa ekleme
    const existing = state.tasks.find(t => t.id === id && (t.status === 'running' || t.status === 'queued'))
    if (existing) {
      return { started: false }
    }

    pendingFns.set(id, fn)

    if (!state.activeTaskId) {
      // Direkt çalıştır
      set((s) => ({
        activeTaskId: id,
        tasks: [...s.tasks.filter(t => t.id !== id), { id, label, status: 'running' as const, startedAt: Date.now() }],
      }))

      try {
        const result = await fn()
        pendingFns.delete(id)
        set((s) => ({
          activeTaskId: null,
          tasks: s.tasks.map(t => t.id === id ? { ...t, status: 'done' as const } : t),
        }))
        // Process queue
        setTimeout(() => processNext(set, get), 100)
        return { started: true, result }
      } catch (err) {
        pendingFns.delete(id)
        set((s) => ({
          activeTaskId: null,
          tasks: s.tasks.map(t => t.id === id ? { ...t, status: 'error' as const } : t),
        }))
        setTimeout(() => processNext(set, get), 100)
        return { started: true, result: null }
      }
    } else {
      // Sıraya al
      set((s) => ({
        tasks: [...s.tasks.filter(t => t.id !== id), { id, label, status: 'queued' as const }],
      }))
      return { started: false }
    }
  },

  updateProgress: (id, progress) => {
    set((s) => ({
      tasks: s.tasks.map(t => t.id === id ? { ...t, progress } : t),
    }))
  },

  clearDone: () => {
    set((s) => ({
      tasks: s.tasks.filter(t => t.status === 'running' || t.status === 'queued'),
    }))
  },
}))
