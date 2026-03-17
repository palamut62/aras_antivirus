# PRD — Mole for Windows (Electron Edition)

## 1. Product Overview

**Product Name:** Mole for Windows  
**Type:** Native-feeling Windows desktop system cleanup and optimization app  
**Target Stack:** Electron + Node.js + PowerShell + optional Go helpers  
**Base Reference:** `tw93/Mole` repository, using its Windows direction as conceptual and code reference rather than rebuilding from scratch.

Mole’s main repository is positioned as a **macOS cleanup and optimization tool**, while the maintainers also note that an **experimental Windows version exists in the `windows` branch** for early adopters. The core Mole command set includes cleanup, uninstall, optimize, analyze, status, purge, update, and remove workflows. The main repo also emphasizes **safety-first defaults**, protected-directory rules, and `--dry-run` previews for destructive actions. citeturn724776view0turn724776view1

This PRD defines the **best-fit Windows product strategy** for you:  
**Electron desktop app for Windows**, with a clean GUI, while reusing Mole’s existing Windows-oriented operational model where possible.

---

## 2. Why Electron Is the Best Fit Here

Electron is the recommended direction for this Windows version because it gives you:

- fast GUI delivery
- easy integration with Node.js process management
- straightforward PowerShell command execution
- easier packaging with NSIS / electron-builder
- faster iteration than building a full native Windows UI first
- room to later add auto-update, logs, settings, onboarding, and advanced dashboards

Compared with a CLI-only port, Electron turns Mole into a **real end-user Windows product**.
Compared with WPF/WinUI, Electron is more practical here because the operational layer is already shell/script oriented, so Node + PowerShell is a natural bridge.

---

## 3. Problem Statement

Windows users accumulate:

- temp files
- package manager leftovers
- browser caches
- app update residue
- crash dumps
- recycle bin clutter
- developer build artifacts
- orphaned uninstall leftovers
- oversized folders and large forgotten files

Most Windows cleanup tools are either:

- too aggressive
- ad-heavy
- opaque about what they delete
- not developer-friendly
- weak for project/build-artifact cleanup

The goal is to build a **developer-friendly, transparent, modern cleanup app** for Windows inspired by Mole’s existing philosophy.

---

## 4. Product Vision

Create a Windows desktop app that feels like:

- a safer alternative to aggressive PC cleaner tools
- a developer-aware cleanup assistant
- a transparent operations dashboard
- a modern desktop utility with clear previews before deletion

Core principle:

**Never perform destructive cleanup without preview, clear categorization, and user confirmation.**

---

## 5. Target Users

### Primary Users
- Windows developers
- power users
- people with many project folders
- users working with Node.js, Python, .NET, Java, Android tooling

### Secondary Users
- general Windows users who want a clean and safe cleanup tool
- laptop users with limited SSD storage
- users wanting app leftovers and cache cleanup

---

## 6. Product Goals

### Main Goals
1. Deliver a usable Windows desktop GUI around Mole-like cleanup workflows.
2. Reuse or adapt Mole Windows branch logic where practical.
3. Keep destructive actions safe and explainable.
4. Support both general cleanup and developer-specific cleanup.
5. Package as a polished Windows installer.

### Success Criteria
- user can scan system safely
- user sees reclaimable storage by category
- user can preview before deletion
- user can clean selected categories
- user can purge development artifacts from chosen folders
- user can inspect disk usage visually
- app writes operation logs
- app protects critical directories by default

---

## 7. Non-Goals (MVP)

These are **not** part of initial MVP:

- full parity with all macOS Mole features
- kernel-level optimization or registry “magic” tuning
- antivirus behavior
- driver updates
- RAM booster gimmicks
- cross-platform macOS/Linux support in this product phase
- Microsoft Store release in v1

---

## 8. Reference Findings from the Repository

From the public repository:

- Mole is described as **“Deep clean and optimize your Mac.”** citeturn724776view0
- The README states that an **experimental Windows version is available in the `windows` branch**. citeturn724776view0
- The primary command model includes `clean`, `uninstall`, `optimize`, `analyze`, `status`, `purge`, `update`, and `remove`. citeturn724776view0turn724776view1
- The project explicitly recommends `--dry-run` for previewing destructive commands and describes **safety-first defaults** with path validation and protected-directory rules. citeturn724776view0

This means the Windows Electron product should not be designed as a brand-new unrelated utility. It should be a **GUI productization layer** on top of Mole-style Windows capabilities.

---

## 9. Proposed Product Architecture

## 9.1 High-Level Architecture

```text
Electron Renderer (UI)
    ↓ IPC
Electron Main Process
    ↓
Task Orchestrator (Node.js)
    ↓
PowerShell Command Layer
    ↓
System Operations / Optional Go Helpers
```

## 9.2 Layer Responsibilities

### A. Electron Renderer
Responsible for:
- dashboard UI
- category cards
- scan results
- action dialogs
- settings
- logs viewer
- risk warnings
- progress states

### B. Electron Main Process
Responsible for:
- secure IPC routing
- spawning PowerShell processes
- validating command arguments
- file/path permission checks
- handling logs and state persistence

### C. Task Orchestrator
Responsible for:
- converting UI actions into safe backend tasks
- dry-run first strategy
- cancellation handling
- parsing command output into structured JSON
- queueing and progress updates

### D. PowerShell Command Layer
Responsible for actual Windows operations:
- cleanup scans
- deletion jobs
- uninstall residue detection
- system temp analysis
- recycle bin cleanup
- build artifact purge
- browser cache cleanup
- package cache cleanup

### E. Optional Go Helpers
Used only where helpful for:
- high-performance disk analysis
- tree-size scanning
- terminal-based analysis engine reusable as background binary

---

## 10. Recommended Technical Stack

### Desktop App
- Electron
- TypeScript
- electron-builder
- electron-updater

### UI
- React + Vite
- Tailwind CSS or clean custom CSS
- Zustand or Redux Toolkit for app state

### Backend Execution
- Node.js child_process
- PowerShell 5.1+ and PowerShell 7 compatibility where possible

### Native/Utility Layer
- PowerShell scripts in `/backend/ps/`
- optional Go binaries in `/backend/bin/`

### Packaging
- NSIS via electron-builder

### Logging / Storage
- electron-log
- JSON config in AppData
- operation log file

---

## 11. Core Product Modules

## 11.1 Dashboard
Purpose: give the user a fast overview.

Widgets:
- reclaimable space summary
- quick health summary
- large folders snapshot
- recent cleanup history
- one-click scan button
- risk / protected items notice

## 11.2 Deep Clean
Purpose: scan common reclaimable storage.

Categories:
- Windows temp files
- user temp files
- browser cache
- app cache
- crash dumps
- recycle bin
- update leftovers
- package manager cache
- logs
- thumbnail cache

Features:
- scan only
- preview file counts and sizes
- select/deselect categories
- clean selected categories
- export results

## 11.3 App Leftovers / Uninstall Cleanup
Purpose: remove orphaned files after apps are removed.

Functions:
- detect common leftover directories
- detect startup leftovers
- detect config remnants in AppData
- identify broken uninstall traces
- allow manual confirmation before deletion

## 11.4 Optimize
Purpose: safe low-risk refresh operations.

Possible actions:
- clear icon cache safely
- clear thumbnail cache
- restart Explorer optionally
- flush DNS optionally
- clean temporary service-generated residue
- rebuild selected non-critical caches

Important note:
This module must avoid fake “speed boost” behavior. Only real, explainable actions are allowed.

## 11.5 Analyze
Purpose: visually inspect disk usage.

Features:
- folder tree scanning
- largest folders/files
- drive selection
- quick actions from results
- send deletions to Recycle Bin where possible

## 11.6 Status
Purpose: show system health dashboard.

Metrics:
- CPU
- memory
- disk usage
- disk free space
- network activity
- top storage consumers

## 11.7 Developer Purge
Purpose: clean build artifacts and dev leftovers.

Targets:
- `node_modules` caches where appropriate
- `dist`, `build`, `out`, `.turbo`, `.next`, `.cache`
- Python `__pycache__`, `.pytest_cache`, `.mypy_cache`, `.venv` optional detection only
- .NET `bin`, `obj`
- Java `target`
- Android/Gradle caches
- npm/yarn/pnpm caches

This is a key differentiator.

## 11.8 Logs & Audit
Purpose: trust and traceability.

Features:
- each operation logged
- before/after size estimate
- deleted targets summary
- skipped protected targets summary
- error details
- export log

## 11.9 Settings
Settings include:
- dry-run by default on first launch
- protected folders list
- custom scan folders
- developer folders list
- theme
- language later
- auto-update toggle
- send to recycle bin vs permanent delete where applicable

---

## 12. Safety Requirements

Safety is a first-class feature because the base project itself stresses destructive-operation caution, dry-run previews, and protected-directory rules. citeturn724776view0

### Mandatory Safety Rules
1. Critical directories can never be deleted directly.
2. First run must default to preview mode.
3. High-risk actions require typed confirmation.
4. System folders must be hard-blocked unless action is explicitly non-destructive.
5. App must show exactly what categories and paths will be affected.
6. Deletion should use Recycle Bin when feasible.
7. Permanent deletion requires an additional confirmation.
8. Operation log must always be written unless user disables it.
9. Scans must distinguish between:
   - safe
   - review needed
   - blocked
10. The app must fail closed, not fail open.

### Protected Paths Examples
- `C:\Windows`
- `C:\Program Files`
- `C:\Program Files (x86)`
- `C:\Users\<user>\Documents`
- root drive system files
- explicitly user-protected custom folders

---

## 13. UX Principles

### Design Direction
- modern Windows utility
- compact, dark-first but light-supported
- minimal, professional, not gamer-like
- confident but cautious tone
- category-based information hierarchy

### UX Rules
- always show what will happen before it happens
- highlight reclaimable size clearly
- make risky operations visually distinct
- avoid scary technical language for normal users
- keep advanced details expandable
- every destructive action should have a clear undo expectation note

---

## 14. Main User Flows

## 14.1 First Launch
1. user opens app
2. welcome screen explains safety model
3. app asks for scan locations and optional dev folders
4. user runs first scan in preview mode
5. results shown by category and risk level

## 14.2 Deep Clean Flow
1. click “Scan”
2. backend runs dry-run scan
3. results grouped into categories
4. user selects categories
5. app shows confirmation summary
6. cleanup runs
7. result summary and log shown

## 14.3 Developer Purge Flow
1. user chooses folders or saved workspace roots
2. app scans for build artifacts
3. preview shows found targets and size
4. user excludes desired folders
5. purge runs
6. results logged and summarized

## 14.4 Analyze Flow
1. user chooses drive/folder
2. analyzer scans contents
3. app shows top consumers
4. user can mark items for recycle bin
5. app asks for confirmation
6. operation completes and updates view

---

## 15. Functional Requirements

## 15.1 Scan Engine
- must support category-based scanning
- must return structured results as JSON
- must include path, size, file count, risk level, recommended action
- must support cancellation
- must support dry-run mode

## 15.2 Cleanup Engine
- must execute only approved categories
- must block protected paths
- must support recycle bin path where possible
- must return success/skip/error breakdown

## 15.3 UI Data Model
Each cleanup candidate should contain:

```json
{
  "id": "candidate_001",
  "category": "browser_cache",
  "label": "Chrome Cache",
  "path": "C:\\Users\\User\\AppData\\Local\\Google\\Chrome\\User Data\\Default\\Cache",
  "sizeBytes": 123456789,
  "riskLevel": "safe",
  "action": "delete",
  "defaultSelected": true,
  "requiresAdmin": false,
  "source": "scan"
}
```

## 15.4 IPC Contracts
All renderer-to-main requests must be structured and validated.

Examples:
- `scan:run`
- `clean:execute`
- `purge:scan`
- `purge:execute`
- `analyze:run`
- `status:get`
- `logs:list`
- `settings:update`

---

## 16. Suggested Folder Structure

```text
mole-windows-electron/
├─ app/
│  ├─ main/
│  │  ├─ ipc/
│  │  ├─ services/
│  │  ├─ security/
│  │  └─ index.ts
│  ├─ renderer/
│  │  ├─ src/
│  │  │  ├─ components/
│  │  │  ├─ pages/
│  │  │  ├─ stores/
│  │  │  ├─ hooks/
│  │  │  ├─ types/
│  │  │  └─ utils/
│  └─ preload/
│     └─ index.ts
├─ backend/
│  ├─ ps/
│  │  ├─ scan-clean.ps1
│  │  ├─ run-clean.ps1
│  │  ├─ scan-purge.ps1
│  │  ├─ run-purge.ps1
│  │  ├─ scan-uninstall-leftovers.ps1
│  │  ├─ optimize.ps1
│  │  └─ status.ps1
│  ├─ bin/
│  │  ├─ analyze.exe
│  │  └─ status.exe
│  └─ schemas/
├─ assets/
├─ build/
├─ scripts/
├─ docs/
├─ package.json
└─ electron-builder.yml
```

---

## 17. Packaging Requirements

### Installer
- NSIS installer
- per-user install by default
- desktop shortcut optional
- start menu shortcut optional
- add “Run after install” option

### Release Artifacts
- `.exe` installer
- portable version optional later

### Update Strategy
- GitHub Releases based update flow
- differential updates later

---

## 18. MVP Scope

### Included in MVP
- Electron shell
- dashboard
- deep clean scan + execute
- developer purge scan + execute
- basic analyze page
- basic system status page
- logs page
- settings page
- protected path rules
- installer build

### Deferred to V1.1+
- advanced app leftover database
- scheduled cleanup
- multi-language support
- richer charts
- plugin system
- recovery center / restore bin history
- Windows service integration

---

## 19. Development Phases

## Phase 1 — Core Foundation
- set up Electron + React + TypeScript
- preload + secure IPC
- PowerShell execution service
- basic shell layout
- settings persistence

## Phase 2 — Scan & Clean MVP
- implement scan-clean script
- parse structured JSON output
- show category cards
- add confirmations and action execution
- add operation logging

## Phase 3 — Developer Purge
- workspace selection
- artifact detection
- selective purge
- exclusion rules

## Phase 4 — Analyze & Status
- connect analyzer backend
- build folder usage UI
- build system status panel

## Phase 5 — Installer & Polish
- NSIS packaging
- app icon
- crash handling
- update flow
- final QA and path safety testing

---

## 20. Acceptance Criteria

The product is acceptable when:

1. it installs correctly on Windows 10/11
2. it can scan reclaimable files without deleting anything by default on first run
3. it presents grouped results with size totals
4. it can clean selected safe categories successfully
5. it can detect and purge dev artifacts in user-selected folders
6. it blocks protected system paths
7. it writes readable logs for every action
8. it packages successfully with Electron builder
9. it remains stable under failed permission scenarios
10. it clearly communicates what was skipped and why

---

## 21. Risks

### Technical Risks
- PowerShell execution policy differences
- admin permission variance
- Windows-specific cache paths differing by machine
- accidental cleanup of useful dev caches
- slow scans on very large disks

### Product Risks
- users expecting “one click magic”
- overlap with unsafe PC cleaner expectations
- false positives in leftover detection

### Mitigation
- strict preview-first model
- allow exclusions
- extensive protected-path rules
- transparent logs
- category-level opt-in behavior

---

## 22. Recommended Build Strategy for You

The best path for you is:

1. use Mole as conceptual and partial code base
2. inspect and reuse the Windows branch logic where useful
3. build the product shell in Electron
4. keep cleanup logic in PowerShell scripts
5. use optional Go helpers only for analysis/status if needed
6. package with NSIS via Electron Builder

This gives you the fastest route to a **real Windows desktop product** instead of only a CLI port.

---

## 23. Final Recommendation

Build **Mole for Windows as an Electron desktop app** with:

- **Electron + React + TypeScript** for UI
- **PowerShell** for Windows-native cleanup operations
- **optional Go helpers** for analyzer/status performance
- **NSIS packaging** for installable Windows release

This is the most practical, scalable, and implementation-friendly approach for your use case.

