"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerIpcHandlers = registerIpcHandlers;
const electron_1 = require("electron");
const os_1 = __importDefault(require("os"));
const powershell_1 = require("../services/powershell");
const settings_1 = require("../services/settings");
const logger_1 = require("../services/logger");
const electron_log_1 = __importDefault(require("electron-log"));
const history_db_1 = require("../services/history-db");
const threat_db_1 = require("../services/threat-db");
function registerIpcHandlers() {
    logger_1.LoggerService.init();
    history_db_1.HistoryDB.init();
    threat_db_1.ThreatDB.init();
    // === CLEANUP ===
    electron_1.ipcMain.handle('scan:run', async () => {
        electron_log_1.default.info('[IPC] scan:run');
        const result = await (0, powershell_1.runPowerShell)('scan-clean.ps1', [], 'scan');
        history_db_1.HistoryDB.add({
            action: 'scan',
            target: 'System Scan',
            details: result.success
                ? `${result.data?.categories?.length || 0} categories, ${result.data?.totalItems || 0} files found`
                : (result.error || 'Scan failed'),
            sizeBytes: result.data?.totalSize || 0,
            status: result.success ? 'success' : 'error',
        });
        return result;
    });
    electron_1.ipcMain.handle('clean:execute', async (_e, categories) => {
        electron_log_1.default.info('[IPC] clean:execute', categories);
        const settings = settings_1.SettingsService.get();
        const args = ['-Category', categories.join(',')];
        if (settings.sendToRecycleBin)
            args.push('-UseRecycleBin');
        if (settings.dryRunDefault)
            args.push('-DryRun');
        const result = await (0, powershell_1.runPowerShell)('run-clean.ps1', args, 'clean');
        logger_1.LoggerService.log({
            timestamp: '', action: 'clean', category: categories.join(', '),
            itemCount: result.data?.itemCount || 0, sizeFreed: result.data?.sizeFreed || 0,
            status: result.success ? 'success' : 'error',
        });
        history_db_1.HistoryDB.add({
            action: 'clean',
            target: categories.join(', '),
            details: result.success
                ? `${result.data?.itemCount || 0} items cleaned, ${result.data?.sizeFreed || 0} bytes freed`
                : (result.error || 'Clean failed'),
            sizeBytes: result.data?.sizeFreed || 0,
            status: result.success ? 'success' : 'error',
        });
        return result;
    });
    electron_1.ipcMain.handle('purge:scan', async (_e, folders) => {
        return await (0, powershell_1.runPowerShell)('scan-purge.ps1', ['-Path', folders.join(',')], 'purge-scan');
    });
    electron_1.ipcMain.handle('purge:execute', async (_e, targets) => {
        const result = await (0, powershell_1.runPowerShell)('run-purge.ps1', ['-Target', targets.join(',')], 'purge-exec');
        history_db_1.HistoryDB.add({
            action: 'purge',
            target: `${targets.length} artifacts`,
            details: result.success
                ? `Purge completed, ${result.data?.sizeFreed || 0} bytes freed`
                : (result.error || 'Purge failed'),
            sizeBytes: result.data?.sizeFreed || 0,
            status: result.success ? 'success' : 'error',
        });
        return result;
    });
    electron_1.ipcMain.handle('analyze:disk', async (_e, path) => {
        return await (0, powershell_1.runPowerShell)('analyze-disk.ps1', ['-Path', path], 'analyze');
    });
    // === SECURITY ===
    electron_1.ipcMain.handle('security:scan', async (_e, scanType, path) => {
        const args = ['-ScanType', scanType];
        if (path)
            args.push('-Path', path);
        const result = await (0, powershell_1.runPowerShell)('security-scan.ps1', args, 'security-scan');
        const threatCount = result.data?.threats?.length || 0;
        history_db_1.HistoryDB.add({
            action: 'scan',
            target: `Security Scan (${scanType})${path ? ': ' + path : ''}`,
            details: result.success
                ? `${result.data?.scannedFiles || 0} files scanned, ${threatCount} threats found`
                : (result.error || 'Security scan failed'),
            riskScore: threatCount > 0 ? Math.max(...(result.data?.threats?.map((t) => t.riskScore) || [0])) : 0,
            status: result.success ? 'success' : 'error',
        });
        return result;
    });
    electron_1.ipcMain.handle('security:processes', async () => {
        return await (0, powershell_1.runPowerShell)('process-monitor.ps1', [], 'process-mon');
    });
    electron_1.ipcMain.handle('quarantine:action', async (_e, action, filePath, quarantineId) => {
        const args = ['-Action', action];
        if (filePath)
            args.push('-FilePath', filePath);
        if (quarantineId)
            args.push('-QuarantineId', quarantineId);
        const result = await (0, powershell_1.runPowerShell)('quarantine.ps1', args, 'quarantine');
        const histAction = action === 'add' ? 'quarantine' : action === 'restore' ? 'restore' : 'delete';
        history_db_1.HistoryDB.add({
            action: histAction,
            target: filePath || quarantineId || 'unknown',
            details: result.success ? `Quarantine ${action} completed` : (result.error || `Quarantine ${action} failed`),
            status: result.success ? 'success' : 'error',
        });
        return result;
    });
    electron_1.ipcMain.handle('security:repo', async (_e, path) => {
        return await (0, powershell_1.runPowerShell)('repo-scan.ps1', ['-Path', path], 'repo-scan');
    });
    electron_1.ipcMain.handle('security:live-guard', async (_e, watchPaths) => {
        return await (0, powershell_1.runPowerShell)('live-guard.ps1', ['-WatchPaths', watchPaths.join(',')], 'live-guard');
    });
    // === WEB / USB / NETWORK ===
    electron_1.ipcMain.handle('web:protection', async (_e, action) => {
        return await (0, powershell_1.runPowerShell)('web-protection.ps1', ['-Action', action], 'web-' + action);
    });
    electron_1.ipcMain.handle('usb:monitor', async (_e, action, driveLetter) => {
        const args = ['-Action', action];
        if (driveLetter)
            args.push('-DriveLetter', driveLetter);
        return await (0, powershell_1.runPowerShell)('usb-monitor.ps1', args, 'usb-' + action);
    });
    electron_1.ipcMain.handle('network:monitor', async (_e, action, remoteAddress, pid, ruleName) => {
        const args = ['-Action', action];
        if (remoteAddress)
            args.push('-RemoteAddress', remoteAddress);
        if (pid && pid > 0)
            args.push('-ProcessId', String(pid));
        if (ruleName)
            args.push('-RuleName', ruleName);
        return await (0, powershell_1.runPowerShell)('network-monitor.ps1', args, 'net-' + action);
    });
    // === FILE EXPLORER ===
    electron_1.ipcMain.handle('file:list', async (_e, path) => {
        const args = ['-Action', 'list'];
        if (path)
            args.push('-Path', path);
        return await (0, powershell_1.runPowerShell)('file-explorer.ps1', args, 'file-list');
    });
    electron_1.ipcMain.handle('file:delete', async (_e, path) => {
        return await (0, powershell_1.runPowerShell)('file-explorer.ps1', ['-Action', 'delete', '-Path', path], 'file-delete');
    });
    electron_1.ipcMain.handle('file:rename', async (_e, path, newName) => {
        return await (0, powershell_1.runPowerShell)('file-explorer.ps1', ['-Action', 'rename', '-Path', path, '-NewName', newName], 'file-rename');
    });
    electron_1.ipcMain.handle('file:copy', async (_e, path, destination) => {
        return await (0, powershell_1.runPowerShell)('file-explorer.ps1', ['-Action', 'copy', '-Path', path, '-Destination', destination], 'file-copy');
    });
    electron_1.ipcMain.handle('file:move', async (_e, path, destination) => {
        return await (0, powershell_1.runPowerShell)('file-explorer.ps1', ['-Action', 'move', '-Path', path, '-Destination', destination], 'file-move');
    });
    electron_1.ipcMain.handle('file:create-folder', async (_e, path) => {
        return await (0, powershell_1.runPowerShell)('file-explorer.ps1', ['-Action', 'create-folder', '-Path', path], 'file-mkdir');
    });
    electron_1.ipcMain.handle('file:info', async (_e, path) => {
        return await (0, powershell_1.runPowerShell)('file-explorer.ps1', ['-Action', 'info', '-Path', path], 'file-info');
    });
    electron_1.ipcMain.handle('file:open', async (_e, path) => {
        return await (0, powershell_1.runPowerShell)('file-explorer.ps1', ['-Action', 'open', '-Path', path], 'file-open');
    });
    // === APP UNINSTALLER ===
    electron_1.ipcMain.handle('app:uninstaller', async (_e, action, appId) => {
        const args = ['-Action', action];
        if (appId)
            args.push('-AppId', appId);
        const result = await (0, powershell_1.runPowerShell)('app-uninstaller.ps1', args, 'app-uninstall-' + action);
        if (action === 'uninstall' && result.success) {
            history_db_1.HistoryDB.add({
                action: 'uninstall',
                target: result.appName || appId || 'unknown',
                details: `App uninstalled, ${result.leftoverCount || 0} leftovers found`,
                status: 'success',
            });
        }
        return result;
    });
    // === SYSTEM OPTIMIZE ===
    electron_1.ipcMain.handle('system:optimize', async (_e, action, tasks) => {
        const args = ['-Action', action];
        if (tasks && tasks.length > 0)
            args.push('-Tasks', tasks.join(','));
        const result = await (0, powershell_1.runPowerShell)('system-optimize.ps1', args, 'sys-opt-' + action);
        if (action === 'optimize' && result.success) {
            history_db_1.HistoryDB.add({
                action: 'optimize',
                target: `${result.data?.completedCount || 0} tasks`,
                details: `Optimization completed, ${result.data?.totalSizeFreed || 0} bytes freed`,
                sizeBytes: result.data?.totalSizeFreed || 0,
                status: 'success',
            });
        }
        return result;
    });
    // === INSTALLER CLEANUP ===
    electron_1.ipcMain.handle('installer:cleanup', async (_e, action, targets) => {
        const args = ['-Action', action];
        if (targets && targets.length > 0)
            args.push('-Targets', targets.join('|'));
        const result = await (0, powershell_1.runPowerShell)('installer-cleanup.ps1', args, 'installer-' + action);
        if (action === 'clean' && result.success) {
            history_db_1.HistoryDB.add({
                action: 'clean',
                target: `${result.data?.cleaned || 0} installer files`,
                details: `Installer cleanup, ${result.data?.cleanedSize || 0} bytes freed`,
                sizeBytes: result.data?.cleanedSize || 0,
                status: 'success',
            });
        }
        return result;
    });
    // === SYSTEM ===
    electron_1.ipcMain.handle('status:get', async () => {
        return await (0, powershell_1.runPowerShell)('status.ps1', [], 'status');
    });
    electron_1.ipcMain.handle('task:cancel', async (_e, taskId) => {
        return (0, powershell_1.cancelTask)(taskId);
    });
    electron_1.ipcMain.handle('settings:get', async () => settings_1.SettingsService.get());
    electron_1.ipcMain.handle('settings:update', async (_e, partial) => settings_1.SettingsService.update(partial));
    electron_1.ipcMain.handle('logs:list', async (_e, date) => logger_1.LoggerService.getLogs(date));
    electron_1.ipcMain.handle('logs:dates', async () => logger_1.LoggerService.getLogDates());
    // === HISTORY DB ===
    electron_1.ipcMain.handle('history:list', async (_e, limit, offset) => {
        return history_db_1.HistoryDB.getAll(limit || 100, offset || 0);
    });
    electron_1.ipcMain.handle('history:add', async (_e, entry) => {
        return history_db_1.HistoryDB.add(entry);
    });
    electron_1.ipcMain.handle('history:search', async (_e, query) => {
        return history_db_1.HistoryDB.search(query);
    });
    electron_1.ipcMain.handle('history:stats', async () => {
        return history_db_1.HistoryDB.getStats();
    });
    electron_1.ipcMain.handle('history:by-action', async (_e, action) => {
        return history_db_1.HistoryDB.getByAction(action);
    });
    // === RESOURCE USAGE ===
    let lastCpuInfo = os_1.default.cpus().map(c => ({ idle: c.times.idle, total: Object.values(c.times).reduce((a, b) => a + b, 0) }));
    electron_1.ipcMain.handle('system:resource-usage', async () => {
        const cpus = os_1.default.cpus();
        const currentInfo = cpus.map(c => ({ idle: c.times.idle, total: Object.values(c.times).reduce((a, b) => a + b, 0) }));
        let idleDiff = 0, totalDiff = 0;
        for (let i = 0; i < cpus.length; i++) {
            idleDiff += currentInfo[i].idle - lastCpuInfo[i].idle;
            totalDiff += currentInfo[i].total - lastCpuInfo[i].total;
        }
        lastCpuInfo = currentInfo;
        const cpuPercent = totalDiff > 0 ? ((1 - idleDiff / totalDiff) * 100) : 0;
        const totalMem = os_1.default.totalmem();
        const freeMem = os_1.default.freemem();
        const usedMem = totalMem - freeMem;
        return {
            cpu: cpuPercent,
            memory: { used: usedMem, total: totalMem, percent: (usedMem / totalMem) * 100 },
        };
    });
    // === THREAT DB ===
    electron_1.ipcMain.handle('threat:list', async (_e, limit, offset) => {
        return threat_db_1.ThreatDB.getAll(limit || 100, offset || 0);
    });
    electron_1.ipcMain.handle('threat:add', async (_e, entry) => {
        return threat_db_1.ThreatDB.add(entry);
    });
    electron_1.ipcMain.handle('threat:search', async (_e, query) => {
        return threat_db_1.ThreatDB.search(query);
    });
    electron_1.ipcMain.handle('threat:stats', async () => {
        return threat_db_1.ThreatDB.getStats();
    });
    electron_1.ipcMain.handle('threat:by-type', async (_e, type) => {
        return threat_db_1.ThreatDB.getByType(type);
    });
    electron_1.ipcMain.handle('threat:update-action', async (_e, id, action) => {
        return threat_db_1.ThreatDB.updateAction(id, action);
    });
    electron_1.ipcMain.handle('threat:delete', async (_e, id) => {
        return threat_db_1.ThreatDB.delete(id);
    });
}
