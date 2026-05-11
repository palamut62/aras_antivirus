param([string]$Action = "scan", [int]$Seconds = 30)
$ErrorActionPreference = "SilentlyContinue"

# Behavior-based detection: subscribes to Win32 process-creation events and rates
# each newly spawned process against a heuristic ruleset.
# - PowerShell with encoded command
# - Process spawned from Temp / AppData / Downloads
# - Office app spawning shell (winword.exe → cmd.exe / powershell.exe)
# - rundll32 / regsvr32 with unusual arg
# - Parent-child anomaly (browser → cmd)

$suspiciousParents = @('winword.exe','excel.exe','outlook.exe','powerpnt.exe','wmplayer.exe')
$shellChildren = @('cmd.exe','powershell.exe','pwsh.exe','wscript.exe','cscript.exe','mshta.exe','rundll32.exe','regsvr32.exe','bitsadmin.exe','certutil.exe')
$tempPrefixes = @($env:TEMP, "$env:LOCALAPPDATA\Temp", "$env:APPDATA", "$env:USERPROFILE\Downloads")

function Test-EncodedPS($cmd) {
    return ($cmd -match '(?i)-(e|en|enc|encodedcommand)\s+[A-Za-z0-9+/=]{20,}')
}
function Test-FromTemp($path) {
    if (-not $path) { return $false }
    foreach ($p in $tempPrefixes) {
        if ($p -and $path.StartsWith($p, [System.StringComparison]::OrdinalIgnoreCase)) { return $true }
    }
    return $false
}

switch ($Action) {
    "scan" {
        # Snapshot existing process tree and score each
        $procs = Get-CimInstance Win32_Process | Select-Object ProcessId, ParentProcessId, Name, ExecutablePath, CommandLine
        $byPid = @{}
        foreach ($p in $procs) { $byPid[[int]$p.ProcessId] = $p }
        $findings = @()
        foreach ($p in $procs) {
            $score = 0; $reasons = @()
            if (Test-EncodedPS $p.CommandLine) { $score += 60; $reasons += "Encoded PowerShell command" }
            if (Test-FromTemp $p.ExecutablePath) { $score += 25; $reasons += "Running from Temp/AppData" }
            $parent = $byPid[[int]$p.ParentProcessId]
            if ($parent) {
                $pn = $parent.Name.ToLower()
                $cn = $p.Name.ToLower()
                if ($suspiciousParents -contains $pn -and $shellChildren -contains $cn) {
                    $score += 80; $reasons += "Office app spawning shell ($pn -> $cn)"
                }
                if ($pn -match '^(chrome|msedge|firefox|brave)\.exe$' -and $shellChildren -contains $cn) {
                    $score += 70; $reasons += "Browser spawning shell ($pn -> $cn)"
                }
            }
            if ($p.Name -ieq 'rundll32.exe' -and $p.CommandLine -match '(?i)(javascript|http)') {
                $score += 90; $reasons += "rundll32 with JS/HTTP payload"
            }
            if ($p.Name -ieq 'regsvr32.exe' -and $p.CommandLine -match '(?i)scrobj.dll|/i:http|/s.*/u') {
                $score += 90; $reasons += "regsvr32 squiblydoo pattern"
            }
            if ($p.Name -ieq 'certutil.exe' -and $p.CommandLine -match '(?i)-urlcache|-decode|-encode') {
                $score += 70; $reasons += "certutil LOLBAS pattern"
            }
            if ($score -ge 25) {
                $findings += @{
                    pid = [int]$p.ProcessId
                    parentPid = [int]$p.ParentProcessId
                    name = $p.Name
                    parentName = if ($parent) { $parent.Name } else { "" }
                    path = $p.ExecutablePath
                    commandLine = $p.CommandLine
                    riskScore = $score
                    reasons = @($reasons)
                }
            }
        }
        $findings = $findings | Sort-Object -Property riskScore -Descending
        @{ success = $true; data = @{ findings = @($findings); total = $procs.Count; flagged = $findings.Count } } | ConvertTo-Json -Depth 6 -Compress
    }
    "watch" {
        # Live WMI event listener for $Seconds — emits one JSON object per process create.
        # The host wrapper will receive a single result, so we collect events and return them.
        $events = @()
        $endAt = (Get-Date).AddSeconds($Seconds)
        $query = "SELECT * FROM __InstanceCreationEvent WITHIN 1 WHERE TargetInstance ISA 'Win32_Process'"
        $watcher = New-Object Management.ManagementEventWatcher $query
        $watcher.Options.Timeout = [TimeSpan]::FromSeconds(2)
        while ((Get-Date) -lt $endAt) {
            try {
                $r = $watcher.WaitForNextEvent()
                $t = $r.TargetInstance
                $events += @{
                    pid = [int]$t.ProcessId
                    parentPid = [int]$t.ParentProcessId
                    name = $t.Name
                    path = $t.ExecutablePath
                    commandLine = $t.CommandLine
                    ts = (Get-Date).ToString('s')
                }
            } catch { }
        }
        $watcher.Stop()
        @{ success = $true; data = @{ events = @($events); count = $events.Count; durationSec = $Seconds } } | ConvertTo-Json -Depth 6 -Compress
    }
    default { @{ success = $false; error = "Unknown action" } | ConvertTo-Json -Compress }
}
