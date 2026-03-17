param(
    [string]$Action = "scan",
    [string]$Targets = ""
)

$ErrorActionPreference = "SilentlyContinue"

function Scan-Installers {
    $results = @()
    $extensions = @("*.exe", "*.msi", "*.msix", "*.msixbundle", "*.appx", "*.appxbundle")
    $scanPaths = @(
        @{ path = "$env:USERPROFILE\Downloads"; label = "Downloads" },
        @{ path = "$env:USERPROFILE\Desktop"; label = "Desktop" },
        @{ path = "$env:TEMP"; label = "Temp" }
    )

    # Scoop cache
    $scoopCache = "$env:USERPROFILE\scoop\cache"
    if (Test-Path $scoopCache) {
        $scanPaths += @{ path = $scoopCache; label = "Scoop Cache" }
    }

    foreach ($sp in $scanPaths) {
        if (-not (Test-Path $sp.path)) { continue }
        foreach ($ext in $extensions) {
            Get-ChildItem -Path $sp.path -Filter $ext -File -ErrorAction SilentlyContinue | ForEach-Object {
                $ageInDays = [math]::Floor(((Get-Date) - $_.LastWriteTime).TotalDays)
                $results += @{
                    path = [string]$_.FullName
                    name = [string]$_.Name
                    sizeBytes = [long]$_.Length
                    lastModified = $_.LastWriteTime.ToString("yyyy-MM-dd HH:mm")
                    ageDays = [int]$ageInDays
                    location = [string]$sp.label
                    extension = [string]$_.Extension.ToLower()
                    isOld = ($ageInDays -gt 30)
                }
            }
        }
    }

    $results = @($results | Sort-Object { $_.sizeBytes } -Descending)
    return $results
}

function Clean-Installers {
    param([string[]]$FilePaths)
    $cleaned = 0
    $cleanedSize = [long]0
    $errors = @()

    foreach ($fp in $FilePaths) {
        if (Test-Path $fp) {
            try {
                $size = [long](Get-Item $fp).Length
                Remove-Item $fp -Force -ErrorAction Stop
                $cleaned++
                $cleanedSize += $size
            } catch {
                $errors += @{ path = [string]$fp; error = [string]$_.Exception.Message }
            }
        }
    }

    return @{
        cleaned = $cleaned
        cleanedSize = $cleanedSize
        errors = $errors
    }
}

# Main
switch ($Action) {
    "scan" {
        $installers = @(Scan-Installers)
        $totalSize = ($installers | Measure-Object -Property sizeBytes -Sum).Sum
        $oldCount = ($installers | Where-Object { $_.isOld }).Count
        @{
            success = $true
            data = @{
                installers = $installers
                totalCount = $installers.Count
                totalSize = if ($totalSize) { [long]$totalSize } else { [long]0 }
                oldCount = $oldCount
            }
        } | ConvertTo-Json -Depth 5
    }
    "clean" {
        if (-not $Targets -or $Targets.Trim() -eq "") {
            @{ success = $false; error = "No targets specified" } | ConvertTo-Json -Depth 3
            return
        }
        # Split pipe-separated paths
        $fileList = @($Targets -split '\|' | Where-Object { $_.Trim() -ne "" })
        $result = Clean-Installers -FilePaths $fileList
        @{
            success = $true
            data = $result
        } | ConvertTo-Json -Depth 5
    }
}
