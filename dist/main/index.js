"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const handlers_1 = require("./ipc/handlers");
const settings_1 = require("./services/settings");
const electron_log_1 = __importDefault(require("electron-log"));
const background_guard_1 = require("./services/background-guard");
let mainWindow = null;
let tray = null;
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
function createTray() {
    const iconPath = getAssetPath('icon.ico');
    const icon = electron_1.nativeImage.createFromPath(iconPath);
    tray = new electron_1.Tray(icon.resize({ width: 16, height: 16 }));
    const contextMenu = electron_1.Menu.buildFromTemplate([
        { label: 'Aras Antivirüs', enabled: false },
        { type: 'separator' },
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
        {
            label: 'Arka Plan Korumayı Durdur',
            click: () => { (0, background_guard_1.stopBackgroundGuard)(); },
        },
        {
            label: 'Arka Plan Korumayı Başlat',
            click: () => { (0, background_guard_1.startBackgroundGuard)(); },
        },
        { type: 'separator' },
        {
            label: 'Çıkış',
            click: () => { electron_1.app.isQuitting = true; electron_1.app.quit(); },
        },
    ]);
    tray.setToolTip('Aras Antivirüs - Koruma Aktif');
    tray.setContextMenu(contextMenu);
    tray.on('double-click', () => { mainWindow?.show(); mainWindow?.focus(); });
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
                return { running: true };
            }
            if (action === 'stop') {
                (0, background_guard_1.stopBackgroundGuard)();
                return { running: false };
            }
            // status
            const { isGuardRunning } = require('./services/background-guard');
            return { running: isGuardRunning() };
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
        if (settings.liveProtection)
            (0, background_guard_1.startBackgroundGuard)();
        electron_log_1.default.info('Aras Antivirüs started', { liveProtection: settings.liveProtection, autoStart: settings.autoStart });
    });
    electron_1.app.on('window-all-closed', () => { });
    electron_1.app.on('before-quit', () => {
        electron_1.app.isQuitting = true;
        (0, background_guard_1.stopBackgroundGuard)();
    });
}
