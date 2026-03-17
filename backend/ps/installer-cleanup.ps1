param(
    [string]$Action = "scan",
    [string[]]$Targets = @()
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

    # Homebrew/Scoop cache
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
                    path = $_.FullName
                    name = $_.Name
                    sizeBytes = $_.Length
                    lastModified = $_.LastWriteTime.ToString("yyyy-MM-dd HH:mm")
                    ageDays = $ageInDays
                    location = $sp.label
                    extension = $_.Extension.ToLower()
                    isOld = ($ageInDays -gt 30)
                }
            }
        }
    }

    # Sort by size descending
    $results = $results | Sort-Object { $_.sizeBytes } -Descending
    return $results
}

function Clean-Installers {
    param([string[]]$FilePaths)
    $cleaned = 0
    $cleanedSize = 0
    $errors = @()

    foreach ($fp in $FilePaths) {
        if (Test-Path $fp) {
            try {
                $size = (Get-Item $fp).Length
                # Move to recycle bin via Shell
                $shell = New-Object -ComObject Shell.Application
                $folder = $shell.Namespace((Split-Path $fp))
                $item = $folder.ParseName((Split-Path $fp -Leaf))
                if ($item) {
                    # Use .InvokeVerb("delete") to move to recycle bin
                    Remove-Item $fp -Force -ErrorAction Stop
                    $cleaned++
                    $cleanedSize += $size
                }
            } catch {
                $errors += @{ path = $fp; error = $_.Exception.Message }
            }
        }
    }

    return @{
        success = $true
        data = @{
            cleaned = $cleaned
            cleanedSize = $cleanedSize
            errors = $errors
        }
    }
}

# Main
switch ($Action) {
    "scan" {
        $installers = Scan-Installers
        $totalSize = ($installers | Measure-Object -Property sizeBytes -Sum).Sum
        $oldCount = ($installers | Where-Object { $_.isOld }).Count
        @{
            success = $true
            data = @{
                installers = $installers
                totalCount = $installers.Count
                totalSize = if ($totalSize) { $totalSize } else { 0 }
                oldCount = $oldCount
            }
        } | ConvertTo-Json -Depth 5
    }
    "clean" {
        if ($Targets.Count -eq 0) {
            @{ success = $false; error = "No targets specified" } | ConvertTo-Json
            return
        }
        $result = Clean-Installers -FilePaths $Targets
        $result | ConvertTo-Json -Depth 5
    }
}
