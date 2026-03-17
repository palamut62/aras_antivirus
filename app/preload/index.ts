import { contextBridge, ipcRenderer } from 'electron'

const api = {
  // Cleanup
  scanRun: () => ipcRenderer.invoke('scan:run'),
  cleanExecute: (categories: string[]) => ipcRenderer.invoke('clean:execute', categories),
  purgeScan: (folders: string[]) => ipcRenderer.invoke('purge:scan', folders),
  purgeExecute: (targets: string[]) => ipcRenderer.invoke('purge:execute', targets),
  analyzeDisk: (path: string) => ipcRenderer.invoke('analyze:disk', path),

  // Security
  securityScan: (scanType: string, path?: string) => ipcRenderer.invoke('security:scan', scanType, path),
  processMonitor: () => ipcRenderer.invoke('security:processes'),
  quarantineAction: (action: string, filePath?: string, quarantineId?: string) =>
    ipcRenderer.invoke('quarantine:action', action, filePath, quarantineId),
  repoScan: (path: string) => ipcRenderer.invoke('security:repo', path),
  liveGuard: (watchPaths: string[]) => ipcRenderer.invoke('security:live-guard', watchPaths),

  // Web/USB/Network
  webProtection: (action: string) => ipcRenderer.invoke('web:protection', action),
  usbMonitor: (action: string, driveLetter?: string) => ipcRenderer.invoke('usb:monitor', action, driveLetter),
  networkMonitor: (action: string, remoteAddress?: string, pid?: number, ruleName?: string) =>
    ipcRenderer.invoke('network:monitor', action, remoteAddress, pid, ruleName),

  // App Uninstaller
  appUninstaller: (action: string, appId?: string) => ipcRenderer.invoke('app:uninstaller', action, appId),

  // System Optimize
  systemOptimize: (action: string, tasks?: string[]) => ipcRenderer.invoke('system:optimize', action, tasks),

  // Installer Cleanup
  installerCleanup: (action: string, targets?: string[]) => ipcRenderer.invoke('installer:cleanup', action, targets),

  // System
  statusGet: () => ipcRenderer.invoke('status:get'),
  taskCancel: (taskId: string) => ipcRenderer.invoke('task:cancel', taskId),
  settingsGet: () => ipcRenderer.invoke('settings:get'),
  settingsUpdate: (partial: any) => ipcRenderer.invoke('settings:update', partial),
  logsList: (date?: string) => ipcRenderer.invoke('logs:list', date),
  logsDates: () => ipcRenderer.invoke('logs:dates'),

  // History
  historyList: (limit?: number, offset?: number) => ipcRenderer.invoke('history:list', limit, offset),
  historyAdd: (entry: any) => ipcRenderer.invoke('history:add', entry),
  historySearch: (query: string) => ipcRenderer.invoke('history:search', query),
  historyStats: () => ipcRenderer.invoke('history:stats'),
  historyByAction: (action: string) => ipcRenderer.invoke('history:by-action', action),

  // Threat DB
  threatList: (limit?: number, offset?: number) => ipcRenderer.invoke('threat:list', limit, offset),
  threatAdd: (entry: any) => ipcRenderer.invoke('threat:add', entry),
  threatSearch: (query: string) => ipcRenderer.invoke('threat:search', query),
  threatStats: () => ipcRenderer.invoke('threat:stats'),
  threatByType: (type: string) => ipcRenderer.invoke('threat:by-type', type),
  threatUpdateAction: (id: string, action: string) => ipcRenderer.invoke('threat:update-action', id, action),
  threatDelete: (id: string) => ipcRenderer.invoke('threat:delete', id),

  // File Explorer
  fileList: (path?: string) => ipcRenderer.invoke('file:list', path),
  fileDelete: (path: string) => ipcRenderer.invoke('file:delete', path),
  fileRename: (path: string, newName: string) => ipcRenderer.invoke('file:rename', path, newName),
  fileCopy: (path: string, destination: string) => ipcRenderer.invoke('file:copy', path, destination),
  fileMove: (path: string, destination: string) => ipcRenderer.invoke('file:move', path, destination),
  fileCreateFolder: (path: string) => ipcRenderer.invoke('file:create-folder', path),
  fileInfo: (path: string) => ipcRenderer.invoke('file:info', path),
  fileOpen: (path: string) => ipcRenderer.invoke('file:open', path),

  // Dialog
  pickFolder: () => ipcRenderer.invoke('dialog:pick-folder'),

  // Guard control
  guardControl: (action: 'start' | 'stop' | 'status') => ipcRenderer.invoke('guard:control', action),

  // User paths (for renderer)
  getUserPaths: () => ({
    downloads: `${process.env.USERPROFILE || 'C:\\Users\\User'}\\Downloads`,
    desktop: `${process.env.USERPROFILE || 'C:\\Users\\User'}\\Desktop`,
    temp: process.env.TEMP || 'C:\\Windows\\Temp',
    home: process.env.USERPROFILE || 'C:\\Users\\User',
  }),

  // In-app dialog
  onDialog: (cb: (event: any, data: any) => void) => ipcRenderer.on('dialog:show', cb),
  offDialog: (cb: (event: any, data: any) => void) => ipcRenderer.removeListener('dialog:show', cb),
  dialogRespond: (id: string, buttonIndex: number) => ipcRenderer.send('dialog:respond', id, buttonIndex),

  // Resource usage
  getResourceUsage: () => ipcRenderer.invoke('system:resource-usage'),

  // Navigate (from main process)
  onNavigate: (cb: (route: string) => void) => {
    const handler = (_e: any, route: string) => cb(route)
    ipcRenderer.on('navigate', handler)
    return () => ipcRenderer.removeListener('navigate', handler)
  },

  // Window
  windowMinimize: () => ipcRenderer.send('window:minimize'),
  windowMaximize: () => ipcRenderer.send('window:maximize'),
  windowClose: () => ipcRenderer.send('window:close'),
}

contextBridge.exposeInMainWorld('moleAPI', api)
