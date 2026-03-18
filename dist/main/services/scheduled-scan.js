"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startScheduledScan = startScheduledScan;
exports.stopScheduledScan = stopScheduledScan;
exports.restartScheduledScan = restartScheduledScan;
const electron_1 = require("electron");
const powershell_1 = require("./powershell");
const settings_1 = require("./settings");
const history_db_1 = require("./history-db");
const electron_log_1 = __importDefault(require("electron-log"));
let scanInterval = null;
let mainWindowRef = null;
function formatSize(bytes) {
    if (bytes >= 1e9)
        return (bytes / 1e9).toFixed(2) + ' GB';
    if (bytes >= 1e6)
        return (bytes / 1e6).toFixed(1) + ' MB';
    if (bytes >= 1e3)
        return (bytes / 1e3).toFixed(0) + ' KB';
    return bytes + ' B';
}
function tx(tr, en) {
    return settings_1.SettingsService.get().language === 'en' ? en : tr;
}
function sendBanner(data) {
    const win = mainWindowRef || electron_1.BrowserWindow.getAllWindows()[0];
    const isVisible = !!(win && win.isVisible() && !win.isMinimized());
    if (isVisible && win) {
        win.webContents.send('banner:notify', data);
    }
    else {
        // Pencere kapalı → native toast
        const toast = new electron_1.Notification({
            title: `Aras Antivirüs - ${data.title}`,
            body: data.message || '',
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
async function runScheduledScan() {
    electron_log_1.default.info('[ScheduledScan] Starting automatic scan...');
    sendBanner({
        type: 'info',
        title: tx('Zamanlanmis tarama baslatildi', 'Scheduled scan started'),
        message: tx('Gereksiz dosyalar taraniyor...', 'Scanning for junk files...'),
    });
    try {
        const result = await (0, powershell_1.runPowerShell)('scan-clean.ps1', [], 'scheduled-scan');
        if (result.success && result.data) {
            const totalSize = result.data.totalSize || 0;
            const totalItems = result.data.totalItems || 0;
            const catCount = result.data.categories?.length || 0;
            history_db_1.HistoryDB.add({
                action: 'scan',
                target: 'Scheduled Scan',
                details: `${catCount} categories, ${totalItems} files, ${formatSize(totalSize)} reclaimable`,
                sizeBytes: totalSize,
                status: 'success',
            });
            if (totalSize > 0) {
                sendBanner({
                    type: 'warning',
                    title: tx(`${formatSize(totalSize)} gereksiz dosya bulundu`, `${formatSize(totalSize)} junk files found`),
                    message: tx(`${totalItems} dosya, ${catCount} kategori. Temizlemek icin tiklayin.`, `${totalItems} files, ${catCount} categories. Click to clean.`),
                    action: { label: tx('Temizle', 'Clean'), route: '/deep-clean' },
                });
            }
            else {
                sendBanner({
                    type: 'success',
                    title: tx('Zamanlanmis tarama tamamlandi', 'Scheduled scan completed'),
                    message: tx('Gereksiz dosya bulunamadi, sisteminiz temiz!', 'No junk files found, your system is clean!'),
                });
            }
            electron_log_1.default.info(`[ScheduledScan] Complete: ${totalItems} files, ${formatSize(totalSize)}`);
        }
        else {
            electron_log_1.default.warn('[ScheduledScan] Scan returned no data or failed:', result.error);
        }
    }
    catch (err) {
        electron_log_1.default.error('[ScheduledScan] Error:', err);
    }
}
function getIntervalMs() {
    const settings = settings_1.SettingsService.get();
    switch (settings.scheduledScanInterval) {
        case 'hourly':
            return (settings.scheduledScanHours || 6) * 60 * 60 * 1000;
        case 'daily':
            return 24 * 60 * 60 * 1000;
        case 'weekly':
            return 7 * 24 * 60 * 60 * 1000;
        default:
            return 24 * 60 * 60 * 1000;
    }
}
function startScheduledScan(win) {
    if (win)
        mainWindowRef = win;
    stopScheduledScan();
    const settings = settings_1.SettingsService.get();
    if (!settings.scheduledScan)
        return;
    const intervalMs = getIntervalMs();
    electron_log_1.default.info(`[ScheduledScan] Started, interval: ${intervalMs / 3600000}h`);
    // First scan after 2 minutes (don't scan immediately on boot)
    setTimeout(() => {
        if (settings_1.SettingsService.get().scheduledScan) {
            runScheduledScan();
        }
    }, 2 * 60 * 1000);
    scanInterval = setInterval(() => {
        if (settings_1.SettingsService.get().scheduledScan) {
            runScheduledScan();
        }
    }, intervalMs);
}
function stopScheduledScan() {
    if (scanInterval) {
        clearInterval(scanInterval);
        scanInterval = null;
        electron_log_1.default.info('[ScheduledScan] Stopped');
    }
}
function restartScheduledScan(win) {
    startScheduledScan(win);
}
