$ErrorActionPreference = "SilentlyContinue"

$wmiProcesses = Get-CimInstance -ClassName Win32_Process | Select-Object ProcessId, ParentProcessId, Name, ExecutablePath, CommandLine

$processes = @()
$flaggedCount = 0

foreach ($proc in $wmiProcesses) {
    $pid_ = $proc.ProcessId
    $sysProc = Get-Process -Id $pid_ -ErrorAction SilentlyContinue

    $memoryMB = 0
    $cpuPercent = 0
    $company = ""

    if ($sysProc) {
        $memoryMB = [Math]::Round($sysProc.WorkingSet64 / 1MB, 2)
        $cpuPercent = [Math]::Round($sysProc.CPU, 2)
        if ($sysProc.Path) {
            $verInfo = (Get-Item $sysProc.Path -ErrorAction SilentlyContinue).VersionInfo
            $company = $verInfo.CompanyName
            if (-not $company) {
                $sig = Get-AuthenticodeSignature -FilePath $sysProc.Path -ErrorAction SilentlyContinue
                if ($sig -and $sig.SignerCertificate) { $company = $sig.SignerCertificate.Subject }
            }
        }
    }

    $riskScore = 0
    $reasons = @()
    $path = $proc.ExecutablePath
    $cmdLine = $proc.CommandLine

    # Temp folder
    $tempPaths = @($env:TEMP, $env:TMP, "$env:LOCALAPPDATA\Temp")
    if ($path) {
        foreach ($tp in $tempPaths) {
            if ($tp -and $path.StartsWith($tp, [System.StringComparison]::OrdinalIgnoreCase)) {
                $riskScore += 20; $reasons += "Running from Temp folder"; break
            }
        }
    }

    # No signer
    if (-not $company -and $path) {
        $riskScore += 10; $reasons += "No company/signer information"
    }

    # Encoded command line
    if ($cmdLine -match '(?i)-enc(odedcommand)?\s+[A-Za-z0-9+/=]{20,}') {
        $riskScore += 35; $reasons += "Encoded command line argument"
    }

    # Unusual paths
    if ($path) {
        $normalPrefixes = @("C:\Windows", "C:\Program Files", "C:\Program Files (x86)", $env:USERPROFILE)
        $isNormal = $false
        foreach ($np in $normalPrefixes) {
            if ($path.StartsWith($np, [System.StringComparison]::OrdinalIgnoreCase)) { $isNormal = $true; break }
        }
        if (-not $isNormal) { $riskScore += 15; $reasons += "Running from unusual path" }
    }

    if ($riskScore -gt 0) { $flaggedCount++ }

    $processes += @{
        name = $proc.Name
        pid = $pid_
        parentPid = $proc.ParentProcessId
        path = if ($path) { $path } else { "" }
        commandLine = if ($cmdLine) { $cmdLine } else { "" }
        company = if ($company) { $company } else { "" }
        memoryMB = $memoryMB
        cpuPercent = $cpuPercent
        riskScore = $riskScore
        reasons = @($reasons)
    }
}

@{
    processes = @($processes)
    totalProcesses = $processes.Count
    flaggedCount = $flaggedCount
} | ConvertTo-Json -Depth 5
