import { app } from 'electron'
import fs from 'fs'
import path from 'path'

export interface OperationLog {
  timestamp: string
  action: string
  category: string
  itemCount: number
  sizeFreed: number
  status: 'success' | 'partial' | 'error'
  details?: string
}

let logDir = ''

export class LoggerService {
  static init() {
    logDir = path.join(app.getPath('userData'), 'logs')
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true })
  }

  static log(entry: OperationLog) {
    const today = new Date().toISOString().split('T')[0]
    const logFile = path.join(logDir, `mole-${today}.json`)

    let entries: OperationLog[] = []
    try {
      if (fs.existsSync(logFile)) {
        entries = JSON.parse(fs.readFileSync(logFile, 'utf-8'))
      }
    } catch {}

    entries.push({ ...entry, timestamp: new Date().toISOString() })
    fs.writeFileSync(logFile, JSON.stringify(entries, null, 2))
  }

  static getLogs(date?: string): OperationLog[] {
    const today = date || new Date().toISOString().split('T')[0]
    const logFile = path.join(logDir, `mole-${today}.json`)
    try {
      if (fs.existsSync(logFile)) {
        return JSON.parse(fs.readFileSync(logFile, 'utf-8'))
      }
    } catch {}
    return []
  }

  static getLogDates(): string[] {
    try {
      return fs.readdirSync(logDir)
        .filter(f => f.startsWith('mole-') && f.endsWith('.json'))
        .map(f => f.replace('mole-', '').replace('.json', ''))
        .sort()
        .reverse()
    } catch {
      return []
    }
  }
}
