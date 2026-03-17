interface MoleAPI {
  // Cleanup
  scanRun: () => Promise<any>
  cleanExecute: (categories: string[]) => Promise<any>
  purgeScan: (folders: string[]) => Promise<any>
  purgeExecute: (targets: string[]) => Promise<any>
  analyzeDisk: (path: string) => Promise<any>

  // Security
  securityScan: (scanType: string, path?: string) => Promise<any>
  processMonitor: () => Promise<any>
  quarantineAction: (action: string, filePath?: string, quarantineId?: string) => Promise<any>
  repoScan: (path: string) => Promise<any>
  liveGuard: (watchPaths: string[]) => Promise<any>

  // Web/USB/Network
  webProtection: (action: string) => Promise<any>
  usbMonitor: (action: string, driveLetter?: string) => Promise<any>
  networkMonitor: (action: string, remoteAddress?: string, pid?: number, ruleName?: string) => Promise<any>

  // History
  historyList: (limit?: number, offset?: number) => Promise<any[]>
  historyAdd: (entry: any) => Promise<any>
  historySearch: (query: string) => Promise<any[]>
  historyStats: () => Promise<any>
  historyByAction: (action: string) => Promise<any[]>

  // App Uninstaller
  appUninstaller: (action: string, appId?: string) => Promise<any>

  // System Optimize
  systemOptimize: (action: string, tasks?: string[]) => Promise<any>

  // Installer Cleanup
  installerCleanup: (action: string, targets?: string[]) => Promise<any>

  // System
  statusGet: () => Promise<any>
  taskCancel: (taskId: string) => Promise<boolean>
  settingsGet: () => Promise<any>
  settingsUpdate: (partial: any) => Promise<any>
  logsList: (date?: string) => Promise<any[]>
  logsDates: () => Promise<string[]>

  // Guard control
  guardControl: (action: 'start' | 'stop' | 'status') => Promise<any>

  // User paths
  getUserPaths: () => { downloads: string; desktop: string; temp: string; home: string }

  // Threat DB
  threatList: (limit?: number, offset?: number) => Promise<any[]>
  threatAdd: (entry: any) => Promise<any>
  threatSearch: (query: string) => Promise<any[]>
  threatStats: () => Promise<any>
  threatByType: (type: string) => Promise<any[]>
  threatUpdateAction: (id: string, action: string) => Promise<any>
  threatDelete: (id: string) => Promise<void>

  // File Explorer
  fileList: (path?: string) => Promise<any>
  fileDelete: (path: string) => Promise<any>
  fileRename: (path: string, newName: string) => Promise<any>
  fileCopy: (path: string, destination: string) => Promise<any>
  fileMove: (path: string, destination: string) => Promise<any>
  fileCreateFolder: (path: string) => Promise<any>
  fileInfo: (path: string) => Promise<any>
  fileOpen: (path: string) => Promise<any>

  // Resource usage
  getResourceUsage: () => Promise<{ cpu: number; memory: { used: number; total: number; percent: number } }>

  // Dialog
  pickFolder: () => Promise<string | null>
  onDialog: (cb: (event: any, data: any) => void) => void
  offDialog: (cb: (event: any, data: any) => void) => void
  dialogRespond: (id: string, buttonIndex: number) => void

  // Window
  windowMinimize: () => void
  windowMaximize: () => void
  windowClose: () => void
}

interface Window {
  moleAPI: MoleAPI
}
