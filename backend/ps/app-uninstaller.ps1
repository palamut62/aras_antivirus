param(
    [string]$Action = "list",
    [string]$AppId = "",
    [switch]$IncludeLeftovers
)

$ErrorActionPreference = "SilentlyContinue"

function Get-InstalledApps {
    $apps = @()
    $regPaths = @(
        "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*",
        "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*",
        "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*"
    )
    foreach ($path in $regPaths) {
        Get-ItemProperty $path 2>$null | Where-Object { $_.DisplayName -and $_.DisplayName.Trim() -ne "" } | ForEach-Object {
            $size = 0
            if ($_.EstimatedSize) { $size = [int]$_.EstimatedSize * 1024 }
            $apps += @{
                id = ($_.PSChildName -replace '[{}]','')
                name = $_.DisplayName
                publisher = if ($_.Publisher) { $_.Publisher } else { "" }
                version = if ($_.DisplayVersion) { $_.DisplayVersion } else { "" }
                installDate = if ($_.InstallDate) { $_.InstallDate } else { "" }
                installLocation = if ($_.InstallLocation) { $_.InstallLocation } else { "" }
                uninstallString = if ($_.UninstallString) { $_.UninstallString } else { "" }
                sizeBytes = $size
                isSystemComponent = if ($_.SystemComponent -eq 1) { $true } else { $false }
            }
        }
    }
    return $apps | Sort-Object { $_.name }
}

function Find-AppLeftovers {
    param([string]$AppName)
    $leftovers = @()
    $cleanName = $AppName -replace '[^a-zA-Z0-9]', '*'
    $searchPaths = @(
        "$env:APPDATA",
        "$env:LOCALAPPDATA",
        "$env:PROGRAMDATA",
        "$env:LOCALAPPDATA\Temp",
        "$env:USERPROFILE\AppData\LocalLow"
    )
    foreach ($base in $searchPaths) {
        if (-not (Test-Path $base)) { continue }
        Get-ChildItem -Path $base -Directory -ErrorAction SilentlyContinue | Where-Object {
            $_.Name -like "*$cleanName*" -or $_.Name -like "*$AppName*"
        } | ForEach-Object {
            $dirSize = (Get-ChildItem $_.FullName -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
            $leftovers += @{
                path = $_.FullName
                type = "folder"
                sizeBytes = if ($dirSize) { [long]$dirSize } else { 0 }
                location = $base
            }
        }
    }
    # Registry leftovers
    $regSearchPaths = @(
        "HKCU:\SOFTWARE",
        "HKLM:\SOFTWARE"
    )
    foreach ($rp in $regSearchPaths) {
        Get-ChildItem -Path $rp -ErrorAction SilentlyContinue | Where-Object {
            $_.PSChildName -like "*$AppName*"
        } | ForEach-Object {
            $leftovers += @{
                path = $_.Name
                type = "registry"
                sizeBytes = 0
                location = $rp
            }
        }
    }
    return $leftovers
}

function Uninstall-App {
    param([string]$Id)
    $apps = Get-InstalledApps
    $app = $apps | Where-Object { $_.id -eq $Id }
    if (-not $app) {
        return @{ success = $false; error = "App not found: $Id" }
    }
    $uninstStr = $app.uninstallString
    if (-not $uninstStr) {
        return @{ success = $false; error = "No uninstall command for: $($app.name)" }
    }
    # Find leftovers before uninstall
    $leftoversBefore = Find-AppLeftovers -AppName $app.name
    try {
        if ($uninstStr -match "msiexec") {
            $productCode = ""
            if ($uninstStr -match '\{[0-9A-Fa-f\-]+\}') {
                $productCode = $Matches[0]
            }
            if ($productCode) {
                Start-Process "msiexec.exe" -ArgumentList "/x $productCode /qn /norestart" -Wait -NoNewWindow
            } else {
                Start-Process "cmd.exe" -ArgumentList "/c $uninstStr /qn /norestart" -Wait -NoNewWindow
            }
        } else {
            $parts = $uninstStr -split ' ', 2
            $exe = $parts[0] -replace '"', ''
            $args = if ($parts.Count -gt 1) { "$($parts[1]) /S /silent /quiet" } else { "/S /silent /quiet" }
            Start-Process $exe -ArgumentList $args -Wait -NoNewWindow
        }
        return @{
            success = $true
            appName = $app.name
            leftovers = $leftoversBefore
            leftoverCount = $leftoversBefore.Count
            leftoverSize = ($leftoversBefore | Measure-Object -Property sizeBytes -Sum).Sum
        }
    } catch {
        return @{ success = $false; error = $_.Exception.Message }
    }
}

function Clean-Leftovers {
    param([string]$AppName)
    $leftovers = Find-AppLeftovers -AppName $AppName
    $cleaned = 0
    $cleanedSize = 0
    foreach ($item in $leftovers) {
        if ($item.type -eq "folder") {
            try {
                $cleanedSize += $item.sizeBytes
                Remove-Item -Path $item.path -Recurse -Force -ErrorAction Stop
                $cleaned++
            } catch {}
        }
    }
    return @{
        success = $true
        cleaned = $cleaned
        cleanedSize = $cleanedSize
        total = $leftovers.Count
    }
}

# Main
switch ($Action) {
    "list" {
        $apps = Get-InstalledApps
        $userApps = $apps | Where-Object { -not $_.isSystemComponent }
        @{
            success = $true
            data = @{
                apps = $userApps
                totalCount = $userApps.Count
                totalSize = ($userApps | Measure-Object -Property sizeBytes -Sum).Sum
            }
        } | ConvertTo-Json -Depth 5
    }
    "leftovers" {
        if (-not $AppId) {
            @{ success = $false; error = "AppId required" } | ConvertTo-Json
            return
        }
        $apps = Get-InstalledApps
        $app = $apps | Where-Object { $_.id -eq $AppId }
        $appName = if ($app) { $app.name } else { $AppId }
        $leftovers = Find-AppLeftovers -AppName $appName
        @{
            success = $true
            data = @{
                appName = $appName
                leftovers = $leftovers
                totalSize = ($leftovers | Measure-Object -Property sizeBytes -Sum).Sum
            }
        } | ConvertTo-Json -Depth 5
    }
    "uninstall" {
        if (-not $AppId) {
            @{ success = $false; error = "AppId required" } | ConvertTo-Json
            return
        }
        $result = Uninstall-App -Id $AppId
        $result | ConvertTo-Json -Depth 5
    }
    "clean-leftovers" {
        if (-not $AppId) {
            @{ success = $false; error = "AppId (app name) required" } | ConvertTo-Json
            return
        }
        $result = Clean-Leftovers -AppName $AppId
        $result | ConvertTo-Json -Depth 5
    }
}
