# Aras Antivirus

<p align="center">Windows-focused security scanning, real-time protection, and cleanup desktop suite.</p>

<p align="center">
  <a href="https://github.com/palamut62/aras_antivirus">Repository</a> ·
  <a href="https://github.com/palamut62/aras_antivirus/releases">Releases</a> ·
  <a href="https://github.com/palamut62/aras_antivirus/issues">Issues</a>
</p>

![badge](https://img.shields.io/badge/version-1.6.0-2563EB)
![badge](https://img.shields.io/badge/license-MIT-22C55E)
![badge](https://img.shields.io/badge/platform-Windows-0078D4?logo=windows&logoColor=white)
![badge](https://img.shields.io/badge/Electron-191970?logo=electron&logoColor=white)
![badge](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)
![badge](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)
![badge](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![badge](https://img.shields.io/badge/PowerShell-5391FE?logo=powershell&logoColor=white)

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Usage](#usage)
- [Testing](#testing)
- [Deployment](#deployment)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [Security](#security)
- [FAQ](#faq)
- [License](#license)
- [Acknowledgments](#acknowledgments)

## Features

- Quick, full, and custom security scans
- Windows Defender-backed detection flow
- Optional VirusTotal hash lookup integration
- Real-time background guard for user folders
- Quarantine with restore and permanent delete operations
- USB monitoring, network monitoring, and suspicious activity checks
- Deep clean and developer cleanup utilities
- Desktop notifications, tray integration, and activity logging
- Turkish and English UI support

## Tech Stack

| Technology | Usage |
| --- | --- |
| Electron | Desktop shell, app lifecycle, tray integration, IPC bridge |
| React + Vite | Renderer UI and fast local development builds |
| TypeScript | Type-safe main/renderer application code |
| PowerShell | Security and cleanup operation scripts on Windows |
| Windows Defender | Native malware scan and threat status integration |
| Tauri (optional path) | Additional Rust/Tauri runtime artifacts in `src-tauri/` |

## Architecture

```text
Renderer (React + Vite)
  -> preload bridge (window API)
  -> IPC handlers
Main Process (Electron)
  -> services (settings, logs, history, scheduler, guard)
  -> PowerShell script runner
Windows platform services
  -> Defender, filesystem, process/network checks, notifications
```

## Project Structure

```text
aras_antivirus/
  app/
    main/
    preload/
    renderer/
  backend/
    ps/
  src-tauri/
  assets/
  scripts/
  README.md
```

## Getting Started

### Prerequisites

- Windows 10 or Windows 11
- PowerShell 5.1+
- Node.js 18+
- npm 9+

### Installation

```bash
git clone https://github.com/palamut62/aras_antivirus.git
cd aras_antivirus
npm install
```

### Run (Development)

```bash
npm run dev
```

## Configuration

- `VIRUSTOTAL_API_KEY` (optional): enables VirusTotal checks in related scripts and handlers.
- The key can be provided through app settings or environment variables depending on your workflow.

## Usage

1. Launch the app with `npm run dev` (or packaged binary).
2. Run a quick/full/custom scan from the Security pages.
3. Review detections in Threats and Quarantine.
4. Use cleanup pages (deep clean, dev cleanup, uninstall helpers) as needed.
5. Monitor activity from Logs and dashboard widgets.

## Testing

There is currently no dedicated automated test suite in this repository.  
For verification, run:

```bash
npm run build
```

Then manually validate key flows in the running app (`npm run dev`).

## Deployment

- Build desktop bundles with:

```bash
npm run dist
```

- Generate unpacked artifacts with:

```bash
npm run pack
```

## Roadmap

- [ ] Add automated integration checks for critical security flows
- [ ] Expand threat intelligence and reporting views
- [ ] Improve release automation and signed build pipeline

## Contributing

1. Fork the repository.
2. Create a branch from `main`.
3. Keep commits focused and descriptive.
4. Open a pull request with implementation context and manual test notes.

## Security

- Do not disclose vulnerabilities publicly before maintainers review them.
- Open a private channel with maintainers when reporting sensitive findings.
- Include reproduction steps, impact, and affected versions.

## FAQ

### Is this only for Windows?

Yes. The current workflow depends on Windows tooling (PowerShell and Defender).

### Is VirusTotal required?

No. VirusTotal checks are optional and work when `VIRUSTOTAL_API_KEY` is configured.

### Can I run without packaging?

Yes. Use `npm run dev` for development mode.

## License

Distributed under the MIT License. See `LICENSE` for details.

## Acknowledgments

- Electron, React, and Vite communities
- Microsoft Defender and PowerShell ecosystem

