"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsService = void 0;
const electron_1 = require("electron");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const electron_log_1 = __importDefault(require("electron-log"));
const DEFAULT_SETTINGS = {
    dryRunDefault: true,
    sendToRecycleBin: true,
    theme: 'dark',
    protectedPaths: [
        'C:\\Windows',
        'C:\\Program Files',
        'C:\\Program Files (x86)',
    ],
    devFolders: [],
    customScanFolders: [],
    loggingEnabled: true,
    language: 'tr',
    liveProtection: true,
    autoStart: true,
    scheduledScan: false,
    scheduledScanInterval: 'daily',
    scheduledScanHours: 6,
};
let settingsPath = '';
let currentSettings = { ...DEFAULT_SETTINGS };
class SettingsService {
    static init() {
        const appData = electron_1.app.getPath('userData');
        settingsPath = path_1.default.join(appData, 'settings.json');
        this.load();
    }
    static load() {
        try {
            if (fs_1.default.existsSync(settingsPath)) {
                const raw = fs_1.default.readFileSync(settingsPath, 'utf-8');
                currentSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
            }
            else {
                this.save();
            }
        }
        catch (err) {
            electron_log_1.default.error('[Settings] Load error:', err);
            currentSettings = { ...DEFAULT_SETTINGS };
        }
    }
    static save() {
        try {
            const dir = path_1.default.dirname(settingsPath);
            if (!fs_1.default.existsSync(dir))
                fs_1.default.mkdirSync(dir, { recursive: true });
            fs_1.default.writeFileSync(settingsPath, JSON.stringify(currentSettings, null, 2));
        }
        catch (err) {
            electron_log_1.default.error('[Settings] Save error:', err);
        }
    }
    static get() {
        return { ...currentSettings };
    }
    static update(partial) {
        currentSettings = { ...currentSettings, ...partial };
        this.save();
        return this.get();
    }
}
exports.SettingsService = SettingsService;
