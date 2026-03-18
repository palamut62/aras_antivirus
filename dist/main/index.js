"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addTrayLog = addTrayLog;
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const handlers_1 = require("./ipc/handlers");
const settings_1 = require("./services/settings");
const electron_log_1 = __importDefault(require("electron-log"));
const background_guard_1 = require("./services/background-guard");
const scheduled_scan_1 = require("./services/scheduled-scan");
let mainWindow = null;
let tray = null;
let trayUpdateInterval = null;
electron_log_1.default.transports.file.level = 'info';
electron_log_1.default.transports.console.level = 'debug';
// Autostart - Windows başlangıcında çalıştır
function setupAutostart() {
    electron_1.app.setLoginItemSettings({
        openAtLogin: true,
        path: electron_1.app.getPath('exe'),
        args: ['--hidden'],
    });
}
function createWindow() {
    // --hidden argümanıyla başlatılmışsa pencere gizli açılsın
    const startHidden = process.argv.includes('--hidden');
    mainWindow = new electron_1.BrowserWindow({
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
            preload: path_1.default.join(__dirname, '../preload/index.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
        },
    });
    const isDev = process.env.MOLE_DEV === '1';
    if (isDev) {
        mainWindow.loadURL('http://localhost:5173/');
        mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
    else {
        mainWindow.loadFile(path_1.default.join(__dirname, '../renderer/index.html'));
    }
    mainWindow.on('close', (e) => {
        if (!electron_1.app.isQuitting) {
            e.preventDefault();
            mainWindow?.hide();
        }
    });
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}
function getAssetPath(filename) {
    // In production: app.asar/assets/ ; In dev: project_root/assets/
    const possiblePaths = [
        path_1.default.join(__dirname, '../../assets', filename),
        path_1.default.join(electron_1.app.getAppPath(), 'assets', filename),
        path_1.default.join(process.resourcesPath || '', 'assets', filename),
    ];
    for (const p of possiblePaths) {
        try {
            if (require('fs').existsSync(p))
                return p;
        }
        catch { }
    }
    return possiblePaths[0];
}
const trayActivityLog = [];
const MAX_TRAY_LOG = 10;
function addTrayLog(text) {
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    trayActivityLog.unshift({ time, text });
    if (trayActivityLog.length > MAX_TRAY_LOG)
        trayActivityLog.length = MAX_TRAY_LOG;
    updateTrayMenu();
}
function updateTrayMenu() {
    if (!tray)
        return;
    const guardActive = (0, background_guard_1.isGuardRunning)();
    const settings = settings_1.SettingsService.get();
    const statusItems = [
        { label: 'Aras Antivirüs v1.4.0', enabled: false },
        { type: 'separator' },
        { label: `Canlı Koruma: ${settings.liveProtection ? '✅ Açık' : '❌ Kapalı'}`, enabled: false },
        { label: `Arka Plan Koruma: ${guardActive ? '✅ Çalışıyor' : '⏹ Durdu'}`, enabled: false },
        { label: `Zamanlanmış Tarama: ${settings.scheduledScan ? '✅ Açık' : '❌ Kapalı'}`, enabled: false },
        { type: 'separator' },
    ];
    const actionItems = [
        {
            label: 'Göster',
            click: () => { mainWindow?.show(); mainWindow?.focus(); },
        },
        {
            label: 'Hızlı Tarama',
            click: () => { mainWindow?.show(); mainWindow?.focus(); mainWindow?.webContents.send('navigate', '/security-scan'); },
        },
        {
            label: 'Canlı Koruma',
            click: () => { mainWindow?.show(); mainWindow?.focus(); mainWindow?.webContents.send('navigate', '/realtime'); },
        },
        { type: 'separator' },
        guardActive
            ? { label: '⏹ Arka Plan Korumayı Durdur', click: () => { (0, background_guard_1.stopBackgroundGuard)(); addTrayLog('Arka plan koruma durduruldu'); } }
            : { label: '▶ Arka Plan Korumayı Başlat', click: () => { (0, background_guard_1.startBackgroundGuard)(); addTrayLog('Arka plan koruma başlatıldı'); } },
        { type: 'separator' },
    ];
    // Son işlemler (loglar)
    const logItems = [];
    if (trayActivityLog.length > 0) {
        logItems.push({ label: '📋 Son İşlemler', enabled: false });
        for (const entry of trayActivityLog.slice(0, 8)) {
            logItems.push({ label: `  ${entry.time} - ${entry.text}`, enabled: false });
        }
        logItems.push({ type: 'separator' });
    }
    const exitItem = [
        {
            label: 'Çıkış',
            click: () => { electron_1.app.isQuitting = true; electron_1.app.quit(); },
        },
    ];
    const contextMenu = electron_1.Menu.buildFromTemplate([
        ...statusItems,
        ...actionItems,
        ...logItems,
        ...exitItem,
    ]);
    const guardStatus = guardActive ? 'Koruma Aktif' : 'Koruma Pasif';
    tray.setToolTip(`Aras Antivirüs - ${guardStatus}`);
    tray.setContextMenu(contextMenu);
}
function createTray() {
    const iconPath = getAssetPath('icon.ico');
    const icon = electron_1.nativeImage.createFromPath(iconPath);
    tray = new electron_1.Tray(icon.resize({ width: 16, height: 16 }));
    updateTrayMenu();
    tray.on('double-click', () => { mainWindow?.show(); mainWindow?.focus(); });
    // Tray menüsünü periyodik güncelle (durum değişiklikleri için)
    trayUpdateInterval = setInterval(updateTrayMenu, 30000);
}
// Prevent multiple instances
const gotTheLock = electron_1.app.requestSingleInstanceLock();
if (!gotTheLock) {
    electron_1.app.quit();
}
else {
    electron_1.app.on('second-instance', () => {
        if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
        }
    });
    electron_1.app.whenReady().then(() => {
        settings_1.SettingsService.init();
        (0, handlers_1.registerIpcHandlers)();
        // Window control IPC
        electron_1.ipcMain.on('window:minimize', () => mainWindow?.minimize());
        electron_1.ipcMain.on('window:maximize', () => {
            if (mainWindow?.isMaximized())
                mainWindow.unmaximize();
            else
                mainWindow?.maximize();
        });
        electron_1.ipcMain.on('window:close', () => mainWindow?.hide());
        // Guard control
        electron_1.ipcMain.handle('guard:control', async (_e, action) => {
            if (action === 'start') {
                (0, background_guard_1.startBackgroundGuard)();
                addTrayLog('Arka plan koruma başlatıldı');
                return { running: true };
            }
            if (action === 'stop') {
                (0, background_guard_1.stopBackgroundGuard)();
                addTrayLog('Arka plan koruma durduruldu');
                return { running: false };
            }
            return { running: (0, background_guard_1.isGuardRunning)() };
        });
        // Folder picker dialog
        electron_1.ipcMain.handle('dialog:pick-folder', async () => {
            const result = await electron_1.dialog.showOpenDialog(mainWindow, {
                properties: ['openDirectory'],
                title: 'Klasör Seç',
            });
            return result.canceled ? null : result.filePaths[0];
        });
        createWindow();
        if (mainWindow)
            (0, background_guard_1.setMainWindow)(mainWindow);
        createTray();
        const settings = settings_1.SettingsService.get();
        if (settings.autoStart)
            setupAutostart();
        if (settings.liveProtection) {
            (0, background_guard_1.startBackgroundGuard)();
            addTrayLog('Arka plan koruma otomatik başlatıldı');
        }
        if (settings.scheduledScan) {
            (0, scheduled_scan_1.startScheduledScan)(mainWindow);
            addTrayLog('Zamanlanmış tarama aktif');
        }
        addTrayLog('Aras Antivirüs başlatıldı');
        electron_log_1.default.info('Aras Antivirüs started', { liveProtection: settings.liveProtection, autoStart: settings.autoStart, scheduledScan: settings.scheduledScan });
    });
    electron_1.app.on('window-all-closed', () => { });
    electron_1.app.on('before-quit', () => {
        electron_1.app.isQuitting = true;
        (0, background_guard_1.stopBackgroundGuard)();
        (0, scheduled_scan_1.stopScheduledScan)();
        if (trayUpdateInterval)
            clearInterval(trayUpdateInterval);
    });
}
