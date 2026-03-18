import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, dialog, Notification } from 'electron'
import path from 'path'
import { registerIpcHandlers } from './ipc/handlers'
import { SettingsService } from './services/settings'
import log from 'electron-log'
import { startBackgroundGuard, stopBackgroundGuard, setMainWindow, isGuardRunning } from './services/background-guard'
import { startScheduledScan, stopScheduledScan, restartScheduledScan } from './services/scheduled-scan'
import { HistoryDB } from './services/history-db'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let trayUpdateInterval: NodeJS.Timeout | null = null

log.transports.file.level = 'info'
log.transports.console.level = 'debug'

// Autostart - Windows başlangıcında çalıştır
function setupAutostart() {
  app.setLoginItemSettings({
    openAtLogin: true,
    path: app.getPath('exe'),
    args: ['--hidden'],
  })
}

function createWindow() {
  // --hidden argümanıyla başlatılmışsa pencere gizli açılsın
  const startHidden = process.argv.includes('--hidden')

  mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    show: !startHidden,
    icon: getAssetPath('icon.ico'),
    backgroundColor: '#0f1117',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  const isDev = process.env.MOLE_DEV === '1'
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173/')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('close', (e) => {
    if (!(app as any).isQuitting) {
      e.preventDefault()
      mainWindow?.hide()
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function getAssetPath(filename: string): string {
  // In production: app.asar/assets/ ; In dev: project_root/assets/
  const possiblePaths = [
    path.join(__dirname, '../../assets', filename),
    path.join(app.getAppPath(), 'assets', filename),
    path.join(process.resourcesPath || '', 'assets', filename),
  ]
  for (const p of possiblePaths) {
    try { if (require('fs').existsSync(p)) return p } catch {}
  }
  return possiblePaths[0]
}

// --- Dil yardımcısı ---
function tx(tr: string, en: string): string {
  try { return SettingsService.get().language === 'en' ? en : tr } catch { return tr }
}

// --- Activity log for tray menu ---
interface TrayLogEntry {
  time: string
  text: string
}
const trayActivityLog: TrayLogEntry[] = []
const MAX_TRAY_LOG = 5

export function addTrayLog(text: string) {
  const now = new Date()
  const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
  trayActivityLog.unshift({ time, text })
  if (trayActivityLog.length > MAX_TRAY_LOG) trayActivityLog.length = MAX_TRAY_LOG
  updateTrayMenu()
}

function updateTrayMenu() {
  if (!tray) return

  const guardActive = isGuardRunning()
  const settings = SettingsService.get()

  const onOff = (v: boolean) => v ? tx('✅ Açık', '✅ On') : tx('❌ Kapalı', '❌ Off')
  const statusItems: Electron.MenuItemConstructorOptions[] = [
    { label: 'Aras Antivirüs v1.6.0', enabled: false },
    { type: 'separator' },
    { label: `${tx('Canlı Koruma', 'Live Protection')}: ${onOff(settings.liveProtection)}`, enabled: false },
    { label: `${tx('Arka Plan Koruma', 'Background Guard')}: ${guardActive ? tx('✅ Çalışıyor', '✅ Running') : tx('⏹ Durdu', '⏹ Stopped')}`, enabled: false },
    { label: `${tx('Zamanlanmış Tarama', 'Scheduled Scan')}: ${onOff(settings.scheduledScan)}`, enabled: false },
    { type: 'separator' },
  ]

  const actionItems: Electron.MenuItemConstructorOptions[] = [
    {
      label: tx('Göster', 'Show'),
      click: () => { mainWindow?.show(); mainWindow?.focus() },
    },
    {
      label: tx('Hızlı Tarama', 'Quick Scan'),
      click: () => { mainWindow?.show(); mainWindow?.focus(); mainWindow?.webContents.send('navigate', '/security-scan') },
    },
    {
      label: tx('Canlı Koruma', 'Live Protection'),
      click: () => { mainWindow?.show(); mainWindow?.focus(); mainWindow?.webContents.send('navigate', '/realtime') },
    },
    { type: 'separator' },
    guardActive
      ? { label: tx('⏹ Arka Plan Korumayı Durdur', '⏹ Stop Background Guard'), click: () => { stopBackgroundGuard(); addTrayLog(tx('Arka plan koruma durduruldu', 'Background guard stopped')); } }
      : { label: tx('▶ Arka Plan Korumayı Başlat', '▶ Start Background Guard'), click: () => { startBackgroundGuard(); addTrayLog(tx('Arka plan koruma başlatıldı', 'Background guard started')); } },
    { type: 'separator' },
  ]

  const logItems: Electron.MenuItemConstructorOptions[] = []
  if (trayActivityLog.length > 0) {
    logItems.push({ label: tx('📋 Son İşlemler', '📋 Recent Activity'), enabled: false })
    for (const entry of trayActivityLog.slice(0, 5)) {
      logItems.push({ label: `  ${entry.time} - ${entry.text}`, enabled: false })
    }
    logItems.push({ type: 'separator' })
  }

  const exitItem: Electron.MenuItemConstructorOptions[] = [
    {
      label: tx('Çıkış', 'Exit'),
      click: () => { (app as any).isQuitting = true; app.quit() },
    },
  ]

  const contextMenu = Menu.buildFromTemplate([
    ...statusItems,
    ...actionItems,
    ...logItems,
    ...exitItem,
  ])

  const guardStatus = guardActive ? tx('Koruma Aktif', 'Protection Active') : tx('Koruma Pasif', 'Protection Inactive')
  tray.setToolTip(`Aras Antivirüs - ${guardStatus}`)
  tray.setContextMenu(contextMenu)
}

function createTray() {
  const iconPath = getAssetPath('icon.ico')
  const icon = nativeImage.createFromPath(iconPath)
  tray = new Tray(icon.resize({ width: 16, height: 16 }))

  updateTrayMenu()
  tray.on('double-click', () => { mainWindow?.show(); mainWindow?.focus() })

  // Tray menüsünü periyodik güncelle (durum değişiklikleri için)
  trayUpdateInterval = setInterval(updateTrayMenu, 30000)
}

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      mainWindow.show()
      mainWindow.focus()
    }
  })

  app.whenReady().then(() => {
    SettingsService.init()
    registerIpcHandlers()

    // Window control IPC
    ipcMain.on('window:minimize', () => mainWindow?.minimize())
    ipcMain.on('window:maximize', () => {
      if (mainWindow?.isMaximized()) mainWindow.unmaximize()
      else mainWindow?.maximize()
    })
    ipcMain.on('window:close', () => mainWindow?.hide())

    // Guard control
    ipcMain.handle('guard:control', async (_e, action: string) => {
      if (action === 'start') { startBackgroundGuard(); addTrayLog(tx('Arka plan koruma başlatıldı', 'Background guard started')); return { running: true } }
      if (action === 'stop') { stopBackgroundGuard(); addTrayLog(tx('Arka plan koruma durduruldu', 'Background guard stopped')); return { running: false } }
      return { running: isGuardRunning() }
    })

    // Folder picker dialog
    ipcMain.handle('dialog:pick-folder', async () => {
      const result = await dialog.showOpenDialog(mainWindow!, {
        properties: ['openDirectory'],
        title: 'Klasör Seç',
      })
      return result.canceled ? null : result.filePaths[0]
    })

    createWindow()
    if (mainWindow) setMainWindow(mainWindow)
    createTray()

    const settings = SettingsService.get()
    // VT API key'i env variable olarak ayarla (PS scriptleri kullanır)
    if (settings.virusTotalApiKey) {
      process.env.VIRUSTOTAL_API_KEY = settings.virusTotalApiKey
    }
    if (settings.autoStart) setupAutostart()
    if (settings.liveProtection) {
      startBackgroundGuard()
      addTrayLog(tx('Arka plan koruma otomatik başlatıldı', 'Background guard auto-started'))
    }
    if (settings.scheduledScan) {
      startScheduledScan(mainWindow!)
      addTrayLog(tx('Zamanlanmış tarama aktif', 'Scheduled scan active'))
    }
    addTrayLog(tx('Aras Antivirüs başlatıldı', 'Aras Antivirus started'))
    log.info('Aras Antivirüs started', { liveProtection: settings.liveProtection, autoStart: settings.autoStart, scheduledScan: settings.scheduledScan })
  })

  app.on('window-all-closed', () => { /* stay in tray */ })
  app.on('before-quit', () => {
    (app as any).isQuitting = true
    stopBackgroundGuard()
    stopScheduledScan()
    if (trayUpdateInterval) clearInterval(trayUpdateInterval)
  })
}
