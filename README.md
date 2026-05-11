# Aras Antivirus

Aras Antivirus is a Windows desktop application for security scanning, real-time protection, malware quarantine, cleanup, and system optimization.

It combines:
- A React desktop UI
- An Electron main process with tray integration
- PowerShell-based backend operations
- Windows Defender + optional VirusTotal checks

Version: `1.6.0`

## What Is Included

### Security
- Quick, full, and custom security scans
- Windows Defender integration (`Start-MpScan`, threat status checks)
- Optional VirusTotal hash lookups
- Real-time background guard for Downloads, Desktop, Documents, Pictures, Temp
- USB event monitoring and suspicious file checks
- Network monitor with suspicious connection review
- Web protection checks (downloads/history/extensions)
- Quarantine flow with restore and permanent delete
- Threat history and event tracking

### Cleanup and Optimization
- Deep clean categories for temp/cache/junk sources
- Developer cleanup (build artifacts, package caches, tooling leftovers)
- App uninstaller support
- Installer cleanup
- System optimization actions
- Disk analysis and file explorer utilities

### UX and Operations
- Tray menu with live status and recent activity
- Native desktop notifications
- Top banner notifications in app
- Command palette and page shortcuts
- Multi-page dashboard and detailed activity history
- Logs hub (activity, operation logs, runtime logs)
- Turkish and English language support

## Recent Updates Included In This State

This repository state includes the following major updates:
- Unified app icon rollout (window UI, tray, renderer, bundle assets, desktop shortcut)
- Transparent icon variants and size set updates (`.png` + `.ico`)
- Tray icon load path hardening (`png` preferred with `ico` fallback)
- Recent Activity detail dialog improvements
- Logs page expansion and routing improvements
- Settings and Help layout balancing improvements
- Added/updated navigation access to Logs Hub
- Hidden-start shortcut workflow updates
- Multiple encoding and UI text fixes across modified files

## Architecture

```text
Renderer (React + Vite)
  -> preload bridge (typed window API)
  -> Electron IPC handlers
Main Process (Electron)
  -> services (settings, logger, history, scheduled scan, background guard)
  -> PowerShell scripts (security/cleanup/system operations)
Windows platform services
  -> Defender, WMI, filesystem, networking, notifications
```

## Project Structure

```text
aras_antivirus/
  app/
    main/
      index.ts
      ipc/
      services/
    preload/
      index.ts
    renderer/
      index.html
      src/
        components/
        contexts/
        lib/
        pages/
        stores/
        types/
  backend/
    ps/
  assets/
  src-tauri/
  dist/
  scripts/
```

## Requirements

- Windows 10 or Windows 11
- PowerShell 5.1+
- Node.js 18+ (for development)
- npm 9+
- Windows Defender enabled (for Defender-backed checks)
- VirusTotal API key (optional)

## Development

```bash
git clone https://github.com/palamut62/aras_antivirus.git
cd aras_antivirus
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Packaging

```bash
npm run dist
```

## Desktop Shortcut (Hidden Launch)

This repository includes hidden-start launcher flow:
- `start-aras-hidden.vbs`
- desktop shortcut targeting `wscript.exe`

The shortcut is configured to:
- start app without showing a terminal window
- use the project icon file from `assets/icon.ico`

## Logging

The application logs are available in two forms:
- UI logs via Logs page (history/operations/runtime)
- Electron log files via `electron-log` service

## Security Notes

- Real-time checks and cleanup scripts may require elevated permissions depending on target paths.
- Defender and firewall operations depend on local Windows policy.
- VirusTotal free tier has strict rate limits.

## License

MIT
