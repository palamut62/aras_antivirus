$procs = Get-Process | Where-Object { $_.ProcessName -match 'electron|aras' }
$results = @()
foreach ($p in $procs) {
    $results += @{
        Name = $p.ProcessName
        PID = $p.Id
        CPU_Seconds = [math]::Round($p.CPU, 1)
        RAM_MB = [math]::Round($p.WorkingSet64 / 1MB, 1)
        Threads = $p.Threads.Count
    }
}
$results | ConvertTo-Json -Depth 3
