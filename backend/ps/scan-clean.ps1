# Mole - System Scan Script
# Scans common reclaimable storage locations and returns JSON

$ErrorActionPreference = "SilentlyContinue"

function Get-FolderStats($path) {
    if (-not (Test-Path $path)) { return @{ sizeBytes = 0; fileCount = 0 } }
    $files = Get-ChildItem -Path $path -Recurse -File -Force -ErrorAction SilentlyContinue
    $size = ($files | Measure-Object -Property Length -Sum).Sum
    $count = ($files | Measure-Object).Count
    return @{ sizeBytes = [long]($size -as [long]); fileCount = $count }
}

$user = $env:USERPROFILE
$categories = @()

# Windows Temp
$stats = Get-FolderStats "$env:TEMP"
$categories += @{
    id = "windows_temp"
    label = "Windows Temp Files"
    path = $env:TEMP
    sizeBytes = $stats.sizeBytes
    fileCount = $stats.fileCount
    riskLevel = "safe"
}

# User Temp
$userTemp = "$user\AppData\Local\Temp"
if ($userTemp -ne $env:TEMP) {
    $stats = Get-FolderStats $userTemp
    $categories += @{
        id = "user_temp"
        label = "User Temp Files"
        path = $userTemp
        sizeBytes = $stats.sizeBytes
        fileCount = $stats.fileCount
        riskLevel = "safe"
    }
}

# Chrome Cache
$chromePath = "$user\AppData\Local\Google\Chrome\User Data\Default\Cache"
$stats = Get-FolderStats $chromePath
if ($stats.fileCount -gt 0) {
    $categories += @{
        id = "chrome_cache"
        label = "Chrome Cache"
        path = $chromePath
        sizeBytes = $stats.sizeBytes
        fileCount = $stats.fileCount
        riskLevel = "safe"
    }
}

# Edge Cache
$edgePath = "$user\AppData\Local\Microsoft\Edge\User Data\Default\Cache"
$stats = Get-FolderStats $edgePath
if ($stats.fileCount -gt 0) {
    $categories += @{
        id = "edge_cache"
        label = "Edge Cache"
        path = $edgePath
        sizeBytes = $stats.sizeBytes
        fileCount = $stats.fileCount
        riskLevel = "safe"
    }
}

# Crash Dumps
$dumpPath = "$user\AppData\Local\CrashDumps"
$stats = Get-FolderStats $dumpPath
if ($stats.fileCount -gt 0) {
    $categories += @{
        id = "crash_dumps"
        label = "Crash Dumps"
        path = $dumpPath
        sizeBytes = $stats.sizeBytes
        fileCount = $stats.fileCount
        riskLevel = "safe"
    }
}

# Windows Update Cleanup
$wuPath = "C:\Windows\SoftwareDistribution\Download"
$stats = Get-FolderStats $wuPath
if ($stats.fileCount -gt 0) {
    $categories += @{
        id = "windows_update"
        label = "Windows Update Cache"
        path = $wuPath
        sizeBytes = $stats.sizeBytes
        fileCount = $stats.fileCount
        riskLevel = "review"
    }
}

# Thumbnail Cache
$thumbPath = "$user\AppData\Local\Microsoft\Windows\Explorer"
$thumbFiles = Get-ChildItem -Path $thumbPath -Filter "thumbcache_*" -File -Force -ErrorAction SilentlyContinue
$thumbSize = ($thumbFiles | Measure-Object -Property Length -Sum).Sum
$thumbCount = ($thumbFiles | Measure-Object).Count
if ($thumbCount -gt 0) {
    $categories += @{
        id = "thumbnail_cache"
        label = "Thumbnail Cache"
        path = $thumbPath
        sizeBytes = [long]($thumbSize -as [long])
        fileCount = $thumbCount
        riskLevel = "safe"
    }
}

# Recycle Bin
try {
    $shell = New-Object -ComObject Shell.Application
    $rb = $shell.NameSpace(0x0a)
    $rbItems = $rb.Items()
    $rbSize = 0
    $rbCount = $rbItems.Count
    foreach ($item in $rbItems) {
        $rbSize += $item.Size
    }
    if ($rbCount -gt 0) {
        $categories += @{
            id = "recycle_bin"
            label = "Recycle Bin"
            path = "RecycleBin"
            sizeBytes = [long]$rbSize
            fileCount = $rbCount
            riskLevel = "safe"
        }
    }
} catch {}

# npm cache
$npmCache = "$user\AppData\Local\npm-cache"
$stats = Get-FolderStats $npmCache
if ($stats.fileCount -gt 0) {
    $categories += @{
        id = "npm_cache"
        label = "npm Cache"
        path = $npmCache
        sizeBytes = $stats.sizeBytes
        fileCount = $stats.fileCount
        riskLevel = "safe"
    }
}

# pip cache
$pipCache = "$user\AppData\Local\pip\cache"
$stats = Get-FolderStats $pipCache
if ($stats.fileCount -gt 0) {
    $categories += @{
        id = "pip_cache"
        label = "pip Cache"
        path = $pipCache
        sizeBytes = $stats.sizeBytes
        fileCount = $stats.fileCount
        riskLevel = "safe"
    }
}

# Calculate totals
$totalSize = ($categories | ForEach-Object { $_.sizeBytes } | Measure-Object -Sum).Sum
$totalItems = ($categories | ForEach-Object { $_.fileCount } | Measure-Object -Sum).Sum

$result = @{
    totalSize = [long]$totalSize
    totalItems = $totalItems
    protectedCount = 0
    categories = $categories
}

$result | ConvertTo-Json -Depth 5
