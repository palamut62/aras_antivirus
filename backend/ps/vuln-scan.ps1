param([string]$Action = "scan")
$ErrorActionPreference = "SilentlyContinue"

function Get-InstalledPrograms {
    $keys = @(
        "HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*",
        "HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*",
        "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*"
    )
    $apps = @()
    foreach ($k in $keys) {
        Get-ItemProperty $k -ErrorAction SilentlyContinue | ForEach-Object {
            if ($_.DisplayName -and $_.DisplayVersion) {
                $apps += @{
                    name = $_.DisplayName.Trim()
                    version = $_.DisplayVersion.Trim()
                    publisher = if ($_.Publisher) { $_.Publisher } else { "" }
                }
            }
        }
    }
    # de-dup by name+version
    $apps | Sort-Object @{e='name'},@{e='version'} -Unique
}

function Query-OSV($name, $version) {
    $body = @{
        package = @{ name = $name; ecosystem = "Other" }
        version = $version
    } | ConvertTo-Json -Compress
    try {
        $r = Invoke-RestMethod -Uri "https://api.osv.dev/v1/query" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 8
        return $r.vulns
    } catch { return $null }
}

switch ($Action) {
    "scan" {
        $apps = Get-InstalledPrograms
        $findings = @()
        $scanned = 0
        # OSV uses ecosystem-prefixed names mostly; "Other" matches generic packages.
        # We try a name-normalized form to widen matches.
        foreach ($a in $apps) {
            $scanned++
            $candidates = @($a.name)
            $norm = ($a.name -replace '\s+', '-').ToLower()
            if ($norm -ne $a.name.ToLower()) { $candidates += $norm }
            foreach ($cand in $candidates) {
                $vulns = Query-OSV $cand $a.version
                if ($vulns) {
                    foreach ($v in $vulns) {
                        $sev = ""
                        if ($v.severity -and $v.severity.Count -gt 0) { $sev = $v.severity[0].score }
                        $findings += @{
                            app = $a.name
                            version = $a.version
                            publisher = $a.publisher
                            cveId = $v.id
                            summary = if ($v.summary) { $v.summary } else { "" }
                            severity = $sev
                            published = $v.published
                            referenceUrl = if ($v.references -and $v.references.Count -gt 0) { $v.references[0].url } else { "" }
                        }
                    }
                    break
                }
            }
        }
        @{ success = $true; data = @{ findings = @($findings); appsScanned = $scanned; count = $findings.Count } } | ConvertTo-Json -Depth 6 -Compress
    }
    default { @{ success = $false; error = "Unknown action" } | ConvertTo-Json -Compress }
}
