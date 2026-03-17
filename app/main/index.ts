import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, dialog } from 'electron'
import path from 'path'
import { registerIpcHandlers } from './ipc/handlers'
import { SettingsService } from './services/settings'
import log from 'electron-log'
import { startBackgroundGuard, stopBackgroundGuard, setMainWindow } from './services/background-guard'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null

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
    icon: path.join(__dirname, '../../assets/icon.ico'),
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

function createTray() {
  const iconPath = path.join(__dirname, '../../assets/icon.ico')
  const icon = nativeImage.createFromPath(iconPath)
  tray = new Tray(icon.resize({ width: 16, height: 16 }))

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Aras Antivirüs', enabled: false },
    { type: 'separator' },
    {
      label: 'Göster',
      click: () => { mainWindow?.show(); mainWindow?.focus() },
    },
    {
      label: 'Hızlı Tarama',
      click: () => { mainWindow?.show(); mainWindow?.focus(); mainWindow?.webContents.send('navigate', '/security-scan') },
    },
    {
      label: 'Canlı Koruma',
      click: () => { mainWindow?.show(); mainWindow?.focus(); mainWindow?.webContents.send('navigate', '/realtime') },
    },
    {
      label: 'Arka Plan Korumayı Durdur',
      click: () => { stopBackgroundGuard() },
    },
    {
      label: 'Arka Plan Korumayı Başlat',
      click: () => { startBackgroundGuard() },
    },
    { type: 'separator' },
    {
      label: 'Çıkış',
      click: () => { (app as any).isQuitting = true; app.quit() },
    },
  ])

  tray.setToolTip('Aras Antivirüs - Koruma Aktif')
  tray.setContextMenu(contextMenu)
  tray.on('double-click', () => { mainWindow?.show(); mainWindow?.focus() })
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
      if (action === 'start') { startBackgroundGuard(); return { running: true } }
      if (action === 'stop') { stopBackgroundGuard(); return { running: false } }
      // status
      const { isGuardRunning } = require('./services/background-guard')
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
    if (settings.autoStart) setupAutostart()
    if (settings.liveProtection) startBackgroundGuard()
    log.info('Aras Antivirüs started', { liveProtection: settings.liveProtection, autoStart: settings.autoStart })
  })

  app.on('window-all-closed', () => { /* stay in tray */ })
  app.on('before-quit', () => {
    (app as any).isQuitting = true
    stopBackgroundGuard()
  })
}
