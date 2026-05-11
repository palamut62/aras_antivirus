$ErrorActionPreference = "SilentlyContinue"
$procs = Get-CimInstance Win32_Process | Select-Object ProcessId, ParentProcessId, Name, ExecutablePath, CommandLine, CreationDate
$out = @()
foreach ($p in $procs) {
    $sys = Get-Process -Id $p.ProcessId -ErrorAction SilentlyContinue
    $mem = if ($sys) { [Math]::Round($sys.WorkingSet64 / 1MB, 1) } else { 0 }
    $out += @{
        pid = [int]$p.ProcessId
        parentPid = [int]$p.ParentProcessId
        name = $p.Name
        path = if ($p.ExecutablePath) { $p.ExecutablePath } else { "" }
        memoryMB = $mem
    }
}
@{ success = $true; data = @{ processes = @($out); count = $out.Count } } | ConvertTo-Json -Depth 5 -Compress
