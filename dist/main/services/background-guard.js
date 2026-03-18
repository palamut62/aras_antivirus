"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setMainWindow = setMainWindow;
exports.startBackgroundGuard = startBackgroundGuard;
exports.stopBackgroundGuard = stopBackgroundGuard;
exports.isGuardRunning = isGuardRunning;
const electron_1 = require("electron");
const powershell_1 = require("./powershell");
const history_db_1 = require("./history-db");
const settings_1 = require("./settings");
const electron_log_1 = __importDefault(require("electron-log"));
let fileWatchInterval = null;
let networkInterval = null;
let usbInterval = null;
let usbWatcherProcess = null;
let isRunning = false;
let mainWindowRef = null;
// Bildirim deduplication - aynı bildirimi tekrar gösterme
const recentNotifications = new Map(); // key → timestamp
const NOTIFICATION_COOLDOWN = 10 * 60 * 1000; // 10 dakika
function shouldNotify(key) {
    const now = Date.now();
    // Eski kayıtları temizle
    for (const [k, t] of recentNotifications) {
        if (now - t > NOTIFICATION_COOLDOWN)
            recentNotifications.delete(k);
    }
    if (recentNotifications.has(key))
        return false;
    recentNotifications.set(key, now);
    return true;
}
// In-app dialog system — promise resolvers keyed by dialog ID
const dialogResolvers = new Map();
// Register IPC listener once
let dialogListenerRegistered = false;
function ensureDialogListener() {
    if (dialogListenerRegistered)
        return;
    dialogListenerRegistered = true;
    electron_1.ipcMain.on('dialog:respond', (_event, id, buttonIndex) => {
        const resolve = dialogResolvers.get(id);
        if (resolve) {
            resolve(buttonIndex);
            dialogResolvers.delete(id);
        }
    });
}
function tx(tr, en) {
    try {
        return settings_1.SettingsService.get().language === 'en' ? en : tr;
    }
    catch {
        return tr;
    }
}
function isWindowVisible() {
    const win = mainWindowRef || electron_1.BrowserWindow.getAllWindows()[0];
    return !!(win && win.isVisible() && !win.isMinimized());
}
function sendBannerNotification(data) {
    // Deduplication: aynı bildirimi 10dk içinde tekrar gösterme
    const notifKey = `${data.type}:${data.title}`;
    if (!shouldNotify(notifKey))
        return;
    const win = mainWindowRef || electron_1.BrowserWindow.getAllWindows()[0];
    if (isWindowVisible() && win) {
        win.webContents.send('banner:notify', data);
    }
    else {
        const toast = new electron_1.Notification({
            title: 'Aras Antivirüs',
            body: `${data.title}${data.message ? '\n' + data.message : ''}`,
        });
        if (data.action && win) {
            toast.on('click', () => {
                win.show();
                win.focus();
                win.webContents.send('navigate', data.action.route);
            });
        }
        toast.show();
        try {
            const { addTrayLog } = require('../index');
            addTrayLog(data.title);
        }
        catch { }
    }
}
function showInAppDialog(options) {
    ensureDialogListener();
    const win = mainWindowRef || electron_1.BrowserWindow.getAllWindows()[0];
    if (!win)
        return Promise.resolve(options.buttons.length - 1);
    const id = 'dlg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    // Pencere gizliyse önce native toast göster, tıklanınca pencereyi aç ve dialog'u göster
    if (!isWindowVisible()) {
        const toast = new electron_1.Notification({
            title: `⚠ ${options.title}`,
            body: `${options.message}\nDetaylar için tıklayın.`,
        });
        // Tray log'a ekle
        try {
            const { addTrayLog } = require('../index');
            addTrayLog(`⚠ ${options.title}`);
        }
        catch { }
        return new Promise((resolve) => {
            dialogResolvers.set(id, resolve);
            toast.on('click', () => {
                win.show();
                win.focus();
                win.webContents.send('dialog:show', { id, ...options });
            });
            toast.show();
            // Toast tıklanmazsa 60sn sonra varsayılan aksiyon (karantinada tut)
            setTimeout(() => {
                if (dialogResolvers.has(id)) {
                    dialogResolvers.delete(id);
                    resolve(options.buttons.length - 1); // son buton = karantinada tut
                }
            }, 60000);
        });
    }
    // Pencere açıksa direkt dialog göster
    win.show();
    win.focus();
    return new Promise((resolve) => {
        dialogResolvers.set(id, resolve);
        win.webContents.send('dialog:show', { id, ...options });
    });
}
const WATCH_PATHS = [
    `${process.env.USERPROFILE}\\Downloads`,
    `${process.env.USERPROFILE}\\Desktop`,
    `${process.env.USERPROFILE}\\Documents`,
    `${process.env.USERPROFILE}\\Pictures`,
    `${process.env.LOCALAPPDATA}\\Temp`,
    process.env.TEMP || 'C:\\Windows\\Temp',
];
function setMainWindow(win) {
    mainWindowRef = win;
}
async function quarantineFile(filePath, reason) {
    try {
        const result = await (0, powershell_1.runPowerShell)('quarantine.ps1', ['-Action', 'add', '-FilePath', filePath], 'bg-quarantine-' + Date.now());
        return result.success;
    }
    catch {
        return false;
    }
}
async function restoreFromQuarantine(quarantineId) {
    try {
        const result = await (0, powershell_1.runPowerShell)('quarantine.ps1', ['-Action', 'restore', '-QuarantineId', quarantineId], 'bg-restore-' + Date.now());
        return result.success;
    }
    catch {
        return false;
    }
}
async function deleteFromQuarantine(quarantineId) {
    try {
        const result = await (0, powershell_1.runPowerShell)('quarantine.ps1', ['-Action', 'delete', '-QuarantineId', quarantineId], 'bg-delete-' + Date.now());
        return result.success;
    }
    catch {
        return false;
    }
}
async function askUserAboutThreat(threat) {
    // Aynı dosya için tekrar sorma (30dk cooldown)
    const threatKey = `threat:${threat.filePath}`;
    if (!shouldNotify(threatKey)) {
        electron_log_1.default.debug('[Guard] Duplicate threat skipped:', threat.fileName);
        return;
    }
    // 1) Önce karantinaya al
    const quarantined = await quarantineFile(threat.filePath, threat.reason);
    if (!quarantined) {
        electron_log_1.default.error('[Guard] Karantinaya alma başarısız:', threat.filePath);
        return;
    }
    electron_log_1.default.info('[Guard] Karantinaya alındı:', threat.filePath);
    history_db_1.HistoryDB.add({ action: 'quarantine', target: threat.filePath, details: threat.reason, riskScore: threat.riskScore, status: 'success' });
    // Tray log'a ekle
    try {
        const { addTrayLog } = require('../index');
        addTrayLog(`Tehdit karantinaya alındı: ${threat.fileName}`);
    }
    catch { }
    // Karantina ID'sini listeden bulacağız (aşağıda)
    // 2) Kullanıcıya sor (in-app dark dialog)
    const buttonIndex = await showInAppDialog({
        type: 'threat',
        title: 'Tehdit Tespit Edildi!',
        message: 'Şüpheli dosya karantinaya alındı',
        detail: [
            `Dosya: ${threat.fileName}`,
            `Konum: ${threat.filePath}`,
            `Risk Skoru: ${threat.riskScore}`,
            `Sebep: ${threat.reason}`,
            ...(threat.defenderThreat ? [`Windows Defender: ${threat.defenderThreat}`] : []),
            '',
            'Dosya otomatik olarak karantinaya alındı.',
        ].join('\n'),
        buttons: ['İzin Ver (Geri Yükle)', 'Engelle / Sil', 'Karantinada Tut'],
    });
    const response = { response: buttonIndex };
    // Karantina listesinden son eklenen item'ı bul
    let actualQuarantineId = '';
    try {
        const listResult = await (0, powershell_1.runPowerShell)('quarantine.ps1', ['-Action', 'list'], 'bg-qlist-' + Date.now());
        if (listResult.success) {
            const items = Array.isArray(listResult.data) ? listResult.data : listResult.data ? [listResult.data] : [];
            const match = items.find((it) => it.fileName === threat.fileName || it.originalPath === threat.filePath);
            if (match)
                actualQuarantineId = match.id;
        }
    }
    catch { }
    if (response.response === 0) {
        // İzin Ver → Geri yükle
        if (actualQuarantineId) {
            await restoreFromQuarantine(actualQuarantineId);
            history_db_1.HistoryDB.add({ action: 'restore', target: threat.filePath, details: 'Kullanıcı izin verdi', status: 'success' });
            electron_log_1.default.info('[Guard] Kullanıcı izin verdi, geri yüklendi:', threat.fileName);
            new electron_1.Notification({
                title: 'Aras Antivirüs',
                body: `${threat.fileName} geri yüklendi.`,
            }).show();
        }
    }
    else if (response.response === 1) {
        // Engelle/Sil → Kalıcı sil
        if (actualQuarantineId) {
            await deleteFromQuarantine(actualQuarantineId);
            history_db_1.HistoryDB.add({ action: 'delete', target: threat.filePath, details: 'Kullanıcı engelledi/sildi', riskScore: threat.riskScore, status: 'success' });
            electron_log_1.default.info('[Guard] Kullanıcı engelledi, silindi:', threat.fileName);
            new electron_1.Notification({
                title: 'Aras Antivirüs',
                body: `${threat.fileName} kalıcı olarak silindi.`,
            }).show();
        }
    }
    else {
        // Karantinada tut
        electron_log_1.default.info('[Guard] Kullanıcı karantinada tutmayı seçti:', threat.fileName);
        new electron_1.Notification({
            title: 'Aras Antivirüs',
            body: `${threat.fileName} karantinada tutuluyor.`,
        }).show();
    }
}
async function checkNewFiles() {
    try {
        const result = await (0, powershell_1.runPowerShell)('live-guard.ps1', ['-WatchPaths', WATCH_PATHS.join(',')], 'bg-file-check');
        if (result.success && result.data?.events) {
            const events = Array.isArray(result.data.events) ? result.data.events : [result.data.events];
            const threats = events.filter((e) => e.riskScore >= 50);
            for (const threat of threats) {
                await askUserAboutThreat({
                    fileName: threat.fileName,
                    filePath: threat.path,
                    riskScore: threat.riskScore,
                    reason: threat.reason || 'Şüpheli dosya tespit edildi',
                    defenderThreat: threat.defenderThreat,
                });
            }
        }
    }
    catch (err) {
        electron_log_1.default.debug('[Guard] File check error:', err);
    }
}
async function checkNetwork() {
    try {
        const result = await (0, powershell_1.runPowerShell)('network-monitor.ps1', ['-Action', 'suspicious-connections'], 'bg-net-check');
        if (result.success && result.data?.flaggedCount > 0) {
            const count = result.data.flaggedCount;
            if (count >= 3) {
                sendBannerNotification({
                    type: 'warning',
                    title: tx(`${count} şüpheli ağ bağlantısı tespit edildi`, `${count} suspicious network connections detected`),
                    message: tx('Detayları incelemek için Ağ İzleme sayfasına gidin.', 'Go to Network Monitor for details.'),
                    action: { label: tx('Detaylar', 'Details'), route: '/network' },
                });
            }
        }
    }
    catch (err) {
        electron_log_1.default.debug('[Guard] Network check error:', err);
    }
}
async function checkUsb() {
    try {
        const result = await (0, powershell_1.runPowerShell)('usb-monitor.ps1', ['-Action', 'check-autorun'], 'bg-usb-check');
        if (result.success && result.data?.threatCount > 0) {
            const threats = Array.isArray(result.data.results) ? result.data.results : result.data.results ? [result.data.results] : [];
            for (const threat of threats) {
                if (threat.path) {
                    await askUserAboutThreat({
                        fileName: threat.fileName || threat.description || 'USB Tehdit',
                        filePath: threat.path,
                        riskScore: threat.riskScore || 70,
                        reason: threat.reason || 'USB sürücüsünde şüpheli dosya',
                    });
                }
            }
        }
    }
    catch (err) {
        electron_log_1.default.debug('[Guard] USB check error:', err);
    }
}
function startUsbWatcher() {
    try {
        const { spawn } = require('child_process');
        // WMI event watcher: fires when a new logical disk (USB) is inserted
        const script = `
      $query = "SELECT * FROM __InstanceCreationEvent WITHIN 2 WHERE TargetInstance ISA 'Win32_LogicalDisk' AND TargetInstance.DriveType = 2"
      Register-WmiEvent -Query $query -Action {
        $letter = $Event.SourceEventArgs.NewEvent.TargetInstance.DeviceID
        Write-Output "USB_INSERTED:$letter"
      } | Out-Null
      while($true) { Start-Sleep -Seconds 1 }
    `;
        const proc = spawn('powershell.exe', ['-NoProfile', '-Command', script], {
            windowsHide: true,
            stdio: ['ignore', 'pipe', 'ignore'],
        });
        usbWatcherProcess = proc;
        proc.stdout?.on('data', (data) => {
            const output = data.toString().trim();
            if (output.startsWith('USB_INSERTED:')) {
                const drive = output.replace('USB_INSERTED:', '').trim();
                electron_log_1.default.info('[Guard] USB inserted detected:', drive);
                // Immediate scan
                checkUsb();
                // Notify user via banner (not dialog)
                sendBannerNotification({
                    type: 'info',
                    title: tx(`USB Cihazı Takıldı: ${drive}\\`, `USB Device Connected: ${drive}\\`),
                    message: tx('Sürücü otomatik olarak taranıyor...', 'Drive is being scanned automatically...'),
                    action: { label: tx('USB İzleme', 'USB Monitor'), route: '/usb' },
                });
            }
        });
        proc.on('exit', () => {
            usbWatcherProcess = null;
        });
        electron_log_1.default.info('[Guard] USB watcher started (WMI event)');
    }
    catch (err) {
        electron_log_1.default.debug('[Guard] USB watcher start failed:', err);
    }
}
function stopUsbWatcher() {
    if (usbWatcherProcess) {
        usbWatcherProcess.kill();
        usbWatcherProcess = null;
        electron_log_1.default.info('[Guard] USB watcher stopped');
    }
}
function startBackgroundGuard() {
    if (isRunning)
        return;
    isRunning = true;
    electron_log_1.default.info('[Guard] Background protection started');
    fileWatchInterval = setInterval(checkNewFiles, 30000);
    networkInterval = setInterval(checkNetwork, 60000);
    usbInterval = setInterval(checkUsb, 45000);
    setTimeout(checkNewFiles, 5000);
    setTimeout(checkUsb, 10000);
    setTimeout(checkNetwork, 20000);
    // Real-time USB insertion detection
    startUsbWatcher();
}
function stopBackgroundGuard() {
    isRunning = false;
    if (fileWatchInterval)
        clearInterval(fileWatchInterval);
    if (networkInterval)
        clearInterval(networkInterval);
    if (usbInterval)
        clearInterval(usbInterval);
    fileWatchInterval = null;
    networkInterval = null;
    usbInterval = null;
    stopUsbWatcher();
    electron_log_1.default.info('[Guard] Background protection stopped');
}
function isGuardRunning() {
    return isRunning;
}
