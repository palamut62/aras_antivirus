# Aras Antivirus

<p align="center">Windows-focused security scanning, real-time protection, and cleanup desktop suite built with Tauri.</p>

<p align="center">
  <a href="https://github.com/palamut62/aras_antivirus">Repository</a> |
  <a href="https://github.com/palamut62/aras_antivirus/releases">Releases</a> |
  <a href="https://github.com/palamut62/aras_antivirus/issues">Issues</a>
</p>

![badge](https://img.shields.io/badge/version-1.6.0-2563EB)
![badge](https://img.shields.io/badge/license-MIT-22C55E)
![badge](https://img.shields.io/badge/platform-Windows-0078D4?logo=windows&logoColor=white)
![badge](https://img.shields.io/badge/Tauri-24C8DB?logo=tauri&logoColor=white)
![badge](https://img.shields.io/badge/Rust-000000?logo=rust&logoColor=white)
![badge](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![badge](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)
![badge](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)
![badge](https://img.shields.io/badge/PowerShell-5391FE?logo=powershell&logoColor=white)

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Programming Languages](#programming-languages)
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
- Windows Defender-backed threat checks
- Optional VirusTotal hash intelligence
- Real-time background guard
- Quarantine with restore and permanent delete
- USB and network monitoring tools
- Cleanup and optimization modules
- Logs, notifications, and bilingual UI (TR/EN)

## Tech Stack

| Technology | Role |
| --- | --- |
| Tauri 2 | Desktop runtime, command bridge, and packaging |
| Rust | Native command and service implementation (`src-tauri`) |
| React 18 | UI layer |
| Vite 5 | Frontend dev/build tooling |
| TypeScript 5 | Type-safe frontend and app integration code |
| PowerShell | Security, cleanup, and system automation scripts |
| Windows Defender | Native malware scanning and threat status |
| SQLite | Local persistence for app history/settings services |
| Tailwind CSS | UI styling |
| Zustand | Client-side state management |
| React Router | In-app page routing |

## Programming Languages

- Rust
- TypeScript
- JavaScript (tooling/runtime ecosystem)
- PowerShell
- HTML
- CSS

## Architecture

```text
Frontend (React + Vite + TypeScript)
  -> Tauri invoke bridge
Tauri Core (Rust)
  -> commands/ + services/
  -> PowerShell host integration
Windows services
  -> Defender, filesystem, process/network operations
Storage
  -> SQLite-backed history/settings modules
```

## Project Structure

```text
aras_antivirus/
  app/
    renderer/
  backend/
    ps/
  src-tauri/
    src/
      commands/
      services/
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
- Rust toolchain (required for Tauri builds)

### Installation

```bash
git clone https://github.com/palamut62/aras_antivirus.git
cd aras_antivirus
npm install
```

### Run (Development)

```bash
npm run tauri:dev
```

## Configuration

- `VIRUSTOTAL_API_KEY` (optional): enables VirusTotal checks.
- You can set this via app settings or environment variable.

## Usage

1. Start the app with `npm run tauri:dev`.
2. Run quick/full/custom scans.
3. Review detections in Threats and Quarantine.
4. Use cleanup and optimization modules as needed.
5. Track events from logs/dashboard views.

## Testing

There is no dedicated automated test suite yet.

Use these checks:

```bash
npm run build
npm run tauri:build
```

## Deployment

```bash
npm run tauri:build
```

## Roadmap

- [ ] Add automated integration and regression checks
- [ ] Expand threat intelligence reporting
- [ ] Improve signed release pipeline

## Contributing

1. Fork the repository.
2. Create a branch from `main`.
3. Keep commits focused and descriptive.
4. Open a PR with implementation details and validation notes.

## Security

- Do not disclose vulnerabilities publicly before maintainer review.
- Report sensitive findings privately to maintainers.
- Include impact, reproduction, and affected versions.

## FAQ

### Is this Windows-only?

Yes. Core workflows rely on Windows-specific tooling and Defender APIs.

### Is VirusTotal required?

No. VirusTotal is optional and works when `VIRUSTOTAL_API_KEY` is configured.

### Can I run without packaging?

Yes. Use `npm run tauri:dev` in development.

## License

Distributed under the MIT License. See `LICENSE` for details.

## Acknowledgments

- Tauri and Rust communities
- React and Vite communities
- Microsoft Defender and PowerShell ecosystem
