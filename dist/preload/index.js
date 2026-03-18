"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const api = {
    // Cleanup
    scanRun: () => electron_1.ipcRenderer.invoke('scan:run'),
    cleanExecute: (categories) => electron_1.ipcRenderer.invoke('clean:execute', categories),
    purgeScan: (folders) => electron_1.ipcRenderer.invoke('purge:scan', folders),
    purgeExecute: (targets) => electron_1.ipcRenderer.invoke('purge:execute', targets),
    analyzeDisk: (path) => electron_1.ipcRenderer.invoke('analyze:disk', path),
    // Security
    securityScan: (scanType, path) => electron_1.ipcRenderer.invoke('security:scan', scanType, path),
    processMonitor: () => electron_1.ipcRenderer.invoke('security:processes'),
    quarantineAction: (action, filePath, quarantineId) => electron_1.ipcRenderer.invoke('quarantine:action', action, filePath, quarantineId),
    repoScan: (path) => electron_1.ipcRenderer.invoke('security:repo', path),
    liveGuard: (watchPaths) => electron_1.ipcRenderer.invoke('security:live-guard', watchPaths),
    // Defender & VirusTotal
    defenderScan: (action, path) => electron_1.ipcRenderer.invoke('defender:scan', action, path),
    virusTotalCheck: (action, hash, filePath) => electron_1.ipcRenderer.invoke('virustotal:check', action, hash, filePath),
    // Web/USB/Network
    webProtection: (action) => electron_1.ipcRenderer.invoke('web:protection', action),
    usbMonitor: (action, driveLetter) => electron_1.ipcRenderer.invoke('usb:monitor', action, driveLetter),
    networkMonitor: (action, remoteAddress, pid, ruleName) => electron_1.ipcRenderer.invoke('network:monitor', action, remoteAddress, pid, ruleName),
    // App Uninstaller
    appUninstaller: (action, appId) => electron_1.ipcRenderer.invoke('app:uninstaller', action, appId),
    // System Optimize
    systemOptimize: (action, tasks) => electron_1.ipcRenderer.invoke('system:optimize', action, tasks),
    // Installer Cleanup
    installerCleanup: (action, targets) => electron_1.ipcRenderer.invoke('installer:cleanup', action, targets),
    // System
    statusGet: () => electron_1.ipcRenderer.invoke('status:get'),
    taskCancel: (taskId) => electron_1.ipcRenderer.invoke('task:cancel', taskId),
    settingsGet: () => electron_1.ipcRenderer.invoke('settings:get'),
    settingsUpdate: (partial) => electron_1.ipcRenderer.invoke('settings:update', partial),
    logsList: (date) => electron_1.ipcRenderer.invoke('logs:list', date),
    logsDates: () => electron_1.ipcRenderer.invoke('logs:dates'),
    // History
    historyList: (limit, offset) => electron_1.ipcRenderer.invoke('history:list', limit, offset),
    historyAdd: (entry) => electron_1.ipcRenderer.invoke('history:add', entry),
    historySearch: (query) => electron_1.ipcRenderer.invoke('history:search', query),
    historyStats: () => electron_1.ipcRenderer.invoke('history:stats'),
    historyByAction: (action) => electron_1.ipcRenderer.invoke('history:by-action', action),
    // Threat DB
    threatList: (limit, offset) => electron_1.ipcRenderer.invoke('threat:list', limit, offset),
    threatAdd: (entry) => electron_1.ipcRenderer.invoke('threat:add', entry),
    threatSearch: (query) => electron_1.ipcRenderer.invoke('threat:search', query),
    threatStats: () => electron_1.ipcRenderer.invoke('threat:stats'),
    threatByType: (type) => electron_1.ipcRenderer.invoke('threat:by-type', type),
    threatUpdateAction: (id, action) => electron_1.ipcRenderer.invoke('threat:update-action', id, action),
    threatDelete: (id) => electron_1.ipcRenderer.invoke('threat:delete', id),
    // File Explorer
    fileList: (path) => electron_1.ipcRenderer.invoke('file:list', path),
    fileDelete: (path) => electron_1.ipcRenderer.invoke('file:delete', path),
    fileRename: (path, newName) => electron_1.ipcRenderer.invoke('file:rename', path, newName),
    fileCopy: (path, destination) => electron_1.ipcRenderer.invoke('file:copy', path, destination),
    fileMove: (path, destination) => electron_1.ipcRenderer.invoke('file:move', path, destination),
    fileCreateFolder: (path) => electron_1.ipcRenderer.invoke('file:create-folder', path),
    fileInfo: (path) => electron_1.ipcRenderer.invoke('file:info', path),
    fileOpen: (path) => electron_1.ipcRenderer.invoke('file:open', path),
    // Dialog
    pickFolder: () => electron_1.ipcRenderer.invoke('dialog:pick-folder'),
    // Guard control
    guardControl: (action) => electron_1.ipcRenderer.invoke('guard:control', action),
    // User paths (for renderer)
    getUserPaths: () => ({
        downloads: `${process.env.USERPROFILE || 'C:\\Users\\User'}\\Downloads`,
        desktop: `${process.env.USERPROFILE || 'C:\\Users\\User'}\\Desktop`,
        temp: process.env.TEMP || 'C:\\Windows\\Temp',
        home: process.env.USERPROFILE || 'C:\\Users\\User',
    }),
    // In-app dialog
    onDialog: (cb) => electron_1.ipcRenderer.on('dialog:show', cb),
    offDialog: (cb) => electron_1.ipcRenderer.removeListener('dialog:show', cb),
    dialogRespond: (id, buttonIndex) => electron_1.ipcRenderer.send('dialog:respond', id, buttonIndex),
    // Resource usage
    getResourceUsage: () => electron_1.ipcRenderer.invoke('system:resource-usage'),
    // Banner notifications (from main process)
    onBannerNotification: (cb) => {
        const handler = (_e, data) => cb(data);
        electron_1.ipcRenderer.on('banner:notify', handler);
        return () => electron_1.ipcRenderer.removeListener('banner:notify', handler);
    },
    // Navigate (from main process)
    onNavigate: (cb) => {
        const handler = (_e, route) => cb(route);
        electron_1.ipcRenderer.on('navigate', handler);
        return () => electron_1.ipcRenderer.removeListener('navigate', handler);
    },
    // Window
    windowMinimize: () => electron_1.ipcRenderer.send('window:minimize'),
    windowMaximize: () => electron_1.ipcRenderer.send('window:maximize'),
    windowClose: () => electron_1.ipcRenderer.send('window:close'),
};
electron_1.contextBridge.exposeInMainWorld('moleAPI', api);
