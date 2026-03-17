param(
    [string]$Path = "",
    [ValidateSet("quick","full","custom")]
    [string]$ScanType = "quick"
)

$ErrorActionPreference = "SilentlyContinue"
$stopwatch = [System.Diagnostics.Stopwatch]::StartNew()

$suspiciousExtensions = @('.exe','.dll','.bat','.cmd','.ps1','.vbs','.js','.jar','.py','.scr')

function Get-FileEntropy {
    param([string]$FilePath)
    try {
        $bytes = [System.IO.File]::ReadAllBytes($FilePath)
        if ($bytes.Length -eq 0) { return 0.0 }
        $freq = @{}
        foreach ($b in $bytes) {
            if ($freq.ContainsKey($b)) { $freq[$b]++ } else { $freq[$b] = 1 }
        }
        $entropy = 0.0
        $len = $bytes.Length
        foreach ($count in $freq.Values) {
            $p = $count / $len
            if ($p -gt 0) { $entropy -= $p * [Math]::Log($p, 2) }
        }
        return [Math]::Round($entropy, 4)
    } catch { return 0.0 }
}

function Get-FileSHA256 {
    param([string]$FilePath)
    try {
        $hash = Get-FileHash -Path $FilePath -Algorithm SHA256
        return $hash.Hash
    } catch { return "" }
}

function Test-FileHeuristics {
    param([string]$FilePath, [string]$Extension)
    $reasons = @()
    $heuristics = @()
    $riskScore = 0

    # Temp folder check
    $tempPaths = @($env:TEMP, $env:TMP, "$env:LOCALAPPDATA\Temp")
    foreach ($tp in $tempPaths) {
        if ($tp -and $FilePath.StartsWith($tp, [System.StringComparison]::OrdinalIgnoreCase)) {
            $riskScore += 20; $reasons += "File in temp folder"; break
        }
    }

    # Startup persistence
    $startupPaths = @(
        "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup",
        "$env:ProgramData\Microsoft\Windows\Start Menu\Programs\Startup"
    )
    foreach ($sp in $startupPaths) {
        if ($FilePath.StartsWith($sp, [System.StringComparison]::OrdinalIgnoreCase)) {
            $riskScore += 20; $reasons += "Startup persistence location"; break
        }
    }

    # Content analysis for text-readable files
    $textExts = @('.bat','.cmd','.ps1','.vbs','.js','.py','.txt','.xml','.json')
    if ($Extension -in $textExts) {
        try {
            $content = Get-Content -Path $FilePath -Raw -ErrorAction Stop
            if ($content.Length -gt 5MB) { $content = $content.Substring(0, 5MB) }

            # Encoded PowerShell
            if ($content -match '(?i)-enc(odedcommand)?\s+[A-Za-z0-9+/=]{20,}') {
                $riskScore += 35; $reasons += "Encoded PowerShell command"; $heuristics += "encoded_powershell"
            }

            # Base64 commands
            if ($content -match '(?i)(frombase64string|convertfrom-base64|atob\s*\()') {
                $riskScore += 25; $reasons += "Base64 decoding detected"; $heuristics += "base64_decode"
            }

            # Eval + base64
            if ($content -match '(?i)eval\s*\(' -and $content -match '(?i)(base64|atob|decode)') {
                $riskScore += 30; $reasons += "Eval with base64/decode combo"; $heuristics += "eval_base64_combo"
            }

            # Suspicious URLs
            if ($content -match '(?i)(pastebin\.com|raw\.githubusercontent|transfer\.sh|ngrok\.io|discord(app)?\.com/api/webhooks)') {
                $riskScore += 15; $reasons += "Suspicious URL found"; $heuristics += "suspicious_url"
            }

            # Token/API key patterns
            if ($content -match '(?i)(api[_-]?key|api[_-]?secret|token|password|credentials)\s*[=:]\s*["\x27]?[A-Za-z0-9_\-]{16,}') {
                $riskScore += 10; $reasons += "Possible exposed API key/token"; $heuristics += "exposed_secret"
            }

            # Known bad strings - assembled at runtime to avoid AV false positive on this script
            $badParts = @(
                @('Inv','oke-Mim','ikatz'),
                @('Inv','oke-Emp','ire'),
                @('Net.Web','Client'),
                @('Down','load','String'),
                @('Down','load','File'),
                @('Start-Bits','Transfer'),
                @('Inv','oke-Shell','code'),
                @('reve','rse_','tcp'),
                @('mete','rpre','ter')
            )
            foreach ($parts in $badParts) {
                $bs = -join $parts
                if ($content -match [regex]::Escape($bs)) {
                    $riskScore += 20; $reasons += "Known malicious string: $bs"; $heuristics += "known_bad_$bs"; break
                }
            }
        } catch {}
    }

    # Unsigned exe/dll
    if ($Extension -in @('.exe','.dll','.scr')) {
        $sig = Get-AuthenticodeSignature -FilePath $FilePath
        if (-not $sig -or $sig.Status -ne 'Valid') {
            $riskScore += 10; $reasons += "Unsigned executable"
        }
    }

    return @{ riskScore = $riskScore; reasons = $reasons; heuristics = $heuristics }
}

# Determine scan paths
$scanPaths = @()
switch ($ScanType) {
    "quick" {
        $scanPaths += "$env:USERPROFILE\Downloads"
        $scanPaths += "$env:USERPROFILE\Desktop"
        $scanPaths += $env:TEMP
    }
    "full" {
        $scanPaths += $env:USERPROFILE
    }
    "custom" {
        $scanPaths += $Path
    }
}

# Validate paths
$validPaths = $scanPaths | Where-Object { Test-Path $_ }
if ($validPaths.Count -eq 0) {
    @{ totalFiles = 0; scannedFiles = 0; threats = @(); scanDuration = "0s"; error = "No valid paths to scan" } | ConvertTo-Json -Depth 5
    exit
}

$allFiles = @()
foreach ($sp in $validPaths) {
    $allFiles += Get-ChildItem -Path $sp -Recurse -File -ErrorAction SilentlyContinue
}

$totalFiles = $allFiles.Count
$scannedFiles = 0
$threats = @()

foreach ($file in $allFiles) {
    $scannedFiles++
    $ext = $file.Extension.ToLower()

    if ($ext -notin $suspiciousExtensions) { continue }

    $sha256 = Get-FileSHA256 -FilePath $file.FullName
    $entropy = Get-FileEntropy -FilePath $file.FullName
    $hResult = Test-FileHeuristics -FilePath $file.FullName -Extension $ext
    $riskScore = $hResult.riskScore
    $reasons = [System.Collections.ArrayList]@($hResult.reasons)
    $heuristics = [System.Collections.ArrayList]@($hResult.heuristics)

    # High entropy
    if ($entropy -gt 7.0) {
        $riskScore += 15; $reasons.Add("High entropy ($entropy)") | Out-Null; $heuristics.Add("high_entropy") | Out-Null
    }

    if ($riskScore -eq 0) { continue }

    # Severity
    $severity = switch ($true) {
        ($riskScore -ge 70) { "high" }
        ($riskScore -ge 50) { "suspicious" }
        ($riskScore -ge 25) { "medium" }
        default { "low" }
    }

    # Recommended action
    $action = switch ($severity) {
        "high" { "quarantine" }
        "suspicious" { "review" }
        "medium" { "monitor" }
        default { "ignore" }
    }

    $threats += @{
        filePath = $file.FullName
        fileName = $file.Name
        sha256 = $sha256
        extension = $ext
        sizeBytes = $file.Length
        entropy = $entropy
        riskScore = $riskScore
        severity = $severity
        reasons = @($reasons)
        heuristicMatches = @($heuristics)
        recommendedAction = $action
    }
}

$stopwatch.Stop()

@{
    totalFiles = $totalFiles
    scannedFiles = $scannedFiles
    threats = @($threats)
    scanDuration = "$([Math]::Round($stopwatch.Elapsed.TotalSeconds, 2))s"
} | ConvertTo-Json -Depth 5
