param(
    [Parameter(Mandatory=$true)]
    [string]$Path,
    [int]$Depth = 2,
    [int]$TopN = 20
)

$ErrorActionPreference = "SilentlyContinue"

if (-not (Test-Path $Path)) {
    @{ folders = @(); files = @(); totalSize = 0; totalFiles = 0; error = "Path not found: $Path" } | ConvertTo-Json -Depth 5
    exit
}

$Path = $Path.TrimEnd('\', '/')

# Only get immediate subdirectories for folder analysis (fast)
$subDirs = Get-ChildItem -Path $Path -Directory -ErrorAction SilentlyContinue | Select-Object -First 100

$folderResults = @()
$totalSize = [long]0
$totalFiles = [long]0
$allLargeFiles = @()

foreach ($dir in $subDirs) {
    try {
        $files = Get-ChildItem -Path $dir.FullName -Recurse -File -ErrorAction SilentlyContinue
        $dirSize = ($files | Measure-Object -Property Length -Sum).Sum
        if (-not $dirSize) { $dirSize = 0 }
        $dirCount = ($files | Measure-Object).Count
        $totalSize += $dirSize
        $totalFiles += $dirCount

        $folderResults += @{
            path = $dir.FullName
            sizeBytes = $dirSize
            fileCount = $dirCount
        }

        # Collect top 5 largest files per folder for overall ranking
        $topInDir = $files | Sort-Object Length -Descending | Select-Object -First 5
        foreach ($f in $topInDir) {
            $allLargeFiles += @{
                path = $f.FullName
                sizeBytes = $f.Length
                extension = $f.Extension
            }
        }
    } catch {}
}

# Also count root-level files
$rootFiles = Get-ChildItem -Path $Path -File -ErrorAction SilentlyContinue
foreach ($rf in $rootFiles) {
    $totalSize += $rf.Length
    $totalFiles += 1
    $allLargeFiles += @{
        path = $rf.FullName
        sizeBytes = $rf.Length
        extension = $rf.Extension
    }
}

# Sort and pick top N
$topFolders = $folderResults | Sort-Object { $_.sizeBytes } -Descending | Select-Object -First $TopN
$topFiles = $allLargeFiles | Sort-Object { $_.sizeBytes } -Descending | Select-Object -First $TopN

if (-not $topFiles) { $topFiles = @() }
if (-not $topFolders) { $topFolders = @() }

@{
    folders = @($topFolders)
    files = @($topFiles)
    totalSize = $totalSize
    totalFiles = $totalFiles
    scannedFolders = $subDirs.Count
} | ConvertTo-Json -Depth 5
