# Aras Antivirus

A modern, all-in-one **security and system optimization** desktop application for Windows. Built with Electron + React, powered by PowerShell backend scripts with **Windows Defender** and **VirusTotal** integration.

![Version](https://img.shields.io/badge/version-1.5.1-blue)
![Platform](https://img.shields.io/badge/platform-Windows%2010%2F11-green)
![License](https://img.shields.io/badge/license-MIT-orange)

## 3-Layer Threat Detection

| Layer | Engine | What it Detects |
|-------|--------|-----------------|
| **Heuristic** | Rule-based analysis | Encoded payloads, suspicious patterns, entropy anomalies, API key exposure |
| **Windows Defender** | Microsoft signature DB | Trojans, viruses, spyware, ransomware, worms, backdoors |
| **VirusTotal** | 70+ AV engines | All known malware (Kaspersky, BitDefender, ESET, McAfee, Avast, etc.) |

## Features

### Security & Antivirus
- **Security Scan** — Quick, Full, and Custom scan modes with heuristic analysis, Windows Defender integration, and VirusTotal hash checking
- **Real-time Protection** — Background file monitoring (Downloads, Desktop, Documents, Pictures, Temp) with Windows Defender real-time scanning and auto-quarantine
- **Windows Defender Integration** — `Start-MpScan` for file scanning, `Get-MpThreatDetection` for threat data, signature version tracking
- **VirusTotal Integration** — SHA256 hash lookup against 70+ AV engines, threat classification, rate-limit aware (4 req/min free tier)
- **Network Monitor & Blocking** — Active TCP/UDP connections, DGA detection, suspicious port analysis, IP blocking via Windows Firewall, process termination
- **USB Auto-Detection** — WMI event watcher for instant USB insertion, autorun.inf analysis, known USB malware signatures, suspicious .lnk scanning
- **Web Protection** — Download scanning, Chrome/Edge history analysis, browser extension auditing, temp executable detection. Multi-select categories with checkbox UI
- **Process Monitor** — Running process list with CPU/memory, risk scoring for temp-folder execution, encoded command lines
- **Quarantine System** — Isolate, restore, or permanently delete detected threats with SHA256 metadata tracking
- **Repo Security Scan** — npm lifecycle script analysis, Python malicious package detection, hardcoded secret scanning (GitHub PATs, AWS keys, Slack tokens, etc.)
- **Threat Database** — Persistent threat records with search, filter by type, and statistics

### Cleanup & Optimization
- **Deep Clean** — 19 categories: Windows/User Temp, Chrome/Edge/Firefox cache, crash dumps, Windows Update cache, thumbnail cache, prefetch, npm/pip cache, Recycle Bin, log files, Delivery Optimization. Supports dry-run preview and Recycle Bin mode
- **App Uninstaller** — Registry-based installed program listing, silent uninstall, force uninstall with leftover cleanup (AppData, ProgramData, Registry, Start Menu, Desktop shortcuts)
- **Dev Purge** — Find and remove node_modules, dist, build, .next, .turbo, __pycache__, bin/obj, target and 12+ artifact types
- **Installer Cleanup** — Find old .exe/.msi/.msix files in Downloads, Desktop, Temp, Scoop cache. Age-based filtering (>30 days)
- **System Optimization** — 8 tasks: DNS flush, Windows Search rebuild, Disk optimize (SSD Trim/HDD Defrag), Temp cleanup, SFC scan, Network reset, Windows Update cleanup, Startup program review
- **Disk Analysis** — Tree view of disk usage with folder hierarchy and large file detection
- **File Explorer** — Browse, copy, move, delete, rename files and folders

### System & UI
- **Dynamic System Tray** — Live protection status, background guard state, scheduled scan info, last 5 operations log. Updates every 30 seconds
- **Native Windows Toast Notifications** — When app window is hidden/minimized, all notifications appear as native Windows toasts. Click to open app and navigate to relevant page
- **Notification Deduplication** — Same notification won't repeat within 10 minutes. Same threat won't trigger again
- **System Status** — Real-time CPU, memory, and disk usage monitoring
- **Settings** — Live protection toggle, auto-start, dry-run mode, Recycle Bin preference, protected folders, VirusTotal API key, scheduled scan interval, theme (dark/light), language (Turkish/English)
- **Logs & History** — Full operation history with search and filtering
- **Multi-language** — Complete Turkish/English support across all UI, tray menu, and toast notifications

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop Framework | Electron 30 |
| Frontend | React 18 + React Router v6 |
| Styling | TailwindCSS + PostCSS |
| Build | Vite 5 + TypeScript 5 |
| State Management | Zustand |
| Icons | Lucide React |
| Logging | electron-log |
| Packaging | electron-builder (NSIS) |
| Backend | PowerShell scripts (21 scripts) |
| AV Engine | Windows Defender + VirusTotal API |
| IPC | Electron IPC + Context Bridge |

## Architecture

```
Electron Renderer (React UI — 22 pages)
    ↓ IPC Channels (90+ operations)
Electron Main Process (Node.js)
    ├── Background Guard (file/network/USB monitoring)
    ├── Scheduled Scan (automatic periodic scanning)
    ├── System Tray (dynamic menu + toast notifications)
    ↓ PowerShell Runner
Backend Scripts (21 .ps1 files)
    ├── Windows Defender API (Start-MpScan, Get-MpThreatDetection)
    ├── VirusTotal REST API (70+ AV engines)
    └── Windows System APIs (WMI, Registry, Firewall, Services)
```

## Installation

### From Release (Recommended)
1. Download `Aras Antivirüs Setup 1.5.1.exe` from [Releases](https://github.com/palamut62/aras_antivirus/releases)
2. Run the installer
3. The app starts automatically and sits in system tray

### VirusTotal Setup (Optional)
1. Sign up at [virustotal.com](https://www.virustotal.com)
2. Go to Profile → API Key
3. Add it in Settings → VirusTotal API Key

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
- Windows Defender (enabled, for AV scanning)
- VirusTotal API Key (optional, for cloud scanning)

## Project Structure

```
aras_antivirus/
├── app/
│   ├── main/                    # Electron main process
│   │   ├── index.ts             # App entry, window, tray, activity log
│   │   ├── ipc/handlers.ts      # IPC event handlers (90+ channels)
│   │   └── services/            # PowerShell runner, settings, DBs,
│   │                            # background guard, scheduled scan, history
│   ├── preload/index.ts         # Secure API bridge (context isolation)
│   └── renderer/src/            # React application
│       ├── pages/               # 22 feature pages
│       ├── components/          # Sidebar, TitleBar, StatusBar,
│       │                        # TopBanner, AlertDialog
│       ├── stores/              # Zustand state (notifications, scan)
│       └── contexts/            # Theme + Language
├── backend/
│   └── ps/                      # 21 PowerShell scripts
│       ├── security-scan.ps1    # Heuristic + Defender + VT scan
│       ├── live-guard.ps1       # Real-time file monitoring
│       ├── defender-scan.ps1    # Windows Defender integration
│       ├── virustotal.ps1       # VirusTotal API client
│       ├── network-monitor.ps1  # TCP/UDP + DNS + firewall
│       ├── web-protection.ps1   # Browser history/extensions
│       ├── usb-monitor.ps1      # USB drive scanning
│       ├── quarantine.ps1       # File isolation system
│       ├── scan-clean.ps1       # Junk file scanner (19 categories)
│       ├── run-clean.ps1        # Junk file cleaner
│       ├── system-optimize.ps1  # System optimization tasks
│       ├── app-uninstaller.ps1  # App removal + leftover cleanup
│       └── ...                  # 9 more scripts
├── assets/                      # Icons
└── dist/                        # Compiled output
```

## License

MIT
