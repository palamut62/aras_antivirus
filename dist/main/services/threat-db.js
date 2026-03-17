"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThreatDB = void 0;
const electron_1 = require("electron");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const electron_log_1 = __importDefault(require("electron-log"));
let dbPath = '';
let threats = [];
class ThreatDB {
    static init() {
        const appData = electron_1.app.getPath('userData');
        dbPath = path_1.default.join(appData, 'threats.json');
        this.load();
    }
    static load() {
        try {
            if (fs_1.default.existsSync(dbPath)) {
                threats = JSON.parse(fs_1.default.readFileSync(dbPath, 'utf-8'));
            }
        }
        catch (err) {
            electron_log_1.default.error('[ThreatDB] Load error:', err);
            threats = [];
        }
    }
    static save() {
        try {
            const dir = path_1.default.dirname(dbPath);
            if (!fs_1.default.existsSync(dir))
                fs_1.default.mkdirSync(dir, { recursive: true });
            fs_1.default.writeFileSync(dbPath, JSON.stringify(threats, null, 2));
        }
        catch (err) {
            electron_log_1.default.error('[ThreatDB] Save error:', err);
        }
    }
    static add(entry) {
        // Don't duplicate same file+hash
        const existing = threats.find(t => t.sha256 === entry.sha256 && t.filePath === entry.filePath);
        if (existing) {
            // Update action
            existing.action = entry.action;
            existing.timestamp = new Date().toISOString();
            this.save();
            return existing;
        }
        const newEntry = {
            ...entry,
            id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            timestamp: new Date().toISOString(),
        };
        threats.unshift(newEntry);
        if (threats.length > 10000)
            threats = threats.slice(0, 10000);
        this.save();
        return newEntry;
    }
    static getAll(limit = 100, offset = 0) {
        return threats.slice(offset, offset + limit);
    }
    static getByType(type, limit = 100) {
        return threats.filter(t => t.threatType === type).slice(0, limit);
    }
    static getBySeverity(severity, limit = 100) {
        return threats.filter(t => t.severity === severity).slice(0, limit);
    }
    static search(query, limit = 100) {
        const q = query.toLowerCase();
        return threats.filter(t => t.fileName.toLowerCase().includes(q) ||
            t.filePath.toLowerCase().includes(q) ||
            t.threatName.toLowerCase().includes(q) ||
            t.threatType.includes(q) ||
            t.sha256.includes(q)).slice(0, limit);
    }
    static getStats() {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        return {
            total: threats.length,
            today: threats.filter(t => t.timestamp >= today).length,
            byType: {
                virus: threats.filter(t => t.threatType === 'virus').length,
                trojan: threats.filter(t => t.threatType === 'trojan').length,
                malware: threats.filter(t => t.threatType === 'malware').length,
                adware: threats.filter(t => t.threatType === 'adware').length,
                spyware: threats.filter(t => t.threatType === 'spyware').length,
                ransomware: threats.filter(t => t.threatType === 'ransomware').length,
                pup: threats.filter(t => t.threatType === 'pup').length,
                unknown: threats.filter(t => t.threatType === 'unknown').length,
            },
            bySeverity: {
                critical: threats.filter(t => t.severity === 'critical').length,
                high: threats.filter(t => t.severity === 'high').length,
                medium: threats.filter(t => t.severity === 'medium').length,
                low: threats.filter(t => t.severity === 'low').length,
            },
            quarantined: threats.filter(t => t.action === 'quarantined').length,
            deleted: threats.filter(t => t.action === 'deleted').length,
        };
    }
    static updateAction(id, action) {
        const t = threats.find(t => t.id === id);
        if (t) {
            t.action = action;
            this.save();
            return t;
        }
        return null;
    }
    static delete(id) {
        threats = threats.filter(t => t.id !== id);
        this.save();
    }
    static clear() {
        threats = [];
        this.save();
    }
}
exports.ThreatDB = ThreatDB;
