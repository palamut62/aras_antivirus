param(
    [string]$Action = "list",
    [int[]]$Pids = @()
)
$ErrorActionPreference = "SilentlyContinue"

$editorNames = @('Code', 'Code - Insiders', 'Cursor', 'Windsurf', 'Trae', 'Zed')
$editorExeRe = '(Code\.exe|Cursor\.exe|Windsurf\.exe|Trae\.exe|Zed\.exe)$'

function Test-WindowOpen($parentPid) {
    # If any visible top-level window exists for the parent process, treat session as alive
    try {
        $procs = Get-Process -Id $parentPid -ErrorAction SilentlyContinue
        if (-not $procs) { return $false }
        return ($procs.MainWindowHandle -ne 0)
    } catch { return $false }
}

function Get-EditorOrphans {
    $wmi = Get-CimInstance Win32_Process | Where-Object {
        $_.Name -match '^(Code|Cursor|Windsurf|Trae|Zed)\.exe$' -or
        ($_.CommandLine -and $_.CommandLine -match $editorExeRe)
    }
    # Group by root parent: a chain of editor processes share an ancestor with MainWindow
    $byId = @{}
    foreach ($p in $wmi) { $byId[[int]$p.ProcessId] = $p }
    $orphans = @(); $alive = @()
    foreach ($p in $wmi) {
        $root = $p
        $hops = 0
        while ($byId.ContainsKey([int]$root.ParentProcessId) -and $hops -lt 10) {
            $root = $byId[[int]$root.ParentProcessId]
            $hops++
        }
        $hasWindow = Test-WindowOpen $root.ProcessId
        $sysProc = Get-Process -Id $p.ProcessId -ErrorAction SilentlyContinue
        $memMB = if ($sysProc) { [Math]::Round($sysProc.WorkingSet64 / 1MB, 1) } else { 0 }
        $entry = @{
            pid = [int]$p.ProcessId
            parentPid = [int]$p.ParentProcessId
            rootPid = [int]$root.ProcessId
            name = $p.Name
            commandLine = if ($p.CommandLine) { $p.CommandLine } else { "" }
            memoryMB = $memMB
            rootHasWindow = $hasWindow
        }
        if ($hasWindow) { $alive += $entry } else { $orphans += $entry }
    }
    return @{ orphans = @($orphans); alive = @($alive) }
}

switch ($Action) {
    "list" {
        $r = Get-EditorOrphans
        $totalMem = ($r.orphans | Measure-Object -Property memoryMB -Sum).Sum
        @{ success = $true; data = @{ orphans = @($r.orphans); alive = @($r.alive); orphanCount = $r.orphans.Count; orphanMemoryMB = $totalMem } } | ConvertTo-Json -Depth 6 -Compress
    }
    "kill" {
        if ($Pids.Count -eq 0) { @{ success = $false; error = "No pids" } | ConvertTo-Json -Compress; return }
        $killed = @(); $failed = @()
        foreach ($p in $Pids) {
            try { Stop-Process -Id $p -Force -ErrorAction Stop; $killed += $p }
            catch { $failed += @{ pid = $p; error = $_.Exception.Message } }
        }
        @{ success = $true; data = @{ killed = @($killed); failed = @($failed) } } | ConvertTo-Json -Depth 5 -Compress
    }
    "kill-all-orphans" {
        $r = Get-EditorOrphans
        $killed = @(); $failed = @()
        foreach ($o in $r.orphans) {
            try { Stop-Process -Id $o.pid -Force -ErrorAction Stop; $killed += $o.pid }
            catch { $failed += @{ pid = $o.pid; error = $_.Exception.Message } }
        }
        @{ success = $true; data = @{ killed = @($killed); failed = @($failed) } } | ConvertTo-Json -Depth 5 -Compress
    }
    default { @{ success = $false; error = "Unknown action" } | ConvertTo-Json -Compress }
}
