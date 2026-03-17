import { ipcMain } from 'electron'
import os from 'os'
import { runPowerShell, cancelTask } from '../services/powershell'
import { SettingsService } from '../services/settings'
import { LoggerService } from '../services/logger'
import log from 'electron-log'
import { HistoryDB } from '../services/history-db'
import { ThreatDB } from '../services/threat-db'

export function registerIpcHandlers() {
  LoggerService.init()
  HistoryDB.init()
  ThreatDB.init()

  // === CLEANUP ===
  ipcMain.handle('scan:run', async () => {
    log.info('[IPC] scan:run')
    const result = await runPowerShell('scan-clean.ps1', [], 'scan')
    HistoryDB.add({
      action: 'scan',
      target: 'System Scan',
      details: result.success
        ? `${result.data?.categories?.length || 0} categories, ${result.data?.totalItems || 0} files found`
        : (result.error || 'Scan failed'),
      sizeBytes: result.data?.totalSize || 0,
      status: result.success ? 'success' : 'error',
    })
    return result
  })

  ipcMain.handle('clean:execute', async (_e, categories: string[]) => {
    log.info('[IPC] clean:execute', categories)
    const settings = SettingsService.get()
    const args = ['-Category', categories.join(',')]
    if (settings.sendToRecycleBin) args.push('-UseRecycleBin')
    if (settings.dryRunDefault) args.push('-DryRun')
    const result = await runPowerShell('run-clean.ps1', args, 'clean')
    LoggerService.log({
      timestamp: '', action: 'clean', category: categories.join(', '),
      itemCount: result.data?.itemCount || 0, sizeFreed: result.data?.sizeFreed || 0,
      status: result.success ? 'success' : 'error',
    })
    HistoryDB.add({
      action: 'clean',
      target: categories.join(', '),
      details: result.success
        ? `${result.data?.itemCount || 0} items cleaned, ${result.data?.sizeFreed || 0} bytes freed`
        : (result.error || 'Clean failed'),
      sizeBytes: result.data?.sizeFreed || 0,
      status: result.success ? 'success' : 'error',
    })
    return result
  })

  ipcMain.handle('purge:scan', async (_e, folders: string[]) => {
    return await runPowerShell('scan-purge.ps1', ['-Path', folders.join(',')], 'purge-scan')
  })

  ipcMain.handle('purge:execute', async (_e, targets: string[]) => {
    const result = await runPowerShell('run-purge.ps1', ['-Target', targets.join(',')], 'purge-exec')
    HistoryDB.add({
      action: 'purge',
      target: `${targets.length} artifacts`,
      details: result.success
        ? `Purge completed, ${result.data?.sizeFreed || 0} bytes freed`
        : (result.error || 'Purge failed'),
      sizeBytes: result.data?.sizeFreed || 0,
      status: result.success ? 'success' : 'error',
    })
    return result
  })

  ipcMain.handle('analyze:disk', async (_e, path: string) => {
    return await runPowerShell('analyze-disk.ps1', ['-Path', path], 'analyze')
  })

  // === SECURITY ===
  ipcMain.handle('security:scan', async (_e, scanType: string, path?: string) => {
    const args = ['-ScanType', scanType]
    if (path) args.push('-Path', path)
    const result = await runPowerShell('security-scan.ps1', args, 'security-scan')
    const threatCount = result.data?.threats?.length || 0
    HistoryDB.add({
      action: 'scan',
      target: `Security Scan (${scanType})${path ? ': ' + path : ''}`,
      details: result.success
        ? `${result.data?.scannedFiles || 0} files scanned, ${threatCount} threats found`
        : (result.error || 'Security scan failed'),
      riskScore: threatCount > 0 ? Math.max(...(result.data?.threats?.map((t: any) => t.riskScore) || [0])) : 0,
      status: result.success ? 'success' : 'error',
    })
    return result
  })

  ipcMain.handle('security:processes', async () => {
    return await runPowerShell('process-monitor.ps1', [], 'process-mon')
  })

  ipcMain.handle('quarantine:action', async (_e, action: string, filePath?: string, quarantineId?: string) => {
    const args = ['-Action', action]
    if (filePath) args.push('-FilePath', filePath)
    if (quarantineId) args.push('-QuarantineId', quarantineId)
    const result = await runPowerShell('quarantine.ps1', args, 'quarantine')
    const histAction = action === 'add' ? 'quarantine' : action === 'restore' ? 'restore' : 'delete'
    HistoryDB.add({
      action: histAction as any,
      target: filePath || quarantineId || 'unknown',
      details: result.success ? `Quarantine ${action} completed` : (result.error || `Quarantine ${action} failed`),
      status: result.success ? 'success' : 'error',
    })
    return result
  })

  ipcMain.handle('security:repo', async (_e, path: string) => {
    return await runPowerShell('repo-scan.ps1', ['-Path', path], 'repo-scan')
  })

  ipcMain.handle('security:live-guard', async (_e, watchPaths: string[]) => {
    return await runPowerShell('live-guard.ps1', ['-WatchPaths', watchPaths.join(',')], 'live-guard')
  })

  // === WEB / USB / NETWORK ===
  ipcMain.handle('web:protection', async (_e, action: string) => {
    return await runPowerShell('web-protection.ps1', ['-Action', action], 'web-' + action)
  })

  ipcMain.handle('usb:monitor', async (_e, action: string, driveLetter?: string) => {
    const args = ['-Action', action]
    if (driveLetter) args.push('-DriveLetter', driveLetter)
    return await runPowerShell('usb-monitor.ps1', args, 'usb-' + action)
  })

  ipcMain.handle('network:monitor', async (_e, action: string, remoteAddress?: string, pid?: number, ruleName?: string) => {
    const args: string[] = ['-Action', action]
    if (remoteAddress) args.push('-RemoteAddress', remoteAddress)
    if (pid && pid > 0) args.push('-ProcessId', String(pid))
    if (ruleName) args.push('-RuleName', ruleName)
    return await runPowerShell('network-monitor.ps1', args, 'net-' + action)
  })

  // === FILE EXPLORER ===
  ipcMain.handle('file:list', async (_e, path?: string) => {
    const args = ['-Action', 'list']
    if (path) args.push('-Path', path)
    return await runPowerShell('file-explorer.ps1', args, 'file-list')
  })

  ipcMain.handle('file:delete', async (_e, path: string) => {
    return await runPowerShell('file-explorer.ps1', ['-Action', 'delete', '-Path', path], 'file-delete')
  })

  ipcMain.handle('file:rename', async (_e, path: string, newName: string) => {
    return await runPowerShell('file-explorer.ps1', ['-Action', 'rename', '-Path', path, '-NewName', newName], 'file-rename')
  })

  ipcMain.handle('file:copy', async (_e, path: string, destination: string) => {
    return await runPowerShell('file-explorer.ps1', ['-Action', 'copy', '-Path', path, '-Destination', destination], 'file-copy')
  })

  ipcMain.handle('file:move', async (_e, path: string, destination: string) => {
    return await runPowerShell('file-explorer.ps1', ['-Action', 'move', '-Path', path, '-Destination', destination], 'file-move')
  })

  ipcMain.handle('file:create-folder', async (_e, path: string) => {
    return await runPowerShell('file-explorer.ps1', ['-Action', 'create-folder', '-Path', path], 'file-mkdir')
  })

  ipcMain.handle('file:info', async (_e, path: string) => {
    return await runPowerShell('file-explorer.ps1', ['-Action', 'info', '-Path', path], 'file-info')
  })

  ipcMain.handle('file:open', async (_e, path: string) => {
    return await runPowerShell('file-explorer.ps1', ['-Action', 'open', '-Path', path], 'file-open')
  })

  // === APP UNINSTALLER ===
  ipcMain.handle('app:uninstaller', async (_e, action: string, appId?: string) => {
    const args = ['-Action', action]
    if (appId) args.push('-AppId', appId)
    const result = await runPowerShell('app-uninstaller.ps1', args, 'app-uninstall-' + action)
    if (action === 'uninstall' && result.success) {
      HistoryDB.add({
        action: 'uninstall' as any,
        target: (result as any).appName || appId || 'unknown',
        details: `App uninstalled, ${(result as any).leftoverCount || 0} leftovers found`,
        status: 'success',
      })
    }
    return result
  })

  // === SYSTEM OPTIMIZE ===
  ipcMain.handle('system:optimize', async (_e, action: string, tasks?: string[]) => {
    const args = ['-Action', action]
    if (tasks && tasks.length > 0) args.push('-Tasks', tasks.join(','))
    const result = await runPowerShell('system-optimize.ps1', args, 'sys-opt-' + action)
    if (action === 'optimize' && result.success) {
      HistoryDB.add({
        action: 'optimize' as any,
        target: `${result.data?.completedCount || 0} tasks`,
        details: `Optimization completed, ${result.data?.totalSizeFreed || 0} bytes freed`,
        sizeBytes: result.data?.totalSizeFreed || 0,
        status: 'success',
      })
    }
    return result
  })

  // === INSTALLER CLEANUP ===
  ipcMain.handle('installer:cleanup', async (_e, action: string, targets?: string[]) => {
    const args = ['-Action', action]
    if (targets && targets.length > 0) args.push('-Targets', targets.join('|'))
    const result = await runPowerShell('installer-cleanup.ps1', args, 'installer-' + action)
    if (action === 'clean' && result.success) {
      HistoryDB.add({
        action: 'clean' as any,
        target: `${result.data?.cleaned || 0} installer files`,
        details: `Installer cleanup, ${result.data?.cleanedSize || 0} bytes freed`,
        sizeBytes: result.data?.cleanedSize || 0,
        status: 'success',
      })
    }
    return result
  })

  // === SYSTEM ===
  ipcMain.handle('status:get', async () => {
    return await runPowerShell('status.ps1', [], 'status')
  })

  ipcMain.handle('task:cancel', async (_e, taskId: string) => {
    return cancelTask(taskId)
  })

  ipcMain.handle('settings:get', async () => SettingsService.get())
  ipcMain.handle('settings:update', async (_e, partial: any) => SettingsService.update(partial))
  ipcMain.handle('logs:list', async (_e, date?: string) => LoggerService.getLogs(date))
  ipcMain.handle('logs:dates', async () => LoggerService.getLogDates())

  // === HISTORY DB ===
  ipcMain.handle('history:list', async (_e, limit?: number, offset?: number) => {
    return HistoryDB.getAll(limit || 100, offset || 0)
  })

  ipcMain.handle('history:add', async (_e, entry: any) => {
    return HistoryDB.add(entry)
  })

  ipcMain.handle('history:search', async (_e, query: string) => {
    return HistoryDB.search(query)
  })

  ipcMain.handle('history:stats', async () => {
    return HistoryDB.getStats()
  })

  ipcMain.handle('history:by-action', async (_e, action: string) => {
    return HistoryDB.getByAction(action)
  })

  // === RESOURCE USAGE ===
  let lastCpuInfo = os.cpus().map(c => ({ idle: c.times.idle, total: Object.values(c.times).reduce((a, b) => a + b, 0) }))

  ipcMain.handle('system:resource-usage', async () => {
    const cpus = os.cpus()
    const currentInfo = cpus.map(c => ({ idle: c.times.idle, total: Object.values(c.times).reduce((a, b) => a + b, 0) }))

    let idleDiff = 0, totalDiff = 0
    for (let i = 0; i < cpus.length; i++) {
      idleDiff += currentInfo[i].idle - lastCpuInfo[i].idle
      totalDiff += currentInfo[i].total - lastCpuInfo[i].total
    }
    lastCpuInfo = currentInfo
    const cpuPercent = totalDiff > 0 ? ((1 - idleDiff / totalDiff) * 100) : 0

    const totalMem = os.totalmem()
    const freeMem = os.freemem()
    const usedMem = totalMem - freeMem

    return {
      cpu: cpuPercent,
      memory: { used: usedMem, total: totalMem, percent: (usedMem / totalMem) * 100 },
    }
  })

  // === THREAT DB ===
  ipcMain.handle('threat:list', async (_e, limit?: number, offset?: number) => {
    return ThreatDB.getAll(limit || 100, offset || 0)
  })

  ipcMain.handle('threat:add', async (_e, entry: any) => {
    return ThreatDB.add(entry)
  })

  ipcMain.handle('threat:search', async (_e, query: string) => {
    return ThreatDB.search(query)
  })

  ipcMain.handle('threat:stats', async () => {
    return ThreatDB.getStats()
  })

  ipcMain.handle('threat:by-type', async (_e, type: string) => {
    return ThreatDB.getByType(type)
  })

  ipcMain.handle('threat:update-action', async (_e, id: string, action: string) => {
    return ThreatDB.updateAction(id, action as any)
  })

  ipcMain.handle('threat:delete', async (_e, id: string) => {
    return ThreatDB.delete(id)
  })
}
