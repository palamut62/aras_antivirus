# Auto-Updater Setup

The Tauri auto-updater is **active** and pointed at:

```
https://github.com/palamut62/aras_antivirus/releases/latest/download/latest.json
```

## How it works

- On launch (30s after window appears) and every 6 hours, the app fetches `latest.json` from GitHub Releases.
- If the version is newer than the bundled one and signature verifies against `pubkey`, a banner appears bottom-right with **Yükle ve Yeniden Başla**.
- The user can dismiss; that version is remembered in `localStorage` so the banner doesn't reappear until the next version.

## Files in this repo

| File | Purpose |
|---|---|
| `src-tauri/aras-updater.key` | **Private key** — keep secret, never commit (already in `.gitignore`) |
| `src-tauri/aras-updater.key.pub` | Public key — committed; matches the `pubkey` field in `tauri.conf.json` |
| `src-tauri/tauri.conf.json` | Contains `plugins.updater.endpoints` + `pubkey` |
| `.github/workflows/release.yml` | CI that builds, signs, and publishes a release on every `v*` tag |

## Release process

### One-time setup (GitHub repo settings)

Add two repository secrets at **Settings → Secrets and variables → Actions**:

1. `TAURI_SIGNING_PRIVATE_KEY` — full contents of `src-tauri/aras-updater.key`
2. `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` — empty string if you generated the key with no password

### Cutting a release

```bash
# 1. Bump version in BOTH places (must match)
#    - package.json → "version"
#    - src-tauri/tauri.conf.json → "version"
#    - src-tauri/Cargo.toml → version (optional but cleaner)

# 2. Commit and tag
git add . && git commit -m "release: 1.6.1"
git tag v1.6.1
git push origin main --tags
```

The CI workflow then:
1. Builds the Windows NSIS installer
2. Signs it with `TAURI_SIGNING_PRIVATE_KEY`
3. Generates `latest.json` with the signature + download URL
4. Publishes a GitHub Release with the `.exe`, `.exe.sig`, and `latest.json`

Within ~6 hours every running installation will detect the new version and prompt the user.

## Security notes

- **Never commit the private key** — losing it means you cannot push updates (users would have to manually reinstall with a new pubkey).
- Keep an offline backup of `aras-updater.key`.
- If the key leaks, you must rotate (`tauri signer generate` → new pubkey in `tauri.conf.json` → release a "bridge" version users install manually → afterwards updates resume).

## Testing locally (without publishing)

```bash
# Generate a fake latest.json pointing at a local server, run the app, watch console.
# Or temporarily change endpoints in tauri.conf.json to a local URL.
```
