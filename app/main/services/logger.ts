import { app } from 'electron'
import fs from 'fs'
import path from 'path'
import electronLog from 'electron-log'

export interface OperationLog {
  timestamp: string
  action: string
  category: string
  itemCount: number
  sizeFreed: number
  status: 'success' | 'partial' | 'error'
  details?: string
}

export interface RuntimeLogEntry {
  timestamp: string
  level: 'info' | 'warn' | 'error' | 'debug'
  source: string
  message: string
  raw: string
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

  static getRuntimeLogs(limit = 500): RuntimeLogEntry[] {
    const candidates = [
      (() => {
        try { return electronLog.transports.file.getFile().path } catch { return '' }
      })(),
      path.join(app.getPath('userData'), 'logs', 'main.log'),
      path.join(app.getPath('userData'), 'logs', 'renderer.log'),
    ].filter(Boolean)

    let selectedPath = ''
    for (const p of candidates) {
      try {
        if (fs.existsSync(p)) {
          selectedPath = p
          break
        }
      } catch {}
    }
    if (!selectedPath) return []

    let lines: string[] = []
    try {
      lines = fs.readFileSync(selectedPath, 'utf-8').split(/\r?\n/).filter(Boolean)
    } catch {
      return []
    }

    const tail = lines.slice(-Math.max(1, limit))
    return tail.map((raw) => {
      const m = raw.match(/^\[([^\]]+)\]\s+\[([^\]]+)\]\s+(.*)$/)
      const timestamp = m?.[1] || ''
      const levelRaw = (m?.[2] || 'info').toLowerCase()
      const message = m?.[3] || raw
      const level: RuntimeLogEntry['level'] =
        levelRaw.includes('error') ? 'error'
          : levelRaw.includes('warn') ? 'warn'
            : levelRaw.includes('debug') ? 'debug'
              : 'info'

      const srcMatch = message.match(/^\[([^\]]+)\]\s*/)
      const source = srcMatch?.[1] || 'app'

      return {
        timestamp,
        level,
        source,
        message,
        raw,
      }
    })
  }
}
