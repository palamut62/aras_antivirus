"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runPowerShell = runPowerShell;
exports.cancelTask = cancelTask;
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
const electron_log_1 = __importDefault(require("electron-log"));
const activeProcesses = new Map();
const taskQueue = [];
let runningCount = 0;
const MAX_CONCURRENT = 1;
function processQueue() {
    while (runningCount < MAX_CONCURRENT && taskQueue.length > 0) {
        const next = taskQueue.shift();
        runningCount++;
        next.run();
    }
}
function runPowerShell(scriptName, args = [], taskId) {
    return new Promise((outerResolve) => {
        const entry = {
            resolve: outerResolve,
            run: () => runPowerShellInternal(scriptName, args, taskId).then(result => {
                runningCount--;
                outerResolve(result);
                processQueue();
            }),
        };
        taskQueue.push(entry);
        processQueue();
    });
}
function runPowerShellInternal(scriptName, args = [], taskId) {
    return new Promise((resolve) => {
        // In production, backend/ is in app.asar.unpacked; in dev, it's in project root
        const basePath = __dirname.replace('app.asar', 'app.asar.unpacked');
        const scriptPath = path_1.default.join(basePath, '../../../backend/ps', scriptName);
        const psArgs = [
            '-ExecutionPolicy', 'Bypass',
            '-NoProfile',
            '-NonInteractive',
            '-File', scriptPath,
            ...args,
        ];
        electron_log_1.default.info(`[PS] Running: ${scriptName} ${args.join(' ')}`);
        const proc = (0, child_process_1.spawn)('powershell.exe', psArgs, {
            stdio: ['ignore', 'pipe', 'pipe'],
            windowsHide: true,
        });
        if (taskId) {
            activeProcesses.set(taskId, proc);
        }
        let stdout = '';
        let stderr = '';
        proc.stdout.on('data', (chunk) => {
            stdout += chunk.toString();
        });
        proc.stderr.on('data', (chunk) => {
            stderr += chunk.toString();
        });
        proc.on('close', (code) => {
            if (taskId)
                activeProcesses.delete(taskId);
            if (code !== 0) {
                electron_log_1.default.error(`[PS] ${scriptName} failed: ${stderr}`);
                resolve({ success: false, data: null, error: stderr || `Exit code ${code}` });
                return;
            }
            try {
                const data = JSON.parse(stdout.trim());
                resolve({ success: true, data });
            }
            catch {
                resolve({ success: true, data: stdout.trim() });
            }
        });
        proc.on('error', (err) => {
            if (taskId)
                activeProcesses.delete(taskId);
            electron_log_1.default.error(`[PS] spawn error: ${err.message}`);
            resolve({ success: false, data: null, error: err.message });
        });
    });
}
function cancelTask(taskId) {
    const proc = activeProcesses.get(taskId);
    if (proc) {
        proc.kill();
        activeProcesses.delete(taskId);
        electron_log_1.default.info(`[PS] Task ${taskId} cancelled`);
        return true;
    }
    return false;
}
