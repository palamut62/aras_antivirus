import { app } from 'electron'
import fs from 'fs'
import path from 'path'
import log from 'electron-log'

export interface MoleSettings {
  dryRunDefault: boolean
  sendToRecycleBin: boolean
  theme: 'dark' | 'light'
  protectedPaths: string[]
  devFolders: string[]
  customScanFolders: string[]
  loggingEnabled: boolean
  language: 'tr' | 'en'
  liveProtection: boolean
  autoStart: boolean
  scheduledScan: boolean
  scheduledScanInterval: 'hourly' | 'daily' | 'weekly'
  scheduledScanHours: number // every X hours (for hourly mode)
}

const DEFAULT_SETTINGS: MoleSettings = {
  dryRunDefault: true,
  sendToRecycleBin: true,
  theme: 'dark',
  protectedPaths: [
    'C:\\Windows',
    'C:\\Program Files',
    'C:\\Program Files (x86)',
  ],
  devFolders: [],
  customScanFolders: [],
  loggingEnabled: true,
  language: 'tr',
  liveProtection: true,
  autoStart: true,
  scheduledScan: false,
  scheduledScanInterval: 'daily',
  scheduledScanHours: 6,
}

let settingsPath = ''
let currentSettings: MoleSettings = { ...DEFAULT_SETTINGS }

export class SettingsService {
  static init() {
    const appData = app.getPath('userData')
    settingsPath = path.join(appData, 'settings.json')
    this.load()
  }

  static load() {
    try {
      if (fs.existsSync(settingsPath)) {
        const raw = fs.readFileSync(settingsPath, 'utf-8')
        currentSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
      } else {
        this.save()
      }
    } catch (err) {
      log.error('[Settings] Load error:', err)
      currentSettings = { ...DEFAULT_SETTINGS }
    }
  }

  static save() {
    try {
      const dir = path.dirname(settingsPath)
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(settingsPath, JSON.stringify(currentSettings, null, 2))
    } catch (err) {
      log.error('[Settings] Save error:', err)
    }
  }

  static get(): MoleSettings {
    return { ...currentSettings }
  }

  static update(partial: Partial<MoleSettings>) {
    currentSettings = { ...currentSettings, ...partial }
    this.save()
    return this.get()
  }
}
