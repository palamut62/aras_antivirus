param(
    [ValidateSet("quick","full","custom","status","threats","scan-file")]
    [string]$Action = "status",
    [string]$Path = ""
)

$ErrorActionPreference = "SilentlyContinue"

# Windows Defender durumunu kontrol et
function Get-DefenderStatus {
    try {
        $status = Get-MpComputerStatus
        if (-not $status) {
            return @{ available = $false; error = "Windows Defender not available" }
        }
        return @{
            available = $true
            antivirusEnabled = $status.AntivirusEnabled
            realTimeProtection = $status.RealTimeProtectionEnabled
            signatureVersion = $status.AntivirusSignatureVersion
            signatureLastUpdated = $status.AntivirusSignatureLastUpdated.ToString("o")
            engineVersion = $status.AMEngineVersion
            productVersion = $status.AMProductVersion
            fullScanAge = $status.FullScanAge
            quickScanAge = $status.QuickScanAge
            lastQuickScan = if ($status.QuickScanEndTime) { $status.QuickScanEndTime.ToString("o") } else { $null }
            lastFullScan = if ($status.FullScanEndTime) { $status.FullScanEndTime.ToString("o") } else { $null }
        }
    } catch {
        return @{ available = $false; error = $_.Exception.Message }
    }
}

# Son tespit edilen tehditleri getir
function Get-RecentThreats {
    try {
        $threats = Get-MpThreatDetection | Select-Object -First 50
        $result = @()
        foreach ($t in $threats) {
            # Tehdit detaylarını al
            $catalog = Get-MpThreat | Where-Object { $_.ThreatID -eq $t.ThreatID } | Select-Object -First 1
            $result += @{
                threatId = $t.ThreatID
                threatName = if ($catalog) { $catalog.ThreatName } else { "Unknown" }
                severity = switch ($t.ThreatStatusID) {
                    1 { "low" }
                    2 { "medium" }
                    4 { "high" }
                    5 { "severe" }
                    default { "unknown" }
                }
                severityId = if ($catalog) { $catalog.SeverityID } else { 0 }
                categoryId = if ($catalog) { $catalog.CategoryID } else { 0 }
                category = switch ($(if ($catalog) { $catalog.CategoryID } else { 0 })) {
                    0 { "Invalid" }
                    1 { "Adware" }
                    2 { "Spyware" }
                    3 { "Password Stealer" }
                    4 { "Trojan Downloader" }
                    5 { "Worm" }
                    6 { "Backdoor" }
                    7 { "Remote Access Trojan" }
                    8 { "Trojan" }
                    9 { "Email Flooder" }
                    10 { "Keylogger" }
                    11 { "Dialer" }
                    12 { "Monitoring Software" }
                    13 { "Browser Modifier" }
                    14 { "Cookie" }
                    15 { "Browser Plugin" }
                    19 { "Joke" }
                    21 { "Software Bundler" }
                    22 { "Trojan Notifier" }
                    23 { "Settings Modifier" }
                    27 { "Potentially Unwanted Software" }
                    30 { "Exploit" }
                    31 { "Streaming Media" }
                    32 { "Trojan FTP" }
                    34 { "Behavior" }
                    36 { "Vulnerability" }
                    37 { "Policy" }
                    38 { "Enterprise Unwanted Software" }
                    39 { "Ransom" }
                    40 { "Hacking Tool" }
                    42 { "Virus" }
                    default { "Other" }
                }
                detectionTime = $t.InitialDetectionTime.ToString("o")
                resources = @($t.Resources | Select-Object -First 5)
                actionSuccess = $t.ActionSuccess
                status = switch ($t.CurrentThreatStatusID) {
                    0 { "Unknown" }
                    1 { "Detected" }
                    2 { "Cleaned" }
                    3 { "Quarantined" }
                    4 { "Removed" }
                    5 { "Allowed" }
                    6 { "Blocked" }
                    102 { "QuarantineFailed" }
                    default { "Other" }
                }
            }
        }
        return @{ threats = $result; count = $result.Count }
    } catch {
        return @{ threats = @(); count = 0; error = $_.Exception.Message }
    }
}

# Belirli bir dosyayı Windows Defender ile tara
function Invoke-DefenderFileScan {
    param([string]$FilePath)

    if (-not (Test-Path $FilePath)) {
        return @{ success = $false; error = "File not found: $FilePath" }
    }

    $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()

    try {
        # Dosyayı tara
        Start-MpScan -ScanType CustomScan -ScanPath $FilePath

        # Kısa süre bekle, sonra tehditleri kontrol et
        Start-Sleep -Seconds 3

        $sha256 = (Get-FileHash -Path $FilePath -Algorithm SHA256 -ErrorAction SilentlyContinue).Hash

        # Bu dosya için tehdit var mı kontrol et
        $threats = Get-MpThreatDetection | Where-Object {
            $_.Resources -match [regex]::Escape($FilePath) -and
            $_.InitialDetectionTime -gt (Get-Date).AddMinutes(-2)
        }

        $stopwatch.Stop()

        if ($threats -and $threats.Count -gt 0) {
            $t = $threats | Select-Object -First 1
            $catalog = Get-MpThreat | Where-Object { $_.ThreatID -eq $t.ThreatID } | Select-Object -First 1
            return @{
                success = $true
                infected = $true
                sha256 = $sha256
                threatName = if ($catalog) { $catalog.ThreatName } else { "Unknown Threat" }
                severity = if ($catalog) { $catalog.SeverityID } else { 0 }
                category = if ($catalog) { $catalog.CategoryID } else { 0 }
                scanDuration = "$([Math]::Round($stopwatch.Elapsed.TotalSeconds, 2))s"
            }
        } else {
            return @{
                success = $true
                infected = $false
                sha256 = $sha256
                scanDuration = "$([Math]::Round($stopwatch.Elapsed.TotalSeconds, 2))s"
            }
        }
    } catch {
        $stopwatch.Stop()
        return @{ success = $false; error = $_.Exception.Message }
    }
}

# Hızlı / Tam Defender taraması
function Invoke-DefenderScan {
    param([string]$ScanType)

    $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()

    try {
        $mpScanType = switch ($ScanType) {
            "quick" { 1 }
            "full" { 2 }
            default { 1 }
        }
        Start-MpScan -ScanType $mpScanType
        $stopwatch.Stop()

        # Tarama sonrası tehditleri al
        $recentThreats = Get-MpThreatDetection | Where-Object {
            $_.InitialDetectionTime -gt (Get-Date).AddMinutes(-10)
        }

        $threatList = @()
        foreach ($t in $recentThreats) {
            $catalog = Get-MpThreat | Where-Object { $_.ThreatID -eq $t.ThreatID } | Select-Object -First 1
            $threatList += @{
                threatName = if ($catalog) { $catalog.ThreatName } else { "Unknown" }
                severity = if ($catalog) { $catalog.SeverityID } else { 0 }
                resources = @($t.Resources | Select-Object -First 3)
            }
        }

        return @{
            success = $true
            scanType = $ScanType
            threatsFound = $threatList.Count
            threats = $threatList
            scanDuration = "$([Math]::Round($stopwatch.Elapsed.TotalSeconds, 2))s"
        }
    } catch {
        $stopwatch.Stop()
        return @{ success = $false; error = $_.Exception.Message }
    }
}

# Ana akış
$result = switch ($Action) {
    "status" { Get-DefenderStatus }
    "threats" { Get-RecentThreats }
    "scan-file" { Invoke-DefenderFileScan -FilePath $Path }
    "quick" { Invoke-DefenderScan -ScanType "quick" }
    "full" { Invoke-DefenderScan -ScanType "full" }
    "custom" { Invoke-DefenderFileScan -FilePath $Path }
}

$result | ConvertTo-Json -Depth 5
