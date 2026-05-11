// Tauri 2 adapter: maps the existing window.moleAPI surface to invoke() calls.
// Lets the React renderer run unchanged on top of the Tauri backend.

import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { open as openDialog } from '@tauri-apps/plugin-dialog'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'

async function runPs(script: string, args: string[] = []): Promise<any> {
  try {
    return await invoke('run_ps', { script, args })
  } catch (e: any) {
    return { success: false, data: null, error: String(e) }
  }
}

const isTauriRuntime = typeof (window as any).__TAURI_INTERNALS__ !== 'undefined'

function getAppWin() {
  if (!isTauriRuntime) return null
  try {
    return getCurrentWebviewWindow()
  } catch {
    return null
  }
}

const api = {
  // === CLEANUP ===
  scanRun: () => runPs('scan-clean.ps1', []),
  cleanExecute: async (categories: string[]) => {
    const settings: any = await invoke('settings_get')
    const args = ['-Category', categories.join(',')]
    if (settings.sendToRecycleBin) args.push('-UseRecycleBin')
    if (settings.dryRunDefault) args.push('-DryRun')
    return runPs('run-clean.ps1', args)
  },
  purgeScan: (folders: string[]) => runPs('scan-purge.ps1', ['-Path', folders.join(',')]),
  purgeExecute: (targets: string[]) => runPs('run-purge.ps1', ['-Target', targets.join(',')]),
  analyzeDisk: (path: string) => runPs('analyze-disk.ps1', ['-Path', path]),

  // === SECURITY ===
  securityScan: (scanType: string, path?: string) => {
    const args = ['-ScanType', scanType]
    if (path) args.push('-Path', path)
    return runPs('security-scan.ps1', args)
  },
  processMonitor: () => runPs('process-monitor.ps1', []),
  quarantineAction: (action: string, filePath?: string, quarantineId?: string) => {
    const args = ['-Action', action]
    if (filePath) args.push('-FilePath', filePath)
    if (quarantineId) args.push('-QuarantineId', quarantineId)
    return runPs('quarantine.ps1', args)
  },
  repoScan: (path: string) => runPs('repo-scan.ps1', ['-Path', path]),
  liveGuard: (watchPaths: string[]) => runPs('live-guard.ps1', ['-WatchPaths', watchPaths.join(',')]),

  // === DEFENDER & VIRUSTOTAL ===
  defenderScan: (action: string, path?: string) => {
    const args = ['-Action', action]
    if (path) args.push('-Path', path)
    return runPs('defender-scan.ps1', args)
  },
  virusTotalCheck: (action: string, hash?: string, filePath?: string) => {
    const args = ['-Action', action]
    if (hash) args.push('-Hash', hash)
    if (filePath) args.push('-FilePath', filePath)
    return runPs('virustotal.ps1', args)
  },

  // === WEB / USB / NETWORK ===
  webProtection: (action: string) => runPs('web-protection.ps1', ['-Action', action]),
  usbMonitor: (action: string, driveLetter?: string) => {
    const args = ['-Action', action]
    if (driveLetter) args.push('-DriveLetter', driveLetter)
    return runPs('usb-monitor.ps1', args)
  },
  networkMonitor: (action: string, remoteAddress?: string, pid?: number, ruleName?: string) => {
    const args = ['-Action', action]
    if (remoteAddress) args.push('-RemoteAddress', remoteAddress)
    if (pid && pid > 0) args.push('-ProcessId', String(pid))
    if (ruleName) args.push('-RuleName', ruleName)
    return runPs('network-monitor.ps1', args)
  },

  // === DEVELOPER TOOLS ===
  devServers: (action: string, pid?: number) => {
    const args = ['-Action', action]
    if (pid && pid > 0) args.push('-ProcessId', String(pid))
    return runPs('dev-servers.ps1', args)
  },
  devNodeModules: (action: string, roots?: string[], minAgeDays?: number, targets?: string[]) => {
    const args = ['-Action', action]
    if (roots && roots.length) args.push('-Roots', roots.join(','))
    if (typeof minAgeDays === 'number') args.push('-MinAgeDays', String(minAgeDays))
    if (targets && targets.length) args.push('-Targets', targets.join(','))
    return runPs('node-modules-bulk.ps1', args)
  },
  devDocker: (action: string) => runPs('docker-cleanup.ps1', ['-Action', action]),
  devEditorCleanup: (action: string, pids?: number[]) => {
    const args = ['-Action', action]
    if (pids && pids.length) args.push('-Pids', pids.join(','))
    return runPs('editor-cleanup.ps1', args)
  },
  vulnScan: () => runPs('vuln-scan.ps1', ['-Action', 'scan']),
  behaviorScan: () => runPs('process-events.ps1', ['-Action', 'scan']),
  behaviorWatch: (seconds: number) => runPs('process-events.ps1', ['-Action', 'watch', '-Seconds', String(seconds)]),
  processTree: () => runPs('process-tree.ps1', []),
  devSecretSweep: (roots?: string[]) => {
    const args = ['-Action', 'scan']
    if (roots && roots.length) args.push('-Roots', roots.join(','))
    return runPs('secret-sweep.ps1', args)
  },

  // === APP UNINSTALLER ===
  appUninstaller: async (action: string, appId?: string) => {
    const args = ['-Action', action]
    if (appId) args.push('-AppId', appId)
    const r = await runPs('app-uninstaller.ps1', args)
    const ps = (r as any).data?.data || (r as any).data
    return { success: r.success && (r.data?.success !== false), data: ps, error: r.error || r.data?.error }
  },

  // === SYSTEM OPTIMIZE ===
  systemOptimize: async (action: string, tasks?: string[]) => {
    const args = ['-Action', action]
    if (tasks && tasks.length) args.push('-Tasks', tasks.join(','))
    const r = await runPs('system-optimize.ps1', args)
    const ps = (r as any).data?.data || (r as any).data
    return { success: r.success && (r.data?.success !== false), data: ps, error: r.error || r.data?.error }
  },

  // === INSTALLER CLEANUP ===
  installerCleanup: async (action: string, targets?: string[]) => {
    const args = ['-Action', action]
    if (targets && targets.length) args.push('-Targets', targets.join('|'))
    const r = await runPs('installer-cleanup.ps1', args)
    const ps = (r as any).data?.data || (r as any).data
    return { success: r.success && (r.data?.success !== false), data: ps, error: r.error || r.data?.error }
  },

  // === SYSTEM ===
  statusGet: () => runPs('status.ps1', []),
  taskCancel: (taskId: string) => invoke<boolean>('cancel_task', { taskId }),
  settingsGet: () => invoke('settings_get'),
  settingsUpdate: (partial: any) => invoke('settings_update', { partial }),
  logsList: async (_date?: string) => [],
  logsDates: async () => [],
  logsRuntime: async (_limit?: number) => [],

  // === HISTORY ===
  historyList: (limit?: number, offset?: number) => invoke('history_list', { limit, offset }),
  historyAdd: (entry: any) => invoke('history_add', { entry }),
  historySearch: (query: string) => invoke('history_search', { query }),
  historyStats: () => invoke('history_stats'),
  historyByAction: (action: string) => invoke('history_by_action', { action }),

  // === THREAT DB ===
  threatList: (limit?: number, offset?: number) => invoke('threat_list', { limit, offset }),
  threatAdd: (entry: any) => invoke('threat_add', { entry }),
  threatSearch: (query: string) => invoke('threat_search', { query }),
  threatStats: () => invoke('threat_stats'),
  threatByType: (type: string) => invoke('threat_by_type', { type }),
  threatUpdateAction: (id: string, action: string) => invoke('threat_update_action', { id, action }),
  threatDelete: (id: string) => invoke('threat_delete', { id }),

  // === FILE EXPLORER ===
  fileList: (path?: string) => {
    const args = ['-Action', 'list']
    if (path) args.push('-Path', path)
    return runPs('file-explorer.ps1', args)
  },
  fileDelete: (path: string) => runPs('file-explorer.ps1', ['-Action', 'delete', '-Path', path]),
  fileRename: (path: string, newName: string) => runPs('file-explorer.ps1', ['-Action', 'rename', '-Path', path, '-NewName', newName]),
  fileCopy: (path: string, destination: string) => runPs('file-explorer.ps1', ['-Action', 'copy', '-Path', path, '-Destination', destination]),
  fileMove: (path: string, destination: string) => runPs('file-explorer.ps1', ['-Action', 'move', '-Path', path, '-Destination', destination]),
  fileCreateFolder: (path: string) => runPs('file-explorer.ps1', ['-Action', 'create-folder', '-Path', path]),
  fileInfo: (path: string) => runPs('file-explorer.ps1', ['-Action', 'info', '-Path', path]),
  fileOpen: (path: string) => runPs('file-explorer.ps1', ['-Action', 'open', '-Path', path]),

  // === DIALOG ===
  pickFolder: async () => {
    const r = await openDialog({ directory: true, multiple: false })
    return typeof r === 'string' ? r : null
  },

  // === GUARD CONTROL (no-op for now; PS scripts handle on-demand) ===
  guardControl: async (_action: 'start' | 'stop' | 'status') => ({ success: true, running: true, data: { running: true } }),

  // === RESOURCE USAGE ===
  getResourceUsage: () => invoke('resource_usage'),

  // === USER PATHS ===
  getUserPaths: () => {
    // Synchronous in Electron; we keep API shape but populate from env if available
    const fallback = (import.meta as any).env?.VITE_USER_PROFILE || 'C:\\Users\\User'
    return {
      home: fallback,
      downloads: `${fallback}\\Downloads`,
      desktop: `${fallback}\\Desktop`,
      temp: 'C:\\Windows\\Temp',
    }
  },

  // === EVENTS ===
  onNavigate: (cb: (route: string) => void) => {
    let unlisten: (() => void) | null = null
    listen<string>('navigate', (e) => cb(e.payload)).then((fn) => (unlisten = fn))
    return () => { if (unlisten) unlisten() }
  },
  onBannerNotification: (cb: (data: any) => void) => {
    let unlisten: (() => void) | null = null
    listen<any>('banner:notify', (e) => cb(e.payload)).then((fn) => (unlisten = fn))
    return () => { if (unlisten) unlisten() }
  },
  onDialog: (_cb: any) => {},
  offDialog: (_cb: any) => {},
  dialogRespond: (_id: string, _idx: number) => {},

  // === WINDOW ===
  windowMinimize: () => {
    const appWin = getAppWin()
    if (appWin) appWin.minimize()
  },
  windowMaximize: async () => {
    const appWin = getAppWin()
    if (!appWin) return
    if (await appWin.isMaximized()) appWin.unmaximize()
    else appWin.maximize()
  },
  windowClose: () => {
    const appWin = getAppWin()
    if (appWin) appWin.hide()
  },
}

export function installTauriAdapter() {
  ;(window as any).moleAPI = api
}
