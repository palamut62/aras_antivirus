param(
    [string]$Action = "list",
    [int]$ProcessId = 0,
    [int[]]$Ports = @(),
    [int]$ScanFrom = 3000,
    [int]$ScanTo = 9300
)
$ErrorActionPreference = "SilentlyContinue"

# Known dev server signatures: name pattern + cmdline pattern => kind
$signatures = @(
    @{ Kind = 'vite';            NameRe = 'node';   CmdRe = 'vite' },
    @{ Kind = 'next';            NameRe = 'node';   CmdRe = 'next(?:[\\\/-]| dev| start)' },
    @{ Kind = 'webpack-dev';     NameRe = 'node';   CmdRe = 'webpack(-dev-server|-cli serve| serve)' },
    @{ Kind = 'nodemon';         NameRe = 'node';   CmdRe = 'nodemon' },
    @{ Kind = 'ts-node';         NameRe = 'node';   CmdRe = 'ts-node|tsx ' },
    @{ Kind = 'cra';             NameRe = 'node';   CmdRe = 'react-scripts (start|build)' },
    @{ Kind = 'remix';           NameRe = 'node';   CmdRe = 'remix dev' },
    @{ Kind = 'astro';           NameRe = 'node';   CmdRe = 'astro (dev|preview)' },
    @{ Kind = 'svelte-kit';      NameRe = 'node';   CmdRe = 'svelte-kit|vite.*svelte' },
    @{ Kind = 'angular';         NameRe = 'node';   CmdRe = 'ng (serve|build)' },
    @{ Kind = 'gatsby';          NameRe = 'node';   CmdRe = 'gatsby (develop|serve)' },
    @{ Kind = 'storybook';       NameRe = 'node';   CmdRe = 'storybook' },
    @{ Kind = 'expo';            NameRe = 'node';   CmdRe = 'expo (start|run)' },
    @{ Kind = 'metro';           NameRe = 'node';   CmdRe = 'metro' },
    @{ Kind = 'electron-dev';    NameRe = 'electron'; CmdRe = '.' },
    @{ Kind = 'tsc-watch';       NameRe = 'node';   CmdRe = 'tsc.*--watch' },
    @{ Kind = 'http-server';     NameRe = 'node';   CmdRe = 'http-server|serve\s|live-server' },
    @{ Kind = 'python-http';     NameRe = 'python'; CmdRe = '-m\s+http\.server|SimpleHTTPServer|uvicorn|gunicorn|flask|django.*runserver' },
    @{ Kind = 'dotnet-watch';    NameRe = 'dotnet'; CmdRe = 'watch (run|test)' },
    @{ Kind = 'rails';           NameRe = 'ruby';   CmdRe = 'rails (s|server)' },
    @{ Kind = 'go-run';          NameRe = 'go';     CmdRe = 'run\s' },
    @{ Kind = 'cargo-run';       NameRe = 'cargo';  CmdRe = 'run|watch' },
    @{ Kind = 'php-built-in';    NameRe = 'php';    CmdRe = '-S\s' },
    @{ Kind = 'bun-dev';         NameRe = 'bun';    CmdRe = 'dev|--hot|run dev' },
    @{ Kind = 'deno-run';        NameRe = 'deno';   CmdRe = 'run|task dev' }
)

function Get-DevProcesses {
    $wmi = Get-CimInstance Win32_Process | Where-Object {
        $_.Name -match '^(node|electron|python|pythonw|dotnet|ruby|go|cargo|php|bun|deno)\.exe$'
    }
    $tcpListening = @{}
    try {
        Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | ForEach-Object {
            if (-not $tcpListening.ContainsKey([int]$_.OwningProcess)) {
                $tcpListening[[int]$_.OwningProcess] = @()
            }
            $tcpListening[[int]$_.OwningProcess] += [int]$_.LocalPort
        }
    } catch {}

    $list = @()
    foreach ($p in $wmi) {
        $kind = $null
        $cmd = if ($p.CommandLine) { $p.CommandLine } else { "" }
        foreach ($s in $signatures) {
            if ($p.Name -match $s.NameRe -and $cmd -match $s.CmdRe) { $kind = $s.Kind; break }
        }
        if (-not $kind) { continue }
        $ports = if ($tcpListening.ContainsKey([int]$p.ProcessId)) { @($tcpListening[[int]$p.ProcessId] | Sort-Object -Unique) } else { @() }
        $sysProc = Get-Process -Id $p.ProcessId -ErrorAction SilentlyContinue
        $memMB = if ($sysProc) { [Math]::Round($sysProc.WorkingSet64 / 1MB, 1) } else { 0 }
        $cwd = ""
        try {
            $h = (Get-Process -Id $p.ProcessId).MainModule.FileName
            if ($h) { $cwd = Split-Path $h -Parent }
        } catch {}
        $list += @{
            pid = [int]$p.ProcessId
            parentPid = [int]$p.ParentProcessId
            name = $p.Name
            kind = $kind
            commandLine = $cmd
            cwd = $cwd
            ports = @($ports)
            memoryMB = $memMB
        }
    }
    return ,$list
}

switch ($Action) {
    "list" {
        $procs = Get-DevProcesses
        @{ success = $true; data = @{ servers = @($procs); count = $procs.Count } } | ConvertTo-Json -Depth 6 -Compress
    }
    "kill" {
        if ($ProcessId -le 0) {
            @{ success = $false; error = "ProcessId required" } | ConvertTo-Json -Compress
            return
        }
        try {
            Stop-Process -Id $ProcessId -Force -ErrorAction Stop
            @{ success = $true; data = @{ pid = $ProcessId } } | ConvertTo-Json -Compress
        } catch {
            @{ success = $false; error = $_.Exception.Message } | ConvertTo-Json -Compress
        }
    }
    "kill-all" {
        $procs = Get-DevProcesses
        $killed = @(); $failed = @()
        foreach ($p in $procs) {
            try { Stop-Process -Id $p.pid -Force -ErrorAction Stop; $killed += $p.pid }
            catch { $failed += @{ pid = $p.pid; error = $_.Exception.Message } }
        }
        @{ success = $true; data = @{ killed = @($killed); failed = @($failed) } } | ConvertTo-Json -Depth 5 -Compress
    }
    "scan-ports" {
        $targets = if ($Ports.Count -gt 0) {
            $Ports
        } else {
            @(3000,3001,3002,3030,4000,4200,4321,5000,5001,5173,5174,5500,5555,6006,7000,7777,8000,8001,8080,8081,8088,8443,8888,9000,9090,9229,9292,9300,1313)
        }
        $found = @()
        $listening = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue
        foreach ($port in $targets) {
            $conn = $listening | Where-Object { $_.LocalPort -eq $port } | Select-Object -First 1
            if ($conn) {
                $proc = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
                $cim = Get-CimInstance Win32_Process -Filter "ProcessId=$($conn.OwningProcess)" -ErrorAction SilentlyContinue
                $found += @{
                    port = $port
                    pid = [int]$conn.OwningProcess
                    processName = if ($proc) { $proc.ProcessName } else { "unknown" }
                    commandLine = if ($cim) { $cim.CommandLine } else { "" }
                    address = $conn.LocalAddress
                }
            }
        }
        @{ success = $true; data = @{ ports = @($found); scanned = $targets.Count } } | ConvertTo-Json -Depth 5 -Compress
    }
    default {
        @{ success = $false; error = "Unknown action: $Action" } | ConvertTo-Json -Compress
    }
}
