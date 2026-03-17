# Mole - System Scan Script
# Scans common reclaimable storage locations and returns JSON with importance info

$ErrorActionPreference = "SilentlyContinue"

function Get-FolderStats($path) {
    if (-not (Test-Path $path)) { return @{ sizeBytes = [long]0; fileCount = 0 } }
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
    importance = "low"
    description = "Temporary files created by Windows and apps. Safe to delete, frees space immediately."
    descriptionTr = "Windows ve uygulamalar tarafindan olusturulan gecici dosyalar. Silinmesi guvenlidir."
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
        importance = "low"
        description = "User-specific temporary files. Safe to delete."
        descriptionTr = "Kullaniciya ozel gecici dosyalar. Silinmesi guvenlidir."
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
        importance = "low"
        description = "Chrome browser cache. Websites will reload slightly slower after cleaning."
        descriptionTr = "Chrome onbellegi. Temizlendikten sonra siteler biraz yavas yuklenir."
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
        importance = "low"
        description = "Edge browser cache. Same as Chrome - safe to delete."
        descriptionTr = "Edge onbellegi. Chrome gibi - silinmesi guvenlidir."
    }
}

# Firefox Cache
$ffPath = "$user\AppData\Local\Mozilla\Firefox\Profiles"
if (Test-Path $ffPath) {
    $ffCacheSize = [long]0
    $ffCacheCount = 0
    Get-ChildItem $ffPath -Directory | ForEach-Object {
        $cache2 = Join-Path $_.FullName "cache2"
        if (Test-Path $cache2) {
            $s = Get-FolderStats $cache2
            $ffCacheSize += $s.sizeBytes
            $ffCacheCount += $s.fileCount
        }
    }
    if ($ffCacheCount -gt 0) {
        $categories += @{
            id = "firefox_cache"
            label = "Firefox Cache"
            path = $ffPath
            sizeBytes = $ffCacheSize
            fileCount = $ffCacheCount
            riskLevel = "safe"
            importance = "low"
            description = "Firefox browser cache files."
            descriptionTr = "Firefox tarayici onbellegi."
        }
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
        importance = "low"
        description = "Application crash reports. Only useful for debugging."
        descriptionTr = "Uygulama cokme raporlari. Sadece hata ayiklama icin faydali."
    }
}

# Windows Error Reports
$werPath = "$user\AppData\Local\Microsoft\Windows\WER"
$stats = Get-FolderStats $werPath
if ($stats.fileCount -gt 0) {
    $categories += @{
        id = "error_reports"
        label = "Windows Error Reports"
        path = $werPath
        sizeBytes = $stats.sizeBytes
        fileCount = $stats.fileCount
        riskLevel = "safe"
        importance = "low"
        description = "Windows error reports sent to Microsoft. Safe to delete."
        descriptionTr = "Microsoft'a gonderilen hata raporlari. Silinmesi guvenlidir."
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
        importance = "medium"
        description = "Old Windows Update files. Review if you have pending updates."
        descriptionTr = "Eski Windows Update dosyalari. Bekleyen guncelleme varsa dikkat edin."
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
        importance = "low"
        description = "File Explorer thumbnail cache. Thumbnails will regenerate automatically."
        descriptionTr = "Dosya Gezgini kucuk resim onbellegi. Otomatik yeniden olusturulur."
    }
}

# Windows Prefetch
$prefetchPath = "C:\Windows\Prefetch"
$stats = Get-FolderStats $prefetchPath
if ($stats.fileCount -gt 0) {
    $categories += @{
        id = "prefetch"
        label = "Windows Prefetch"
        path = $prefetchPath
        sizeBytes = $stats.sizeBytes
        fileCount = $stats.fileCount
        riskLevel = "review"
        importance = "medium"
        description = "App launch optimization cache. Cleaning may slow first app launches temporarily."
        descriptionTr = "Uygulama baslatma optimizasyon onbellegi. Temizlenirse ilk acilislar yavaslar."
    }
}

# Recycle Bin
try {
    $shell = New-Object -ComObject Shell.Application
    $rb = $shell.NameSpace(0x0a)
    $rbItems = $rb.Items()
    $rbSize = [long]0
    $rbCount = $rbItems.Count
    foreach ($item in $rbItems) {
        $rbSize += $item.Size
    }
    if ($rbCount -gt 0) {
        $categories += @{
            id = "recycle_bin"
            label = "Recycle Bin"
            path = "RecycleBin"
            sizeBytes = $rbSize
            fileCount = $rbCount
            riskLevel = "review"
            importance = "medium"
            description = "Deleted files in Recycle Bin. Check before emptying - files cannot be recovered!"
            descriptionTr = "Geri Donusum Kutusundaki dosyalar. Bosaltmadan once kontrol edin - geri alinamaz!"
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
        importance = "low"
        description = "npm package manager cache. Will be rebuilt when needed."
        descriptionTr = "npm paket yoneticisi onbellegi. Gerektiginde yeniden olusturulur."
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
        importance = "low"
        description = "Python pip package cache. Will be rebuilt on next install."
        descriptionTr = "Python pip paket onbellegi. Sonraki kurulumda yeniden olusturulur."
    }
}

# Windows Log Files
$logPaths = @("C:\Windows\Logs", "C:\Windows\debug")
$logSize = [long]0
$logCount = 0
foreach ($lp in $logPaths) {
    $s = Get-FolderStats $lp
    $logSize += $s.sizeBytes
    $logCount += $s.fileCount
}
if ($logCount -gt 0) {
    $categories += @{
        id = "windows_logs"
        label = "Windows Log Files"
        path = "C:\Windows\Logs"
        sizeBytes = $logSize
        fileCount = $logCount
        riskLevel = "review"
        importance = "medium"
        description = "System log files. May be needed for troubleshooting. Review before deleting."
        descriptionTr = "Sistem log dosyalari. Sorun giderme icin gerekebilir. Silmeden once inceleyin."
    }
}

# Delivery Optimization
$doPath = "$user\AppData\Local\Microsoft\Windows\DeliveryOptimization"
$stats = Get-FolderStats $doPath
if ($stats.fileCount -gt 0) {
    $categories += @{
        id = "delivery_opt"
        label = "Delivery Optimization Cache"
        path = $doPath
        sizeBytes = $stats.sizeBytes
        fileCount = $stats.fileCount
        riskLevel = "safe"
        importance = "low"
        description = "Windows Update delivery optimization files. Safe to delete."
        descriptionTr = "Windows Update teslim optimizasyonu dosyalari. Silinmesi guvenlidir."
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
