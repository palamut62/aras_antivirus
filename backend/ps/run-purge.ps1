# Mole - Developer Purge Execute
param(
    [string[]]$Target
)

$ErrorActionPreference = "SilentlyContinue"
$totalFreed = 0
$totalItems = 0
$errors = @()

foreach ($t in $Target) {
    if (-not (Test-Path $t)) {
        $errors += "$t : not found"
        continue
    }

    $files = Get-ChildItem -Path $t -Recurse -File -Force -ErrorAction SilentlyContinue
    $size = ($files | Measure-Object -Property Length -Sum).Sum
    $count = ($files | Measure-Object).Count

    try {
        Remove-Item -Path $t -Recurse -Force -ErrorAction Stop
        $totalFreed += [long]($size -as [long])
        $totalItems += $count
    } catch {
        $errors += "$t : $($_.Exception.Message)"
    }
}

@{
    sizeFreed = [long]$totalFreed
    itemCount = $totalItems
    errors = $errors
} | ConvertTo-Json -Depth 3
