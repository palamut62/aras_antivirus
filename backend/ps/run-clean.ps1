# Mole - Cleanup Execution Script
param(
    [string[]]$Category,
    [switch]$UseRecycleBin,
    [switch]$DryRun
)

$ErrorActionPreference = "SilentlyContinue"
$user = $env:USERPROFILE

$categoryPaths = @{
    "windows_temp" = $env:TEMP
    "user_temp" = "$user\AppData\Local\Temp"
    "chrome_cache" = "$user\AppData\Local\Google\Chrome\User Data\Default\Cache"
    "edge_cache" = "$user\AppData\Local\Microsoft\Edge\User Data\Default\Cache"
    "crash_dumps" = "$user\AppData\Local\CrashDumps"
    "windows_update" = "C:\Windows\SoftwareDistribution\Download"
    "npm_cache" = "$user\AppData\Local\npm-cache"
    "pip_cache" = "$user\AppData\Local\pip\cache"
}

$protected = @("C:\Windows", "C:\Program Files", "C:\Program Files (x86)", "$user\Documents", "$user\Desktop")

$totalFreed = 0
$totalItems = 0
$errors = @()

foreach ($cat in $Category) {
    if ($cat -eq "recycle_bin") {
        if (-not $DryRun) {
            try {
                Clear-RecycleBin -Force -ErrorAction Stop
            } catch {
                $errors += "RecycleBin: $($_.Exception.Message)"
            }
        }
        continue
    }

    if ($cat -eq "thumbnail_cache") {
        $thumbPath = "$user\AppData\Local\Microsoft\Windows\Explorer"
        $thumbFiles = Get-ChildItem -Path $thumbPath -Filter "thumbcache_*" -File -Force -ErrorAction SilentlyContinue
        foreach ($f in $thumbFiles) {
            $totalFreed += $f.Length
            $totalItems++
            if (-not $DryRun) {
                Remove-Item -Path $f.FullName -Force -ErrorAction SilentlyContinue
            }
        }
        continue
    }

    $path = $categoryPaths[$cat]
    if (-not $path -or -not (Test-Path $path)) { continue }

    # Safety: check not in protected list
    $isProtected = $false
    foreach ($p in $protected) {
        if ($path -eq $p -or $path.StartsWith("$p\")) {
            $isProtected = $true
            break
        }
    }
    if ($isProtected) {
        $errors += "$cat : path is protected"
        continue
    }

    $files = Get-ChildItem -Path $path -Recurse -File -Force -ErrorAction SilentlyContinue
    foreach ($f in $files) {
        $totalFreed += $f.Length
        $totalItems++
        if (-not $DryRun) {
            if ($UseRecycleBin) {
                $shell = New-Object -ComObject Shell.Application
                $dir = $shell.NameSpace((Split-Path $f.FullName))
                $item = $dir.ParseName($f.Name)
                if ($item) { $item.InvokeVerb("delete") }
            } else {
                Remove-Item -Path $f.FullName -Force -ErrorAction SilentlyContinue
            }
        }
    }
}

$result = @{
    sizeFreed = [long]$totalFreed
    itemCount = $totalItems
    dryRun = [bool]$DryRun
    errors = $errors
}

$result | ConvertTo-Json -Depth 3
