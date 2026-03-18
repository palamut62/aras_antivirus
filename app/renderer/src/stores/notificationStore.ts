import { create } from 'zustand'

export type NotificationType = 'info' | 'success' | 'warning' | 'error'

export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  message?: string
  action?: { label: string; route: string }
  autoDismiss?: number // ms, default 5000
  createdAt: number
}

interface NotificationState {
  notifications: AppNotification[]
  push: (n: Omit<AppNotification, 'id' | 'createdAt'>) => string
  dismiss: (id: string) => void
  clear: () => void
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],

  push: (n) => {
    const id = 'notif_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6)
    const notification: AppNotification = {
      ...n,
      id,
      createdAt: Date.now(),
      autoDismiss: n.autoDismiss ?? 5000,
    }
    set((s) => ({ notifications: [...s.notifications, notification] }))
    return id
  },

  dismiss: (id) => {
    set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) }))
  },

  clear: () => set({ notifications: [] }),
}))
