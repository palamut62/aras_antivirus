# Aras Antivirus

A modern, all-in-one **security and system optimization** desktop application for Windows. Built with Electron + React, powered by PowerShell backend scripts.

## Features

### Security
- **Security Scan** — Quick, Full, and Custom scan modes with entropy analysis, heuristic detection (encoded PowerShell, Base64, suspicious URLs, API key exposure, known malware strings)
- **Real-time Protection** — Background file monitoring (Downloads, Desktop, Documents, Pictures, Temp) with auto-quarantine for high-risk threats
- **Network Monitor & Blocking** — View all active TCP connections, detect suspicious activity (DGA patterns, unusual ports), block/unblock IPs via Windows Firewall, kill connections, manual IP blocking
- **USB Auto-Detection** — WMI event watcher for instant USB insertion detection, autorun.inf analysis, known USB malware detection, suspicious .lnk file scanning
- **Web Protection** — Download scanning, browser extension analysis, temp executable detection
- **Process Monitor** — Running process list with CPU/memory, risk scoring for suspicious behavior
- **Quarantine System** — Isolate, restore, or permanently delete detected threats with metadata tracking
- **Repo Security Scan** — npm lifecycle script analysis, hardcoded token detection, obfuscation detection
- **Threat Database** — Persistent threat records with search, filter by type, and statistics

### Cleanup
- **Deep Clean** — 11 categories: Windows/User Temp, Chrome/Edge cache, crash dumps, Windows Update cache, thumbnail cache, npm/pip cache, Recycle Bin. Supports dry-run preview and Recycle Bin mode
- **App Uninstaller** — List installed programs from registry, silent uninstall, leftover file detection and cleanup (AppData, ProgramData, Registry)
- **Dev Purge** — Find and remove node_modules, dist, build, .next, __pycache__, bin/obj, target and 12+ artifact types
- **Installer Cleanup** — Find old .exe/.msi/.msix files in Downloads, Desktop, Temp, Scoop cache. Age-based filtering (>30 days auto-selected)

### System
- **System Optimization** — 8 tasks: DNS flush, Windows Search rebuild, Disk optimize (SSD Trim/HDD Defrag), Temp cleanup, SFC scan, Network reset, Windows Update cleanup, Startup program review
- **Disk Analysis** — Tree view of disk usage with folder hierarchy and large file detection
- **File Explorer** — Browse, copy, move, delete, rename files and folders
- **System Status** — CPU, memory, and disk usage monitoring
- **Settings** — Live protection toggle, auto-start, dry-run mode, Recycle Bin preference, protected folders, theme, language (Turkish/English)
- **Logs & History** — Operation history with search and filtering

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop Framework | Electron 30 |
| Frontend | React 18 + React Router v6 |
| Styling | TailwindCSS + PostCSS |
| Build | Vite 5 + TypeScript 5 |
| State Management | Zustand (persistent) |
| Icons | Lucide React |
| Logging | electron-log |
| Packaging | electron-builder (NSIS) |
| Backend | PowerShell scripts (19 scripts) |
| IPC | Electron IPC + Context Bridge |

## Architecture

```
Electron Renderer (React UI)
    ↓ IPC Channels (80+ operations)
Electron Main Process (Node.js)
    ↓ PowerShell Runner
Backend Scripts (19 .ps1 files)
    ↓
Windows System APIs
```

## Installation

### From Release (Recommended)
1. Download `Aras Antivirüs Setup 1.0.0.exe` from [Releases](https://github.com/palamut62/aras_antivirus/releases)
2. Run the installer
3. The app will start automatically

### From Source
```bash
git clone https://github.com/palamut62/aras_antivirus.git
cd aras_antivirus
npm install
npm run dev        # Development mode
npm run build      # Compile TypeScript
npm run dist       # Build Windows installer
```

## Requirements

- Windows 10/11 (64-bit)
- PowerShell 5.1+

## Project Structure

```
aras_antivirus/
├── app/
│   ├── main/                    # Electron main process
│   │   ├── index.ts             # App entry, window, tray
│   │   ├── ipc/handlers.ts      # IPC event handlers
│   │   └── services/            # PowerShell runner, settings, DBs, background guard
│   ├── preload/index.ts         # Secure API bridge
│   └── renderer/src/            # React application
│       ├── pages/               # 21 feature pages
│       ├── components/          # Sidebar, TitleBar, StatusBar, AlertDialog
│       ├── stores/              # Zustand state
│       └── contexts/            # Theme + Language
├── backend/
│   └── ps/                      # 19 PowerShell scripts
├── assets/                      # Icons
└── dist/                        # Compiled output
```

## License

MIT
