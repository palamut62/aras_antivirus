param(
    [Parameter(Mandatory=$true)]
    [string[]]$Folders,
    [Parameter(Mandatory=$true)]
    [string]$Since
)

$ErrorActionPreference = "SilentlyContinue"

$sinceDate = [DateTime]::Parse($Since)
$events = @()

foreach ($folder in $Folders) {
    if (-not (Test-Path $folder)) { continue }

    $files = Get-ChildItem -Path $folder -Recurse -File -ErrorAction SilentlyContinue |
        Where-Object { $_.LastWriteTime -gt $sinceDate -or $_.CreationTime -gt $sinceDate }

    foreach ($f in $files) {
        $action = if ($f.CreationTime -gt $sinceDate) { "created" } else { "modified" }
        $ts = if ($action -eq "created") { $f.CreationTime } else { $f.LastWriteTime }

        $events += @{
            path = $f.FullName
            action = $action
            timestamp = $ts.ToString("o")
            extension = $f.Extension
        }
    }
}

$events = $events | Sort-Object { [DateTime]::Parse($_.timestamp) } -Descending

@{
    events = @($events)
} | ConvertTo-Json -Depth 5
