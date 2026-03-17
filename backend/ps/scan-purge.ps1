# Mole - Developer Purge Scanner
param(
    [string[]]$Path
)

$ErrorActionPreference = "SilentlyContinue"

$artifactPatterns = @(
    @{ name = "node_modules"; type = "Node.js" }
    @{ name = "dist"; type = "Build Output" }
    @{ name = "build"; type = "Build Output" }
    @{ name = ".next"; type = "Next.js" }
    @{ name = ".turbo"; type = "Turbo" }
    @{ name = ".cache"; type = "Cache" }
    @{ name = "out"; type = "Build Output" }
    @{ name = "__pycache__"; type = "Python" }
    @{ name = ".pytest_cache"; type = "Python Test" }
    @{ name = ".mypy_cache"; type = "Python Type Check" }
    @{ name = "bin"; type = ".NET" }
    @{ name = "obj"; type = ".NET" }
    @{ name = "target"; type = "Java/Rust" }
)

$results = @()

foreach ($scanPath in $Path) {
    if (-not (Test-Path $scanPath)) { continue }

    foreach ($pattern in $artifactPatterns) {
        $found = Get-ChildItem -Path $scanPath -Directory -Filter $pattern.name -Recurse -Depth 4 -Force -ErrorAction SilentlyContinue
        foreach ($dir in $found) {
            $files = Get-ChildItem -Path $dir.FullName -Recurse -File -Force -ErrorAction SilentlyContinue
            $size = ($files | Measure-Object -Property Length -Sum).Sum
            if ($size -gt 0) {
                $results += @{
                    path = $dir.FullName
                    type = $pattern.type
                    sizeBytes = [long]($size -as [long])
                }
            }
        }
    }
}

$results | ConvertTo-Json -Depth 3
