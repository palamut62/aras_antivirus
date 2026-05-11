param(
    [string]$ShortcutName = "Aras Antivirus.lnk"
)

$ErrorActionPreference = "Stop"

$desktop = [Environment]::GetFolderPath("Desktop")
$shortcutPath = Join-Path $desktop $ShortcutName
$iconPath = Join-Path $PSScriptRoot "..\assets\icon.ico"
$iconPath = (Resolve-Path $iconPath).Path

if (-not (Test-Path $shortcutPath)) {
    Write-Output "Shortcut not found: $shortcutPath"
    exit 0
}

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.IconLocation = "$iconPath,0"
$shortcut.Save()

Write-Output "Shortcut icon updated: $shortcutPath"
