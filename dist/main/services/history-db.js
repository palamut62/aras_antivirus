"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HistoryDB = void 0;
const electron_1 = require("electron");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const electron_log_1 = __importDefault(require("electron-log"));
let dbPath = '';
let history = [];
class HistoryDB {
    static init() {
        const appData = electron_1.app.getPath('userData');
        dbPath = path_1.default.join(appData, 'history.json');
        this.load();
    }
    static load() {
        try {
            if (fs_1.default.existsSync(dbPath)) {
                history = JSON.parse(fs_1.default.readFileSync(dbPath, 'utf-8'));
            }
        }
        catch (err) {
            electron_log_1.default.error('[HistoryDB] Load error:', err);
            history = [];
        }
    }
    static save() {
        try {
            const dir = path_1.default.dirname(dbPath);
            if (!fs_1.default.existsSync(dir))
                fs_1.default.mkdirSync(dir, { recursive: true });
            fs_1.default.writeFileSync(dbPath, JSON.stringify(history, null, 2));
        }
        catch (err) {
            electron_log_1.default.error('[HistoryDB] Save error:', err);
        }
    }
    static add(entry) {
        const newEntry = {
            ...entry,
            id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            timestamp: new Date().toISOString(),
        };
        history.unshift(newEntry); // newest first
        // Max 5000 entries
        if (history.length > 5000)
            history = history.slice(0, 5000);
        this.save();
        return newEntry;
    }
    static getAll(limit = 100, offset = 0) {
        return history.slice(offset, offset + limit);
    }
    static getByAction(action, limit = 100) {
        return history.filter(h => h.action === action).slice(0, limit);
    }
    static search(query, limit = 100) {
        const q = query.toLowerCase();
        return history.filter(h => h.target.toLowerCase().includes(q) ||
            h.details.toLowerCase().includes(q) ||
            h.action.includes(q)).slice(0, limit);
    }
    static getStats() {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        return {
            totalEntries: history.length,
            todayEntries: history.filter(h => h.timestamp >= today).length,
            totalScans: history.filter(h => h.action === 'scan').length,
            totalCleans: history.filter(h => h.action === 'clean').length,
            totalQuarantined: history.filter(h => h.action === 'quarantine').length,
            totalDeleted: history.filter(h => h.action === 'delete').length,
            totalBlocked: history.filter(h => h.action === 'block').length,
            totalRestored: history.filter(h => h.action === 'restore').length,
        };
    }
    static clear() {
        history = [];
        this.save();
    }
}
exports.HistoryDB = HistoryDB;
