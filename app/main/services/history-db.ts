import { app } from 'electron'
import fs from 'fs'
import path from 'path'
import log from 'electron-log'

export interface HistoryEntry {
  id: string
  timestamp: string
  action: 'scan' | 'clean' | 'quarantine' | 'restore' | 'delete' | 'purge' | 'block'
  target: string
  details: string
  riskScore?: number
  sizeBytes?: number
  status: 'success' | 'error' | 'cancelled'
}

let dbPath = ''
let history: HistoryEntry[] = []

export class HistoryDB {
  static init() {
    const appData = app.getPath('userData')
    dbPath = path.join(appData, 'history.json')
    this.load()
  }

  static load() {
    try {
      if (fs.existsSync(dbPath)) {
        history = JSON.parse(fs.readFileSync(dbPath, 'utf-8'))
      }
    } catch (err) {
      log.error('[HistoryDB] Load error:', err)
      history = []
    }
  }

  static save() {
    try {
      const dir = path.dirname(dbPath)
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(dbPath, JSON.stringify(history, null, 2))
    } catch (err) {
      log.error('[HistoryDB] Save error:', err)
    }
  }

  static add(entry: Omit<HistoryEntry, 'id' | 'timestamp'>) {
    const newEntry: HistoryEntry = {
      ...entry,
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      timestamp: new Date().toISOString(),
    }
    history.unshift(newEntry) // newest first
    // Max 5000 entries
    if (history.length > 5000) history = history.slice(0, 5000)
    this.save()
    return newEntry
  }

  static getAll(limit = 100, offset = 0): HistoryEntry[] {
    return history.slice(offset, offset + limit)
  }

  static getByAction(action: string, limit = 100): HistoryEntry[] {
    return history.filter(h => h.action === action).slice(0, limit)
  }

  static search(query: string, limit = 100): HistoryEntry[] {
    const q = query.toLowerCase()
    return history.filter(h =>
      h.target.toLowerCase().includes(q) ||
      h.details.toLowerCase().includes(q) ||
      h.action.includes(q)
    ).slice(0, limit)
  }

  static getStats() {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()

    return {
      totalEntries: history.length,
      todayEntries: history.filter(h => h.timestamp >= today).length,
      totalScans: history.filter(h => h.action === 'scan').length,
      totalCleans: history.filter(h => h.action === 'clean').length,
      totalQuarantined: history.filter(h => h.action === 'quarantine').length,
      totalDeleted: history.filter(h => h.action === 'delete').length,
      totalBlocked: history.filter(h => h.action === 'block').length,
      totalRestored: history.filter(h => h.action === 'restore').length,
    }
  }

  static clear() {
    history = []
    this.save()
  }
}
