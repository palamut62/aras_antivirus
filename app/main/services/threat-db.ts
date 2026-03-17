import { app } from 'electron'
import fs from 'fs'
import path from 'path'
import log from 'electron-log'

export interface ThreatRecord {
  id: string
  timestamp: string
  filePath: string
  fileName: string
  sha256: string
  threatType: 'virus' | 'trojan' | 'malware' | 'adware' | 'spyware' | 'ransomware' | 'pup' | 'unknown'
  threatName: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  riskScore: number
  entropy?: number
  sizeBytes?: number
  action: 'quarantined' | 'deleted' | 'ignored' | 'detected'
  source: 'scan' | 'realtime' | 'usb' | 'network'
  details: string
  heuristicMatches?: string[]
}

let dbPath = ''
let threats: ThreatRecord[] = []

export class ThreatDB {
  static init() {
    const appData = app.getPath('userData')
    dbPath = path.join(appData, 'threats.json')
    this.load()
  }

  static load() {
    try {
      if (fs.existsSync(dbPath)) {
        threats = JSON.parse(fs.readFileSync(dbPath, 'utf-8'))
      }
    } catch (err) {
      log.error('[ThreatDB] Load error:', err)
      threats = []
    }
  }

  static save() {
    try {
      const dir = path.dirname(dbPath)
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(dbPath, JSON.stringify(threats, null, 2))
    } catch (err) {
      log.error('[ThreatDB] Save error:', err)
    }
  }

  static add(entry: Omit<ThreatRecord, 'id' | 'timestamp'>): ThreatRecord {
    // Don't duplicate same file+hash
    const existing = threats.find(t => t.sha256 === entry.sha256 && t.filePath === entry.filePath)
    if (existing) {
      // Update action
      existing.action = entry.action
      existing.timestamp = new Date().toISOString()
      this.save()
      return existing
    }

    const newEntry: ThreatRecord = {
      ...entry,
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      timestamp: new Date().toISOString(),
    }
    threats.unshift(newEntry)
    if (threats.length > 10000) threats = threats.slice(0, 10000)
    this.save()
    return newEntry
  }

  static getAll(limit = 100, offset = 0): ThreatRecord[] {
    return threats.slice(offset, offset + limit)
  }

  static getByType(type: string, limit = 100): ThreatRecord[] {
    return threats.filter(t => t.threatType === type).slice(0, limit)
  }

  static getBySeverity(severity: string, limit = 100): ThreatRecord[] {
    return threats.filter(t => t.severity === severity).slice(0, limit)
  }

  static search(query: string, limit = 100): ThreatRecord[] {
    const q = query.toLowerCase()
    return threats.filter(t =>
      t.fileName.toLowerCase().includes(q) ||
      t.filePath.toLowerCase().includes(q) ||
      t.threatName.toLowerCase().includes(q) ||
      t.threatType.includes(q) ||
      t.sha256.includes(q)
    ).slice(0, limit)
  }

  static getStats() {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    return {
      total: threats.length,
      today: threats.filter(t => t.timestamp >= today).length,
      byType: {
        virus: threats.filter(t => t.threatType === 'virus').length,
        trojan: threats.filter(t => t.threatType === 'trojan').length,
        malware: threats.filter(t => t.threatType === 'malware').length,
        adware: threats.filter(t => t.threatType === 'adware').length,
        spyware: threats.filter(t => t.threatType === 'spyware').length,
        ransomware: threats.filter(t => t.threatType === 'ransomware').length,
        pup: threats.filter(t => t.threatType === 'pup').length,
        unknown: threats.filter(t => t.threatType === 'unknown').length,
      },
      bySeverity: {
        critical: threats.filter(t => t.severity === 'critical').length,
        high: threats.filter(t => t.severity === 'high').length,
        medium: threats.filter(t => t.severity === 'medium').length,
        low: threats.filter(t => t.severity === 'low').length,
      },
      quarantined: threats.filter(t => t.action === 'quarantined').length,
      deleted: threats.filter(t => t.action === 'deleted').length,
    }
  }

  static updateAction(id: string, action: ThreatRecord['action']) {
    const t = threats.find(t => t.id === id)
    if (t) {
      t.action = action
      this.save()
      return t
    }
    return null
  }

  static delete(id: string) {
    threats = threats.filter(t => t.id !== id)
    this.save()
  }

  static clear() {
    threats = []
    this.save()
  }
}
