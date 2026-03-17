param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("scan-downloads","scan-browser-history","check-extensions","scan-temp-executables")]
    [string]$Action
)

$ErrorActionPreference = "SilentlyContinue"
$startTime = Get-Date

# Developer-friendly exclusions
$devExtensions = @(".py",".js",".ts",".jsx",".tsx",".go",".rs",".java",".cs",".cpp",".c",".h",".rb",".php",".json",".yaml",".yml",".toml",".xml",".html",".css",".scss",".md",".txt",".log",".csv",".sql",".sh",".lock",".map",".svg",".png",".jpg",".gif",".ico",".woff",".woff2",".ttf",".eot")
$devProcessNames = @("node","python","pip","git","code","devenv","idea64","webstorm64","pycharm64","rider64","dotnet","cargo","rustc","gcc","g++","javac","gradle","maven","npm","yarn","pnpm","bun")
$suspiciousExeExtensions = @(".exe",".dll",".scr",".com",".pif",".bat",".cmd",".ps1",".vbs",".vbe",".wsf",".wsh",".msi",".msp",".mst",".cpl",".hta",".inf",".reg")
$suspiciousArchiveExtensions = @(".zip",".rar",".7z",".tar.gz",".cab",".iso")
$suspiciousDomainPatterns = @("free-download","crack","keygen","warez","torrent","pirat","hack-tool","serialkey","activat","patch-crack","nulled","generat0r","free-license","cheat-engine","loader-free")

function Get-FileRiskScore {
    param([string]$FilePath)
    $risk = 0
    $reasons = @()
    $ext = [System.IO.Path]::GetExtension($FilePath).ToLower()

    # Check Zone.Identifier (Mark of the Web)
    $zoneStream = Get-Content -Path "${FilePath}:Zone.Identifier" -ErrorAction SilentlyContinue
    $zoneId = ($zoneStream | Where-Object { $_ -match "ZoneId=(\d)" } | ForEach-Object { $Matches[1] })
    $hostUrl = ($zoneStream | Where-Object { $_ -match "HostUrl=(.*)" } | ForEach-Object { $Matches[1] })
    $referrerUrl = ($zoneStream | Where-Object { $_ -match "ReferrerUrl=(.*)" } | ForEach-Object { $Matches[1] })

    if ($zoneId -eq "3") {
        $risk += 10
        $reasons += "Downloaded from internet (Zone 3)"
    }
    if ($zoneId -eq "4") {
        $risk += 30
        $reasons += "Downloaded from restricted zone (Zone 4)"
    }

    # Check source URL for suspicious patterns
    if ($hostUrl) {
        foreach ($pattern in $suspiciousDomainPatterns) {
            if ($hostUrl -match $pattern) {
                $risk += 30
                $reasons += "Downloaded from suspicious source matching '$pattern'"
                break
            }
        }
    }

    # Executable without valid signature
    if ($ext -in @(".exe",".dll",".msi",".sys")) {
        $sig = Get-AuthenticodeSignature -FilePath $FilePath -ErrorAction SilentlyContinue
        if ($sig -and $sig.Status -eq "Valid") {
            $risk -= 10
        } elseif ($sig -and $sig.Status -eq "NotSigned") {
            $risk += 20
            $reasons += "Executable is not digitally signed"
        } elseif ($sig -and $sig.Status -ne "Valid") {
            $risk += 35
            $reasons += "Invalid or broken digital signature: $($sig.Status)"
        }
    }

    # Suspicious extension
    if ($ext -in $suspiciousExeExtensions) {
        $risk += 15
        $reasons += "Suspicious executable extension: $ext"
    }

    # Double extension trick (e.g., document.pdf.exe)
    $name = [System.IO.Path]::GetFileName($FilePath)
    if ($name -match '\.\w{2,4}\.(exe|scr|com|pif|bat|cmd|vbs|ps1|hta)$') {
        $risk += 40
        $reasons += "Double extension detected (social engineering trick)"
    }

    # Very small or zero-byte exe
    $fileInfo = Get-Item -LiteralPath $FilePath -ErrorAction SilentlyContinue
    if ($fileInfo -and $ext -in @(".exe",".dll") -and $fileInfo.Length -lt 10KB) {
        $risk += 20
        $reasons += "Suspiciously small executable ($([math]::Round($fileInfo.Length/1KB,1))KB)"
    }

    # Very recent file
    if ($fileInfo -and $fileInfo.CreationTime -gt (Get-Date).AddHours(-1)) {
        $risk += 5
        $reasons += "Created within the last hour"
    }

    $risk = [math]::Max(0, [math]::Min(100, $risk))
    return @{ risk = $risk; reasons = $reasons; zoneId = $zoneId; hostUrl = $hostUrl; referrerUrl = $referrerUrl }
}

function Invoke-ScanDownloads {
    $downloadsPath = [System.IO.Path]::Combine($env:USERPROFILE, "Downloads")
    if (-not (Test-Path $downloadsPath)) {
        return @{ action = "scan-downloads"; results = @(); totalFound = 0; flaggedCount = 0; scanTime = 0; error = "Downloads folder not found" }
    }

    $cutoff = (Get-Date).AddHours(-24)
    $recentFiles = Get-ChildItem -Path $downloadsPath -Recurse -File -ErrorAction SilentlyContinue |
        Where-Object { $_.CreationTime -gt $cutoff -or $_.LastWriteTime -gt $cutoff }

    $results = @()
    $flagged = 0

    foreach ($file in $recentFiles) {
        $ext = $file.Extension.ToLower()
        # Skip known dev/safe file types
        if ($ext -in $devExtensions) { continue }

        $riskData = Get-FileRiskScore -FilePath $file.FullName
        $sha256 = $null
        if ($ext -in ($suspiciousExeExtensions + $suspiciousArchiveExtensions)) {
            $sha256 = (Get-FileHash -Path $file.FullName -Algorithm SHA256 -ErrorAction SilentlyContinue).Hash
        }

        if ($riskData.risk -ge 10) {
            $flagged++
        }

        $results += @{
            path = $file.FullName
            fileName = $file.Name
            extension = $ext
            sizeKB = [math]::Round($file.Length / 1KB, 1)
            created = $file.CreationTime.ToString("o")
            modified = $file.LastWriteTime.ToString("o")
            sha256 = $sha256
            riskScore = $riskData.risk
            reasons = $riskData.reasons
            zoneId = $riskData.zoneId
            hostUrl = $riskData.hostUrl
            referrerUrl = $riskData.referrerUrl
        }
    }

    $results = $results | Sort-Object { $_.riskScore } -Descending
    $elapsed = ((Get-Date) - $startTime).TotalMilliseconds

    return @{
        action = "scan-downloads"
        results = $results
        totalFound = $results.Count
        flaggedCount = $flagged
        scanTime = [math]::Round($elapsed)
    }
}

function Invoke-ScanBrowserHistory {
    $results = @()
    $browsers = @(
        @{ name = "Chrome"; path = "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\History" },
        @{ name = "Edge"; path = "$env:LOCALAPPDATA\Microsoft\Edge\User Data\Default\History" }
    )

    foreach ($browser in $browsers) {
        if (-not (Test-Path $browser.path)) { continue }

        # Copy DB to temp to avoid lock
        $tempDb = Join-Path $env:TEMP "aras_hist_$($browser.name)_$(Get-Random).db"
        Copy-Item -Path $browser.path -Destination $tempDb -Force -ErrorAction SilentlyContinue
        if (-not (Test-Path $tempDb)) { continue }

        try {
            Add-Type -Path "$PSScriptRoot\..\lib\System.Data.SQLite.dll" -ErrorAction SilentlyContinue
            $useSqlite = $true
        } catch {
            $useSqlite = $false
        }

        if ($useSqlite) {
            try {
                $conn = New-Object System.Data.SQLite.SQLiteConnection("Data Source=$tempDb;Read Only=True;")
                $conn.Open()
                $cmd = $conn.CreateCommand()
                $cutoffMicro = ([DateTimeOffset](Get-Date).AddHours(-24)).ToUnixTimeSeconds() * 1000000 + 11644473600000000
                $cmd.CommandText = "SELECT url, title, visit_count, last_visit_time FROM urls WHERE last_visit_time > $cutoffMicro ORDER BY last_visit_time DESC LIMIT 500"
                $reader = $cmd.ExecuteReader()
                while ($reader.Read()) {
                    $url = $reader["url"].ToString()
                    $title = $reader["title"].ToString()
                    $urlLower = $url.ToLower()
                    $isSuspicious = $false
                    $matchedPattern = ""
                    foreach ($pattern in $suspiciousDomainPatterns) {
                        if ($urlLower -match $pattern) {
                            $isSuspicious = $true
                            $matchedPattern = $pattern
                            break
                        }
                    }
                    if ($isSuspicious) {
                        $results += @{
                            browser = $browser.name
                            url = $url
                            title = $title
                            matchedPattern = $matchedPattern
                            riskScore = 50
                        }
                    }
                }
                $reader.Close()
                $conn.Close()
            } catch {}
        } else {
            # Fallback: try reading with basic file parsing - limited but works without SQLite DLL
            # We'll attempt sqlite3 if available
            $sqlite3 = Get-Command sqlite3 -ErrorAction SilentlyContinue
            if ($sqlite3) {
                $query = "SELECT url, title FROM urls WHERE last_visit_time > (strftime('%s','now','-1 day')*1000000 + 11644473600000000) ORDER BY last_visit_time DESC LIMIT 500;"
                $rows = & sqlite3 $tempDb $query 2>$null
                foreach ($row in $rows) {
                    $parts = $row -split '\|', 2
                    $url = $parts[0]
                    $title = if ($parts.Count -gt 1) { $parts[1] } else { "" }
                    $urlLower = $url.ToLower()
                    foreach ($pattern in $suspiciousDomainPatterns) {
                        if ($urlLower -match $pattern) {
                            $results += @{
                                browser = $browser.name
                                url = $url
                                title = $title
                                matchedPattern = $pattern
                                riskScore = 50
                            }
                            break
                        }
                    }
                }
            } else {
                $results += @{
                    browser = $browser.name
                    url = ""
                    title = "SQLite library not available - cannot parse browser history"
                    matchedPattern = ""
                    riskScore = 0
                    note = "Install System.Data.SQLite.dll in backend\lib or add sqlite3 to PATH"
                }
            }
        }
        Remove-Item $tempDb -Force -ErrorAction SilentlyContinue
    }

    $elapsed = ((Get-Date) - $startTime).TotalMilliseconds
    return @{
        action = "scan-browser-history"
        results = $results
        totalFound = $results.Count
        flaggedCount = ($results | Where-Object { $_.riskScore -gt 0 }).Count
        scanTime = [math]::Round($elapsed)
    }
}

function Invoke-CheckExtensions {
    $results = @()
    $browsers = @(
        @{ name = "Chrome"; path = "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Extensions" },
        @{ name = "Edge"; path = "$env:LOCALAPPDATA\Microsoft\Edge\User Data\Default\Extensions" }
    )

    $riskyPermissions = @("tabs","webRequest","webRequestBlocking","<all_urls>","cookies","history","bookmarks","clipboardRead","clipboardWrite","nativeMessaging","proxy","debugger","pageCapture","desktopCapture","management")

    foreach ($browser in $browsers) {
        if (-not (Test-Path $browser.path)) { continue }
        $extDirs = Get-ChildItem -Path $browser.path -Directory -ErrorAction SilentlyContinue

        foreach ($extDir in $extDirs) {
            $versionDirs = Get-ChildItem -Path $extDir.FullName -Directory -ErrorAction SilentlyContinue | Sort-Object Name -Descending | Select-Object -First 1
            if (-not $versionDirs) { continue }

            $manifestPath = Join-Path $versionDirs.FullName "manifest.json"
            if (-not (Test-Path $manifestPath)) { continue }

            $manifest = Get-Content $manifestPath -Raw -ErrorAction SilentlyContinue | ConvertFrom-Json -ErrorAction SilentlyContinue
            if (-not $manifest) { continue }

            $extName = if ($manifest.name -and -not $manifest.name.StartsWith("__MSG_")) { $manifest.name } else { $extDir.Name }
            $permissions = @()
            if ($manifest.permissions) { $permissions += $manifest.permissions }
            if ($manifest.optional_permissions) { $permissions += $manifest.optional_permissions }
            if ($manifest.host_permissions) { $permissions += $manifest.host_permissions }

            $flaggedPerms = $permissions | Where-Object { $_ -in $riskyPermissions -or $_ -match "^\*://" -or $_ -eq "<all_urls>" }

            $risk = 0
            $reasons = @()

            if ($flaggedPerms.Count -ge 5) {
                $risk += 30
                $reasons += "Many risky permissions ($($flaggedPerms.Count))"
            } elseif ($flaggedPerms.Count -ge 3) {
                $risk += 15
                $reasons += "Several risky permissions ($($flaggedPerms.Count))"
            }

            if ($permissions -contains "webRequestBlocking") {
                $risk += 20
                $reasons += "Can intercept/modify web requests"
            }
            if ($permissions -contains "nativeMessaging") {
                $risk += 15
                $reasons += "Can communicate with native apps"
            }
            if ($permissions -contains "debugger") {
                $risk += 25
                $reasons += "Has debugger permission"
            }

            # Check if recently installed
            $installTime = $versionDirs.CreationTime
            if ($installTime -gt (Get-Date).AddDays(-3)) {
                $risk += 10
                $reasons += "Recently installed ($($installTime.ToString('yyyy-MM-dd HH:mm')))"
            }

            # No update URL might indicate sideloaded
            if (-not $manifest.update_url) {
                $risk += 15
                $reasons += "No update_url (possibly sideloaded)"
            }

            $risk = [math]::Min(100, $risk)

            $results += @{
                browser = $browser.name
                extensionId = $extDir.Name
                name = $extName
                version = $manifest.version
                description = if ($manifest.description -and -not $manifest.description.StartsWith("__MSG_")) { $manifest.description } else { "" }
                permissions = [array]$flaggedPerms
                allPermissionCount = $permissions.Count
                installedDate = $installTime.ToString("o")
                riskScore = $risk
                reasons = $reasons
                sideloaded = (-not $manifest.update_url)
            }
        }
    }

    $results = $results | Sort-Object { $_.riskScore } -Descending
    $elapsed = ((Get-Date) - $startTime).TotalMilliseconds
    return @{
        action = "check-extensions"
        results = $results
        totalFound = $results.Count
        flaggedCount = ($results | Where-Object { $_.riskScore -ge 20 }).Count
        scanTime = [math]::Round($elapsed)
    }
}

function Invoke-ScanTempExecutables {
    $tempPaths = @(
        $env:TEMP,
        "$env:LOCALAPPDATA\Temp",
        "$env:USERPROFILE\AppData\Local\Temp"
    ) | Select-Object -Unique | Where-Object { Test-Path $_ }

    # Dev tool temp patterns to ignore
    $devIgnorePatterns = @("node_modules","\.npm","\.yarn","pip","__pycache__","\.git","\.vscode","electron","nw\.exe","code\.exe")

    $results = @()
    $totalScanned = 0

    foreach ($tempPath in $tempPaths) {
        $files = Get-ChildItem -Path $tempPath -Recurse -File -ErrorAction SilentlyContinue |
            Where-Object { $_.Extension.ToLower() -in $suspiciousExeExtensions }

        foreach ($file in $files) {
            $totalScanned++
            # Skip dev tool paths
            $skipFile = $false
            foreach ($pattern in $devIgnorePatterns) {
                if ($file.FullName -match $pattern) { $skipFile = $true; break }
            }
            if ($skipFile) { continue }

            $risk = 30  # Base risk: executables in temp are inherently suspicious
            $reasons = @("Executable found in temp directory")

            $ext = $file.Extension.ToLower()
            $sha256 = (Get-FileHash -Path $file.FullName -Algorithm SHA256 -ErrorAction SilentlyContinue).Hash

            # Check signature
            if ($ext -in @(".exe",".dll",".msi")) {
                $sig = Get-AuthenticodeSignature -FilePath $file.FullName -ErrorAction SilentlyContinue
                if ($sig -and $sig.Status -eq "Valid") {
                    $risk -= 15
                    $signer = $sig.SignerCertificate.Subject
                } elseif ($sig -and $sig.Status -eq "NotSigned") {
                    $risk += 20
                    $reasons += "Not digitally signed"
                    $signer = $null
                } else {
                    $risk += 30
                    $reasons += "Invalid signature"
                    $signer = $null
                }
            } else {
                $signer = $null
            }

            # Hidden file
            if ($file.Attributes -band [System.IO.FileAttributes]::Hidden) {
                $risk += 15
                $reasons += "Hidden file"
            }

            # Script files in temp are extra suspicious
            if ($ext -in @(".bat",".cmd",".ps1",".vbs",".vbe",".wsf",".hta")) {
                $risk += 15
                $reasons += "Script file in temp"
                # Quick content check for obviously malicious patterns
                $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
                if ($content -and ($content -match "Invoke-Expression|IEX |DownloadString|DownloadFile|Net\.WebClient|Start-Process.*-WindowStyle\s+Hidden|bitsadmin|certutil.*-decode|powershell.*-enc")) {
                    $risk += 30
                    $reasons += "Contains suspicious command patterns"
                }
            }

            $risk = [math]::Max(0, [math]::Min(100, $risk))

            $results += @{
                path = $file.FullName
                fileName = $file.Name
                extension = $ext
                sizeKB = [math]::Round($file.Length / 1KB, 1)
                created = $file.CreationTime.ToString("o")
                modified = $file.LastWriteTime.ToString("o")
                sha256 = $sha256
                signer = $signer
                riskScore = $risk
                reasons = $reasons
                hidden = ($file.Attributes -band [System.IO.FileAttributes]::Hidden) -ne 0
            }
        }
    }

    $results = $results | Sort-Object { $_.riskScore } -Descending
    $elapsed = ((Get-Date) - $startTime).TotalMilliseconds
    return @{
        action = "scan-temp-executables"
        results = $results
        totalFound = $results.Count
        flaggedCount = ($results | Where-Object { $_.riskScore -ge 30 }).Count
        scanTime = [math]::Round($elapsed)
    }
}

# Execute requested action
$output = switch ($Action) {
    "scan-downloads"        { Invoke-ScanDownloads }
    "scan-browser-history"  { Invoke-ScanBrowserHistory }
    "check-extensions"      { Invoke-CheckExtensions }
    "scan-temp-executables" { Invoke-ScanTempExecutables }
}

$output | ConvertTo-Json -Depth 5 -Compress
