param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("active-connections","dns-cache","suspicious-connections","block-ip","kill-connection","unblock-ip","blocked-list")]
    [string]$Action,
    [string]$RemoteAddress,
    [int]$ProcessId = 0,
    [string]$RuleName
)

$ErrorActionPreference = "SilentlyContinue"
$startTime = Get-Date

# Normal ports that are expected
$normalPorts = @(80, 443, 53, 8080, 8443, 3000, 3001, 5000, 5173, 5174, 4200, 8000, 8888, 9000, 9229, 9222)
# Dev tool process names to reduce false positives
$devProcesses = @("node","python","python3","pythonw","pip","git","code","devenv","idea64","webstorm64","pycharm64","rider64","dotnet","cargo","rustc","gcc","java","javaw","gradle","electron","docker","kubectl","terraform","ngrok","hugo")
# Suspicious DNS patterns
$suspiciousDnsPatterns = @(
    @{ pattern = "^[a-z0-9]{20,}\.(com|net|org|xyz|top|info|tk|ml|ga|cf|gq)$"; reason = "Random-looking domain (possible DGA)" },
    @{ pattern = "mining|coinhive|cryptonight|xmrig|minexmr|nanopool\.org|2miners|ethermine|hashvault"; reason = "Crypto mining pool" },
    @{ pattern = "c2\.|command-control|beacon\.|payload\.|shell\.|reverse\.|rat\.|trojan\."; reason = "Possible C2 domain pattern" },
    @{ pattern = "\.(tk|ml|ga|cf|gq)$"; reason = "Free TLD often used for malware" },
    @{ pattern = "pastebin\.com|paste\.ee|hastebin|ghostbin|rentry\.co"; reason = "Paste site (sometimes used for C2)" }
)
# Suspicious remote ports
$suspiciousRemotePorts = @(
    @{ port = 4444; reason = "Metasploit default" },
    @{ port = 5555; reason = "Android ADB / common backdoor" },
    @{ port = 1337; reason = "Common backdoor port" },
    @{ port = 31337; reason = "Back Orifice" },
    @{ port = 6666; reason = "Common IRC/backdoor" },
    @{ port = 6667; reason = "IRC (sometimes C2)" },
    @{ port = 9999; reason = "Common backdoor" },
    @{ port = 12345; reason = "NetBus trojan" },
    @{ port = 65535; reason = "Suspicious high port" }
)

function Get-ProcessInfoCached {
    if (-not $script:processCache) {
        $script:processCache = @{}
        Get-Process -ErrorAction SilentlyContinue | ForEach-Object {
            $script:processCache[$_.Id] = @{
                name = $_.ProcessName
                path = $_.Path
            }
        }
    }
    return $script:processCache
}

function Test-ConnectionSuspicious {
    param($conn, $procInfo)

    $risk = 0
    $reasons = @()
    $procName = $procInfo.name
    $procPath = $procInfo.path

    # Skip loopback
    if ($conn.RemoteAddress -match "^(127\.|::1|0\.0\.0\.0)") { return $null }

    # Process from temp folder
    if ($procPath -and $procPath -match "\\Temp\\|\\tmp\\|\\AppData\\Local\\Temp\\") {
        $isDev = $false
        foreach ($dp in $devProcesses) {
            if ($procName -eq $dp) { $isDev = $true; break }
        }
        if (-not $isDev) {
            $risk += 40
            $reasons += "Process running from temp directory"
        }
    }

    # Check remote port
    $remotePort = $conn.RemotePort
    foreach ($sp in $suspiciousRemotePorts) {
        if ($remotePort -eq $sp.port) {
            $risk += 35
            $reasons += "Connection to suspicious port $($sp.port): $($sp.reason)"
            break
        }
    }

    # Unusual port (not in normal list) from non-dev process
    if ($remotePort -notin $normalPorts -and $remotePort -gt 0) {
        $isDev = $procName -in $devProcesses
        if (-not $isDev -and $remotePort -notin @(22, 21, 25, 110, 143, 993, 995, 587, 465, 3306, 5432, 27017, 6379)) {
            $risk += 10
            $reasons += "Unusual remote port: $remotePort"
        }
    }

    # Unknown process (no path)
    if (-not $procPath -and $procName -and $procName -notin @("System","Idle","svchost","services","lsass","csrss","wininit","smss","Registry")) {
        $risk += 15
        $reasons += "Process path unknown"
    }

    $risk = [math]::Min(100, $risk)
    if ($risk -eq 0 -and $reasons.Count -eq 0) { return $null }

    return @{
        risk = $risk
        reasons = $reasons
    }
}

function Invoke-ActiveConnections {
    $procCache = Get-ProcessInfoCached
    $connections = Get-NetTCPConnection -State Established, Listen, SynSent, SynReceived, CloseWait -ErrorAction SilentlyContinue

    $results = @()
    $flagged = 0

    foreach ($conn in $connections) {
        # Skip loopback listeners
        if ($conn.State -eq "Listen") { continue }
        if ($conn.RemoteAddress -match "^(127\.|::1|0\.0\.0\.0|::$)") { continue }

        $proc = $procCache[[int]$conn.OwningProcess]
        if (-not $proc) { $proc = @{ name = "Unknown (PID $($conn.OwningProcess))"; path = $null } }

        $suspicion = Test-ConnectionSuspicious -conn $conn -procInfo $proc

        $entry = @{
            localAddress = $conn.LocalAddress
            localPort = $conn.LocalPort
            remoteAddress = $conn.RemoteAddress
            remotePort = $conn.RemotePort
            state = $conn.State.ToString()
            pid = $conn.OwningProcess
            processName = $proc.name
            processPath = $proc.path
            riskScore = if ($suspicion) { $suspicion.risk } else { 0 }
            reasons = if ($suspicion) { $suspicion.reasons } else { @() }
        }

        if ($suspicion -and $suspicion.risk -gt 0) { $flagged++ }
        $results += $entry
    }

    $results = $results | Sort-Object { $_.riskScore } -Descending
    $elapsed = ((Get-Date) - $startTime).TotalMilliseconds
    return @{
        action = "active-connections"
        connections = $results
        totalConnections = $results.Count
        flaggedCount = $flagged
    }
}

function Invoke-DnsCache {
    $results = @()
    $dnsEntries = Get-DnsClientCache -ErrorAction SilentlyContinue

    foreach ($entry in $dnsEntries) {
        $domain = $entry.Entry.ToLower()
        $risk = 0
        $reasons = @()

        foreach ($sp in $suspiciousDnsPatterns) {
            if ($domain -match $sp.pattern) {
                $risk += 30
                $reasons += $sp.reason
            }
        }

        # Very long subdomain (entropy-based DGA detection simplified)
        $parts = $domain.Split('.')
        if ($parts.Count -ge 2) {
            $subdomain = $parts[0]
            if ($subdomain.Length -gt 25) {
                $risk += 20
                $reasons += "Very long subdomain ($($subdomain.Length) chars)"
            }
            # Check for high digit ratio (DGA indicator)
            $digitCount = ($subdomain.ToCharArray() | Where-Object { [char]::IsDigit($_) }).Count
            if ($subdomain.Length -gt 10 -and ($digitCount / $subdomain.Length) -gt 0.5) {
                $risk += 25
                $reasons += "High digit ratio in subdomain (possible DGA)"
            }
        }

        $risk = [math]::Min(100, $risk)
        if ($risk -gt 0) {
            $results += @{
                domain = $entry.Entry
                recordType = $entry.Type.ToString()
                ttl = $entry.TimeToLive
                data = $entry.Data
                riskScore = $risk
                reasons = $reasons
            }
        }
    }

    $results = $results | Sort-Object { $_.riskScore } -Descending
    $elapsed = ((Get-Date) - $startTime).TotalMilliseconds
    return @{
        action = "dns-cache"
        connections = $results
        totalConnections = ($dnsEntries | Measure-Object).Count
        flaggedCount = $results.Count
    }
}

function Invoke-SuspiciousConnections {
    $connResult = Invoke-ActiveConnections
    $dnsResult = Invoke-DnsCache

    $flaggedConns = $connResult.connections | Where-Object { $_.riskScore -gt 0 }
    $flaggedDns = $dnsResult.connections | Where-Object { $_.riskScore -gt 0 }

    $combined = @()
    foreach ($c in $flaggedConns) {
        $c["type"] = "connection"
        $combined += $c
    }
    foreach ($d in $flaggedDns) {
        $d["type"] = "dns"
        $combined += $d
    }

    $combined = $combined | Sort-Object { $_.riskScore } -Descending
    $elapsed = ((Get-Date) - $startTime).TotalMilliseconds
    return @{
        action = "suspicious-connections"
        connections = $combined
        totalConnections = $connResult.totalConnections + $dnsResult.totalConnections
        flaggedCount = $combined.Count
    }
}

function Invoke-BlockIP {
    if (-not $RemoteAddress) { return @{ success = $false; error = "RemoteAddress required" } }
    $name = "ArasAV_Block_$($RemoteAddress -replace '[:\.]','_')"
    try {
        # Remove existing rule with same name
        Remove-NetFirewallRule -DisplayName $name -ErrorAction SilentlyContinue
        # Block outbound
        New-NetFirewallRule -DisplayName $name -Direction Outbound -Action Block -RemoteAddress $RemoteAddress -Protocol Any -ErrorAction Stop | Out-Null
        # Block inbound
        New-NetFirewallRule -DisplayName "${name}_In" -Direction Inbound -Action Block -RemoteAddress $RemoteAddress -Protocol Any -ErrorAction Stop | Out-Null
        return @{ success = $true; action = "block-ip"; remoteAddress = $RemoteAddress; ruleName = $name }
    } catch {
        return @{ success = $false; error = $_.Exception.Message }
    }
}

function Invoke-KillConnection {
    $killed = @()
    if ($ProcessId -gt 0) {
        try {
            Stop-Process -Id $ProcessId -Force -ErrorAction Stop
            $killed += $ProcessId
        } catch {
            return @{ success = $false; error = "PID $ProcessId kill failed: $($_.Exception.Message)" }
        }
    }
    if ($RemoteAddress) {
        # Kill all processes connected to this remote address
        $conns = Get-NetTCPConnection -RemoteAddress $RemoteAddress -ErrorAction SilentlyContinue
        foreach ($c in $conns) {
            if ($c.OwningProcess -gt 4 -and $c.OwningProcess -notin $killed) {
                try {
                    Stop-Process -Id $c.OwningProcess -Force -ErrorAction Stop
                    $killed += $c.OwningProcess
                } catch {}
            }
        }
    }
    return @{ success = $true; action = "kill-connection"; killedPids = $killed; count = $killed.Count }
}

function Invoke-UnblockIP {
    if (-not $RuleName -and -not $RemoteAddress) { return @{ success = $false; error = "RuleName or RemoteAddress required" } }
    $name = if ($RuleName) { $RuleName } else { "ArasAV_Block_$($RemoteAddress -replace '[:\.]','_')" }
    try {
        Remove-NetFirewallRule -DisplayName $name -ErrorAction SilentlyContinue
        Remove-NetFirewallRule -DisplayName "${name}_In" -ErrorAction SilentlyContinue
        return @{ success = $true; action = "unblock-ip"; ruleName = $name }
    } catch {
        return @{ success = $false; error = $_.Exception.Message }
    }
}

function Invoke-BlockedList {
    $rules = Get-NetFirewallRule -DisplayName "ArasAV_Block_*" -ErrorAction SilentlyContinue
    $results = @()
    foreach ($r in $rules) {
        if ($r.DisplayName -match "_In$") { continue } # Skip inbound duplicates
        $addrFilter = $r | Get-NetFirewallAddressFilter -ErrorAction SilentlyContinue
        $results += @{
            ruleName = $r.DisplayName
            remoteAddress = $addrFilter.RemoteAddress
            direction = $r.Direction.ToString()
            enabled = $r.Enabled.ToString()
            createdAt = $r.CreationClassName
        }
    }
    return @{ action = "blocked-list"; rules = $results; count = $results.Count }
}

# Execute
$output = switch ($Action) {
    "active-connections"      { Invoke-ActiveConnections }
    "dns-cache"               { Invoke-DnsCache }
    "suspicious-connections"  { Invoke-SuspiciousConnections }
    "block-ip"                { Invoke-BlockIP }
    "kill-connection"         { Invoke-KillConnection }
    "unblock-ip"              { Invoke-UnblockIP }
    "blocked-list"            { Invoke-BlockedList }
}

$output | ConvertTo-Json -Depth 5 -Compress
