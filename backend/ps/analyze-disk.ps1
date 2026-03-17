param(
    [Parameter(Mandatory=$true)]
    [string]$Path,
    [int]$Depth = 3,
    [int]$TopN = 20
)

$ErrorActionPreference = "SilentlyContinue"

if (-not (Test-Path $Path)) {
    @{ folders = @(); files = @(); totalSize = 0; totalFiles = 0; error = "Path not found: $Path" } | ConvertTo-Json -Depth 5
    exit
}

$allFiles = Get-ChildItem -Path $Path -Recurse -File -ErrorAction SilentlyContinue
$totalSize = ($allFiles | Measure-Object -Property Length -Sum).Sum
if (-not $totalSize) { $totalSize = 0 }
$totalFiles = ($allFiles | Measure-Object).Count

# Top largest files
$topFiles = $allFiles | Sort-Object Length -Descending | Select-Object -First $TopN | ForEach-Object {
    @{
        path = $_.FullName
        sizeBytes = $_.Length
        extension = $_.Extension
    }
}

# Folder sizes up to Depth
$folders = @{}
foreach ($f in $allFiles) {
    $rel = $f.FullName.Substring($Path.TrimEnd('\', '/').Length)
    $parts = $rel.Split('\/', [System.StringSplitOptions]::RemoveEmptyEntries)
    for ($i = 1; $i -le [Math]::Min($Depth, $parts.Count - 1); $i++) {
        $folderPath = (Join-Path $Path ($parts[0..($i-1)] -join '\'))
        if (-not $folders.ContainsKey($folderPath)) {
            $folders[$folderPath] = @{ sizeBytes = 0; fileCount = 0 }
        }
        $folders[$folderPath].sizeBytes += $f.Length
        $folders[$folderPath].fileCount += 1
    }
}

$topFolders = $folders.GetEnumerator() | Sort-Object { $_.Value.sizeBytes } -Descending | Select-Object -First $TopN | ForEach-Object {
    @{
        path = $_.Key
        sizeBytes = $_.Value.sizeBytes
        fileCount = $_.Value.fileCount
    }
}

if (-not $topFiles) { $topFiles = @() }
if (-not $topFolders) { $topFolders = @() }

@{
    folders = @($topFolders)
    files = @($topFiles)
    totalSize = $totalSize
    totalFiles = $totalFiles
} | ConvertTo-Json -Depth 5
