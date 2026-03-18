import { BrowserWindow, Notification } from 'electron'
import { runPowerShell } from './powershell'
import { SettingsService } from './settings'
import { HistoryDB } from './history-db'
import log from 'electron-log'

let scanInterval: NodeJS.Timeout | null = null
let mainWindowRef: BrowserWindow | null = null

function formatSize(bytes: number): string {
  if (bytes >= 1e9) return (bytes / 1e9).toFixed(2) + ' GB'
  if (bytes >= 1e6) return (bytes / 1e6).toFixed(1) + ' MB'
  if (bytes >= 1e3) return (bytes / 1e3).toFixed(0) + ' KB'
  return bytes + ' B'
}

function tx(tr: string, en: string): string {
  return SettingsService.get().language === 'en' ? en : tr
}

function sendBanner(data: { type: string; title: string; message?: string; action?: { label: string; route: string } }) {
  const win = mainWindowRef || BrowserWindow.getAllWindows()[0]

  const isVisible = !!(win && win.isVisible() && !win.isMinimized())

  if (isVisible && win) {
    win.webContents.send('banner:notify', data)
  } else {
    // Pencere kapalı → native toast
    const toast = new Notification({
      title: `Aras Antivirüs - ${data.title}`,
      body: data.message || '',
    })
    if (data.action && win) {
      toast.on('click', () => {
        win.show()
        win.focus()
        win.webContents.send('navigate', data.action!.route)
      })
    }
    toast.show()

    try {
      const { addTrayLog } = require('../index')
      addTrayLog(data.title)
    } catch {}
  }
}

async function runScheduledScan() {
  log.info('[ScheduledScan] Starting automatic scan...')

  sendBanner({
    type: 'info',
    title: tx('Zamanlanmis tarama baslatildi', 'Scheduled scan started'),
    message: tx('Gereksiz dosyalar taraniyor...', 'Scanning for junk files...'),
  })

  try {
    const result = await runPowerShell('scan-clean.ps1', [], 'scheduled-scan')

    if (result.success && result.data) {
      const totalSize = result.data.totalSize || 0
      const totalItems = result.data.totalItems || 0
      const catCount = result.data.categories?.length || 0

      HistoryDB.add({
        action: 'scan',
        target: 'Scheduled Scan',
        details: `${catCount} categories, ${totalItems} files, ${formatSize(totalSize)} reclaimable`,
        sizeBytes: totalSize,
        status: 'success',
      })

      if (totalSize > 0) {
        sendBanner({
          type: 'warning',
          title: tx(`${formatSize(totalSize)} gereksiz dosya bulundu`, `${formatSize(totalSize)} junk files found`),
          message: tx(
            `${totalItems} dosya, ${catCount} kategori. Temizlemek icin tiklayin.`,
            `${totalItems} files, ${catCount} categories. Click to clean.`
          ),
          action: { label: tx('Temizle', 'Clean'), route: '/deep-clean' },
        })
      } else {
        sendBanner({
          type: 'success',
          title: tx('Zamanlanmis tarama tamamlandi', 'Scheduled scan completed'),
          message: tx('Gereksiz dosya bulunamadi, sisteminiz temiz!', 'No junk files found, your system is clean!'),
        })
      }

      log.info(`[ScheduledScan] Complete: ${totalItems} files, ${formatSize(totalSize)}`)
    } else {
      log.warn('[ScheduledScan] Scan returned no data or failed:', result.error)
    }
  } catch (err) {
    log.error('[ScheduledScan] Error:', err)
  }
}

function getIntervalMs(): number {
  const settings = SettingsService.get()
  switch (settings.scheduledScanInterval) {
    case 'hourly':
      return (settings.scheduledScanHours || 6) * 60 * 60 * 1000
    case 'daily':
      return 24 * 60 * 60 * 1000
    case 'weekly':
      return 7 * 24 * 60 * 60 * 1000
    default:
      return 24 * 60 * 60 * 1000
  }
}

export function startScheduledScan(win?: BrowserWindow) {
  if (win) mainWindowRef = win
  stopScheduledScan()

  const settings = SettingsService.get()
  if (!settings.scheduledScan) return

  const intervalMs = getIntervalMs()
  log.info(`[ScheduledScan] Started, interval: ${intervalMs / 3600000}h`)

  // First scan after 2 minutes (don't scan immediately on boot)
  setTimeout(() => {
    if (SettingsService.get().scheduledScan) {
      runScheduledScan()
    }
  }, 2 * 60 * 1000)

  scanInterval = setInterval(() => {
    if (SettingsService.get().scheduledScan) {
      runScheduledScan()
    }
  }, intervalMs)
}

export function stopScheduledScan() {
  if (scanInterval) {
    clearInterval(scanInterval)
    scanInterval = null
    log.info('[ScheduledScan] Stopped')
  }
}

export function restartScheduledScan(win?: BrowserWindow) {
  startScheduledScan(win)
}
