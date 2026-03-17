"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoggerService = void 0;
const electron_1 = require("electron");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
let logDir = '';
class LoggerService {
    static init() {
        logDir = path_1.default.join(electron_1.app.getPath('userData'), 'logs');
        if (!fs_1.default.existsSync(logDir))
            fs_1.default.mkdirSync(logDir, { recursive: true });
    }
    static log(entry) {
        const today = new Date().toISOString().split('T')[0];
        const logFile = path_1.default.join(logDir, `mole-${today}.json`);
        let entries = [];
        try {
            if (fs_1.default.existsSync(logFile)) {
                entries = JSON.parse(fs_1.default.readFileSync(logFile, 'utf-8'));
            }
        }
        catch { }
        entries.push({ ...entry, timestamp: new Date().toISOString() });
        fs_1.default.writeFileSync(logFile, JSON.stringify(entries, null, 2));
    }
    static getLogs(date) {
        const today = date || new Date().toISOString().split('T')[0];
        const logFile = path_1.default.join(logDir, `mole-${today}.json`);
        try {
            if (fs_1.default.existsSync(logFile)) {
                return JSON.parse(fs_1.default.readFileSync(logFile, 'utf-8'));
            }
        }
        catch { }
        return [];
    }
    static getLogDates() {
        try {
            return fs_1.default.readdirSync(logDir)
                .filter(f => f.startsWith('mole-') && f.endsWith('.json'))
                .map(f => f.replace('mole-', '').replace('.json', ''))
                .sort()
                .reverse();
        }
        catch {
            return [];
        }
    }
}
exports.LoggerService = LoggerService;
