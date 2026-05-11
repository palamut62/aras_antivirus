param(
    [string]$Action = "scan",
    [string[]]$Roots = @(),
    [int]$MinAgeDays = 30,
    [string[]]$Targets = @()
)
$ErrorActionPreference = "SilentlyContinue"

function Get-DirSize($path) {
    try {
        $sum = 0
        Get-ChildItem -LiteralPath $path -Recurse -Force -ErrorAction SilentlyContinue |
            Where-Object { -not $_.PSIsContainer } |
            ForEach-Object { $sum += $_.Length }
        return $sum
    } catch { return 0 }
}

switch ($Action) {
    "scan" {
        if ($Roots.Count -eq 0) {
            $Roots = @("$env:USERPROFILE\Projects", "$env:USERPROFILE\Documents\Projects", "$env:USERPROFILE\source\repos", "$env:USERPROFILE\dev", "$env:USERPROFILE\code")
            $Roots = $Roots | Where-Object { Test-Path $_ }
        }
        $found = @()
        $now = Get-Date
        foreach ($root in $Roots) {
            if (-not (Test-Path $root)) { continue }
            try {
                $dirs = Get-ChildItem -LiteralPath $root -Directory -Recurse -Force -ErrorAction SilentlyContinue -Filter "node_modules"
                foreach ($d in $dirs) {
                    # skip nested node_modules inside another node_modules
                    if ($d.FullName -match '\\node_modules\\.*\\node_modules$') { continue }
                    $lastWrite = $d.LastWriteTime
                    $ageDays = [int]($now - $lastWrite).TotalDays
                    if ($ageDays -lt $MinAgeDays) { continue }
                    $size = Get-DirSize $d.FullName
                    $project = Split-Path $d.FullName -Parent
                    $found += @{
                        path = $d.FullName
                        project = $project
                        sizeBytes = $size
                        ageDays = $ageDays
                        lastWrite = $lastWrite.ToString('yyyy-MM-dd')
                    }
                }
            } catch {}
        }
        $found = $found | Sort-Object -Property sizeBytes -Descending
        @{ success = $true; data = @{ items = @($found); count = $found.Count; totalSize = (($found | Measure-Object -Property sizeBytes -Sum).Sum) } } | ConvertTo-Json -Depth 6 -Compress
    }
    "delete" {
        if ($Targets.Count -eq 0) {
            @{ success = $false; error = "No targets" } | ConvertTo-Json -Compress
            return
        }
        $deleted = @(); $failed = @(); $totalSize = 0
        foreach ($t in $Targets) {
            if (-not (Test-Path $t)) { continue }
            $size = Get-DirSize $t
            try {
                Remove-Item -LiteralPath $t -Recurse -Force -ErrorAction Stop
                $deleted += @{ path = $t; sizeBytes = $size }
                $totalSize += $size
            } catch {
                $failed += @{ path = $t; error = $_.Exception.Message }
            }
        }
        @{ success = $true; data = @{ deleted = @($deleted); failed = @($failed); sizeFreed = $totalSize } } | ConvertTo-Json -Depth 5 -Compress
    }
    default { @{ success = $false; error = "Unknown action" } | ConvertTo-Json -Compress }
}
