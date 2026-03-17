param(
    [string]$Action = "list",
    [string]$AppId = ""
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
            if ($_.EstimatedSize) { $size = [int64]$_.EstimatedSize * 1024 }

            # Determine type
            $type = "app"
            $dn = $_.DisplayName.ToLower()
            if ($dn -match "driver|runtime|redistribut|\.net|visual c\+\+|update for") { $type = "system" }
            elseif ($dn -match "sdk|tools|build|kit|framework") { $type = "dev" }

            $apps += @{
                id = ($_.PSChildName -replace '[{}]','')
                name = [string]$_.DisplayName
                publisher = if ($_.Publisher) { [string]$_.Publisher } else { "" }
                version = if ($_.DisplayVersion) { [string]$_.DisplayVersion } else { "" }
                installDate = if ($_.InstallDate) { [string]$_.InstallDate } else { "" }
                installLocation = if ($_.InstallLocation) { [string]$_.InstallLocation } else { "" }
                uninstallString = if ($_.UninstallString) { [string]$_.UninstallString } else { "" }
                quietUninstallString = if ($_.QuietUninstallString) { [string]$_.QuietUninstallString } else { "" }
                sizeBytes = [long]$size
                isSystemComponent = if ($_.SystemComponent -eq 1) { $true } else { $false }
                type = $type
            }
        }
    }
    # Deduplicate by name
    $seen = @{}
    $unique = @()
    foreach ($a in $apps) {
        $key = $a.name.ToLower().Trim()
        if (-not $seen.ContainsKey($key)) {
            $seen[$key] = $true
            $unique += $a
        }
    }
    return $unique | Sort-Object { $_.name }
}

function Find-AppLeftovers {
    param([string]$AppName)
    $leftovers = @()
    # Extract key words from app name (at least 4 chars each)
    $words = ($AppName -split '\s+') | Where-Object { $_.Length -ge 4 } | ForEach-Object { $_ -replace '[^a-zA-Z0-9]', '' }
    if ($words.Count -eq 0) { $words = @($AppName -replace '[^a-zA-Z0-9]', '') }

    $searchPaths = @(
        "$env:APPDATA",
        "$env:LOCALAPPDATA",
        "$env:PROGRAMDATA",
        "$env:USERPROFILE\AppData\LocalLow"
    )
    foreach ($base in $searchPaths) {
        if (-not (Test-Path $base)) { continue }
        Get-ChildItem -Path $base -Directory -ErrorAction SilentlyContinue | ForEach-Object {
            $dirName = $_.Name.ToLower()
            $match = $false
            foreach ($w in $words) {
                if ($dirName -like "*$($w.ToLower())*") { $match = $true; break }
            }
            if ($match) {
                $dirSize = (Get-ChildItem $_.FullName -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
                $leftovers += @{
                    path = [string]$_.FullName
                    type = "folder"
                    sizeBytes = if ($dirSize) { [long]$dirSize } else { [long]0 }
                    location = [string]$base
                }
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

    # Try quiet uninstall string first
    $uninstStr = $app.quietUninstallString
    if (-not $uninstStr) { $uninstStr = $app.uninstallString }
    if (-not $uninstStr) {
        return @{ success = $false; error = "No uninstall command for: $($app.name)" }
    }

    try {
        if ($uninstStr -match "msiexec") {
            $productCode = ""
            if ($uninstStr -match '\{[0-9A-Fa-f\-]+\}') {
                $productCode = $Matches[0]
            }
            if ($productCode) {
                $p = Start-Process "msiexec.exe" -ArgumentList "/x $productCode /qn /norestart" -Wait -NoNewWindow -PassThru
            } else {
                $clean = $uninstStr -replace '"', ''
                $p = Start-Process "cmd.exe" -ArgumentList "/c `"$clean`" /qn /norestart" -Wait -NoNewWindow -PassThru
            }
        } else {
            # Parse executable and args
            if ($uninstStr.StartsWith('"')) {
                $endQuote = $uninstStr.IndexOf('"', 1)
                if ($endQuote -gt 0) {
                    $exe = $uninstStr.Substring(1, $endQuote - 1)
                    $existingArgs = $uninstStr.Substring($endQuote + 1).Trim()
                } else {
                    $exe = $uninstStr -replace '"', ''
                    $existingArgs = ""
                }
            } else {
                $parts = $uninstStr -split ' ', 2
                $exe = $parts[0]
                $existingArgs = if ($parts.Count -gt 1) { $parts[1] } else { "" }
            }

            # Add silent flags
            $silentArgs = "$existingArgs /S /silent /quiet /VERYSILENT /NORESTART"
            $silentArgs = $silentArgs.Trim()

            if (Test-Path $exe) {
                $p = Start-Process $exe -ArgumentList $silentArgs -Wait -NoNewWindow -PassThru
            } else {
                # Fallback: run the whole string via cmd
                $p = Start-Process "cmd.exe" -ArgumentList "/c `"$uninstStr`" /S /silent /quiet" -Wait -NoNewWindow -PassThru
            }
        }

        # Find leftovers after uninstall
        $leftoversAfter = Find-AppLeftovers -AppName $app.name

        return @{
            success = $true
            appName = [string]$app.name
            leftovers = $leftoversAfter
            leftoverCount = $leftoversAfter.Count
            leftoverSize = ($leftoversAfter | Measure-Object -Property sizeBytes -Sum).Sum
        }
    } catch {
        return @{ success = $false; error = [string]$_.Exception.Message }
    }
}

function Clean-Leftovers {
    param([string]$AppName)
    $leftovers = Find-AppLeftovers -AppName $AppName
    $cleaned = 0
    $cleanedSize = [long]0
    foreach ($item in $leftovers) {
        if ($item.type -eq "folder" -and (Test-Path $item.path)) {
            try {
                $cleanedSize += [long]$item.sizeBytes
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
        $userApps = @($apps | Where-Object { -not $_.isSystemComponent })
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
            @{ success = $false; error = "AppId required" } | ConvertTo-Json -Depth 3
            return
        }
        $apps = Get-InstalledApps
        $app = $apps | Where-Object { $_.id -eq $AppId }
        $appName = if ($app) { [string]$app.name } else { $AppId }
        $leftovers = @(Find-AppLeftovers -AppName $appName)
        @{
            success = $true
            data = @{
                appName = [string]$appName
                leftovers = $leftovers
                totalSize = ($leftovers | Measure-Object -Property sizeBytes -Sum).Sum
            }
        } | ConvertTo-Json -Depth 5
    }
    "uninstall" {
        if (-not $AppId) {
            @{ success = $false; error = "AppId required" } | ConvertTo-Json -Depth 3
            return
        }
        $result = Uninstall-App -Id $AppId
        @{
            success = $result.success
            data = $result
            error = $result.error
        } | ConvertTo-Json -Depth 5
    }
    "clean-leftovers" {
        if (-not $AppId) {
            @{ success = $false; error = "AppId (app name) required" } | ConvertTo-Json -Depth 3
            return
        }
        $result = Clean-Leftovers -AppName $AppId
        @{
            success = $result.success
            data = $result
        } | ConvertTo-Json -Depth 5
    }
}
