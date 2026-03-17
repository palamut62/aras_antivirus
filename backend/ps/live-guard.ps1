param(
    [Parameter(Mandatory=$true)]
    [string[]]$WatchPaths
)

$ErrorActionPreference = "SilentlyContinue"

$suspiciousExtensions = @(".exe",".dll",".scr",".com",".pif",".bat",".cmd",".ps1",".vbs",".vbe",".wsf",".wsh",".msi",".hta",".cpl",".inf",".reg",".jar",".msp",".mst")
$archiveExtensions = @(".zip",".rar",".7z",".cab",".iso",".tar",".gz")
$safeExtensions = @(".txt",".md",".log",".json",".yaml",".yml",".toml",".xml",".csv",".ini",".cfg",".conf",".gitignore",".editorconfig",".prettierrc",".eslintrc",".svg",".png",".jpg",".jpeg",".gif",".ico",".bmp",".webp",".woff",".woff2",".ttf",".eot",".map",".d.ts",".lock",".sum")
$devSourceExtensions = @(".js",".ts",".jsx",".tsx",".py",".go",".rs",".java",".cs",".cpp",".c",".h",".hpp",".rb",".php",".swift",".kt",".scala",".html",".css",".scss",".less",".sass",".vue",".svelte")

# Dev tool paths to ignore
$devIgnorePatterns = @("node_modules","\.git\\","\.vscode\\","__pycache__","\.npm","\.yarn","\.pnpm","\.nuget","\.cargo","\.rustup","\.gradle","\.m2","\.ivy2","dist\\","build\\","out\\","target\\","\.next\\","\.cache")

$cutoff = (Get-Date).AddSeconds(-30)
$events = @()

foreach ($watchPath in $WatchPaths) {
    if (-not (Test-Path $watchPath)) { continue }

    $newFiles = Get-ChildItem -Path $watchPath -Recurse -File -ErrorAction SilentlyContinue |
        Where-Object { $_.CreationTime -gt $cutoff }

    foreach ($file in $newFiles) {
        $ext = $file.Extension.ToLower()

        # Skip safe/source extensions entirely for performance
        if ($ext -in $safeExtensions -or $ext -in $devSourceExtensions) { continue }

        # Skip dev tool paths
        $skip = $false
        foreach ($pattern in $devIgnorePatterns) {
            if ($file.FullName -match $pattern) { $skip = $true; break }
        }
        if ($skip) { continue }

        $risk = 0
        $reason = @()

        # Check if it's a suspicious extension
        if ($ext -in $suspiciousExtensions) {
            $risk += 40
            $reason += "Suspicious executable/script extension"
        } elseif ($ext -in $archiveExtensions) {
            $risk += 15
            $reason += "Archive file created"
        } else {
            # Not a known-suspicious or known-safe extension, low base risk
            $risk += 5
        }

        # Skip if risk too low (only care about genuinely suspicious items)
        if ($risk -lt 10) { continue }

        # Check Zone.Identifier
        $isFromInternet = $false
        $zoneStream = Get-Content -Path "$($file.FullName):Zone.Identifier" -ErrorAction SilentlyContinue
        if ($zoneStream) {
            $zoneId = ($zoneStream | Where-Object { $_ -match "ZoneId=(\d)" } | ForEach-Object { $Matches[1] })
            if ($zoneId -ge 3) {
                $isFromInternet = $true
                $risk += 20
                $reason += "Downloaded from internet (Zone $zoneId)"
            }
        }

        # Quick SHA256
        $sha256 = (Get-FileHash -Path $file.FullName -Algorithm SHA256 -ErrorAction SilentlyContinue).Hash

        # Hidden file bonus
        if ($file.Attributes -band [System.IO.FileAttributes]::Hidden) {
            $risk += 10
            $reason += "Hidden file"
        }

        # Double extension
        $name = $file.Name
        if ($name -match '\.\w{2,4}\.(exe|scr|com|pif|bat|cmd|vbs|ps1|hta)$') {
            $risk += 30
            $reason += "Double extension trick"
        }

        $risk = [math]::Min(100, $risk)

        $events += @{
            path = $file.FullName
            fileName = $file.Name
            extension = $ext
            isFromInternet = $isFromInternet
            sha256 = $sha256
            riskScore = $risk
            reason = ($reason -join "; ")
            sizeKB = [math]::Round($file.Length / 1KB, 1)
            created = $file.CreationTime.ToString("o")
        }
    }
}

$events = $events | Sort-Object { $_.riskScore } -Descending

@{
    events = $events
    eventCount = $events.Count
} | ConvertTo-Json -Depth 5 -Compress
