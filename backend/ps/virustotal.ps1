param(
    [ValidateSet("check-hash","check-file","report")]
    [string]$Action = "check-hash",
    [string]$Hash = "",
    [string]$FilePath = "",
    [string]$ApiKey = ""
)

$ErrorActionPreference = "Stop"

# API key'i environment variable'dan veya parametreden al
if (-not $ApiKey) {
    $ApiKey = $env:VIRUSTOTAL_API_KEY
}

if (-not $ApiKey) {
    @{ success = $false; error = "VirusTotal API key not configured. Set VIRUSTOTAL_API_KEY env variable or pass -ApiKey parameter." } | ConvertTo-Json -Depth 5
    exit
}

function Get-VTReport {
    param([string]$SHA256)

    try {
        $headers = @{ "x-apikey" = $ApiKey }
        $uri = "https://www.virustotal.com/api/v3/files/$SHA256"
        $response = Invoke-RestMethod -Uri $uri -Headers $headers -Method Get -TimeoutSec 15

        $attrs = $response.data.attributes
        $stats = $attrs.last_analysis_stats
        $results = $attrs.last_analysis_results

        # AV motorlarından pozitif sonuçları topla
        $detections = @()
        foreach ($engine in $results.PSObject.Properties) {
            if ($engine.Value.category -eq "malicious" -or $engine.Value.category -eq "suspicious") {
                $detections += @{
                    engine = $engine.Name
                    result = $engine.Value.result
                    category = $engine.Value.category
                }
            }
        }

        # Popüler AV'lerin sonuçlarını özel olarak göster
        $majorEngines = @("Kaspersky","BitDefender","Avast","AVG","ESET-NOD32","McAfee","Symantec","TrendMicro","Sophos","ClamAV","Microsoft","Malwarebytes","Fortinet","Panda","DrWeb","F-Secure","GData","Ikarus")
        $majorResults = @()
        foreach ($eng in $majorEngines) {
            $r = $results.$eng
            if ($r) {
                $majorResults += @{
                    engine = $eng
                    detected = ($r.category -eq "malicious" -or $r.category -eq "suspicious")
                    result = $r.result
                    category = $r.category
                }
            }
        }

        return @{
            success = $true
            found = $true
            sha256 = $SHA256
            fileName = $attrs.meaningful_name
            fileType = $attrs.type_description
            fileSize = $attrs.size
            malicious = $stats.malicious
            suspicious = $stats.suspicious
            undetected = $stats.undetected
            harmless = $stats.harmless
            totalEngines = ($stats.malicious + $stats.suspicious + $stats.undetected + $stats.harmless)
            detectionRate = "$($stats.malicious)/$($stats.malicious + $stats.suspicious + $stats.undetected + $stats.harmless)"
            threatLabel = $attrs.popular_threat_classification.suggested_threat_label
            threatCategory = if ($attrs.popular_threat_classification.popular_threat_category) {
                $attrs.popular_threat_classification.popular_threat_category[0].value
            } else { $null }
            firstSeen = $attrs.first_submission_date
            lastAnalysis = $attrs.last_analysis_date
            detections = $detections
            majorEngines = $majorResults
            reputation = $attrs.reputation
            tags = @($attrs.tags | Select-Object -First 10)
        }
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        if ($statusCode -eq 404) {
            return @{
                success = $true
                found = $false
                sha256 = $SHA256
                message = "File not found in VirusTotal database"
            }
        } elseif ($statusCode -eq 429) {
            return @{
                success = $false
                error = "VirusTotal API rate limit exceeded. Free tier: 4 requests/minute, 500/day."
                rateLimited = $true
            }
        } else {
            return @{ success = $false; error = "VirusTotal API error: $($_.Exception.Message)" }
        }
    }
}

function Check-FileHash {
    param([string]$FilePath)

    if (-not (Test-Path $FilePath)) {
        return @{ success = $false; error = "File not found: $FilePath" }
    }

    $hash = (Get-FileHash -Path $FilePath -Algorithm SHA256).Hash
    $report = Get-VTReport -SHA256 $hash

    # Dosya bilgilerini ekle
    $fileInfo = Get-Item $FilePath
    $report["localFile"] = @{
        path = $FilePath
        name = $fileInfo.Name
        size = $fileInfo.Length
        created = $fileInfo.CreationTime.ToString("o")
        modified = $fileInfo.LastWriteTime.ToString("o")
    }

    return $report
}

# Toplu hash kontrolü (birden fazla dosya)
function Check-MultipleHashes {
    param([string]$HashList)

    $hashes = $HashList -split ","
    $results = @()
    $checked = 0
    $infected = 0

    foreach ($h in $hashes) {
        $h = $h.Trim()
        if ($h.Length -ne 64) { continue }

        $report = Get-VTReport -SHA256 $h
        if ($report.success -and $report.found -and $report.malicious -gt 0) {
            $infected++
        }
        $results += $report
        $checked++

        # Rate limit: max 4/dakika (free tier)
        if ($checked % 4 -eq 0) {
            Start-Sleep -Seconds 60
        }
    }

    return @{
        success = $true
        checked = $checked
        infected = $infected
        results = $results
    }
}

$result = switch ($Action) {
    "check-hash" {
        if ($Hash) {
            Get-VTReport -SHA256 $Hash
        } elseif ($FilePath) {
            Check-FileHash -FilePath $FilePath
        } else {
            @{ success = $false; error = "Provide -Hash or -FilePath" }
        }
    }
    "check-file" {
        Check-FileHash -FilePath $FilePath
    }
    "report" {
        if ($Hash -and $Hash.Contains(",")) {
            Check-MultipleHashes -HashList $Hash
        } else {
            Get-VTReport -SHA256 $Hash
        }
    }
}

$result | ConvertTo-Json -Depth 5
