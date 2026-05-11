param(
    [string]$Action = "scan",
    [string[]]$Roots = @(),
    [int]$MaxFileKB = 512
)
$ErrorActionPreference = "SilentlyContinue"

$patterns = @(
    @{ Name = "GitHub PAT";      Regex = 'ghp_[A-Za-z0-9]{36}' },
    @{ Name = "GitHub Fine PAT"; Regex = 'github_pat_[A-Za-z0-9_]{82}' },
    @{ Name = "GitHub OAuth";    Regex = 'gho_[A-Za-z0-9]{36}' },
    @{ Name = "AWS Access Key";  Regex = 'AKIA[0-9A-Z]{16}' },
    @{ Name = "AWS Secret Key";  Regex = '(?i)aws(.{0,20})?(secret|key)["\s:=]+[A-Za-z0-9/+=]{40}' },
    @{ Name = "Slack Token";     Regex = 'xox[abprs]-[A-Za-z0-9-]{10,}' },
    @{ Name = "Slack Webhook";   Regex = 'https://hooks\.slack\.com/services/T[A-Z0-9]+/B[A-Z0-9]+/[A-Za-z0-9]+' },
    @{ Name = "Google API Key";  Regex = 'AIza[0-9A-Za-z\-_]{35}' },
    @{ Name = "Stripe Secret";   Regex = 'sk_(live|test)_[0-9a-zA-Z]{24,}' },
    @{ Name = "Stripe Restricted"; Regex = 'rk_(live|test)_[0-9a-zA-Z]{24,}' },
    @{ Name = "OpenAI Key";      Regex = 'sk-(?:proj-)?[A-Za-z0-9_\-]{20,}' },
    @{ Name = "Anthropic Key";   Regex = 'sk-ant-[A-Za-z0-9_\-]{20,}' },
    @{ Name = "Twilio";          Regex = 'SK[0-9a-fA-F]{32}' },
    @{ Name = "SendGrid";        Regex = 'SG\.[A-Za-z0-9_\-]{22}\.[A-Za-z0-9_\-]{43}' },
    @{ Name = "JWT";             Regex = 'eyJ[A-Za-z0-9_\-]{10,}\.eyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}' },
    @{ Name = "Private Key PEM"; Regex = '-----BEGIN ((RSA|EC|DSA|OPENSSH|PGP) )?PRIVATE KEY-----' },
    @{ Name = "Generic Password"; Regex = '(?i)(password|passwd|pwd)\s*[:=]\s*["''][^"''\s]{6,}["'']' },
    @{ Name = "Connection String"; Regex = '(?i)(mongodb|postgres|mysql|redis|amqp)(\+srv)?:\/\/[^\s"''<>]{8,}' }
)

$targetFiles = @('.env', '.env.local', '.env.production', '.env.development', '.env.staging', '.envrc', 'config.json', 'secrets.json', 'credentials', 'config.yml', 'config.yaml', 'application.properties', 'appsettings.json', 'docker-compose.yml', 'docker-compose.yaml')
$extPattern = '\.(env|envrc|json|yml|yaml|properties|conf|config|ini|toml|sh|ps1|py|js|ts|tsx|jsx|rb|go|java|cs|php|env\..+)$'

$skipDirs = @('node_modules', '.git', 'dist', 'build', '.next', '.turbo', '__pycache__', 'vendor', 'target', 'bin', 'obj', '.venv', 'venv', '.cache', 'coverage')

switch ($Action) {
    "scan" {
        if ($Roots.Count -eq 0) {
            $Roots = @("$env:USERPROFILE\Projects", "$env:USERPROFILE\Documents\Projects", "$env:USERPROFILE\source\repos", "$env:USERPROFILE\dev", "$env:USERPROFILE\code")
            $Roots = $Roots | Where-Object { Test-Path $_ }
        }
        $findings = @()
        $filesScanned = 0
        foreach ($root in $Roots) {
            if (-not (Test-Path $root)) { continue }
            Get-ChildItem -LiteralPath $root -Recurse -File -Force -ErrorAction SilentlyContinue | ForEach-Object {
                $f = $_
                # skip dir
                $skip = $false
                foreach ($sd in $skipDirs) { if ($f.FullName -match ("\\" + [regex]::Escape($sd) + "\\")) { $skip = $true; break } }
                if ($skip) { return }
                if ($f.Length -gt ($MaxFileKB * 1024)) { return }
                $nameMatch = $targetFiles -contains $f.Name -or $f.Name -match '^\.env'
                $extMatch = $f.Name -match $extPattern
                if (-not ($nameMatch -or $extMatch)) { return }
                $filesScanned++
                try {
                    $content = Get-Content -LiteralPath $f.FullName -Raw -ErrorAction Stop
                } catch { return }
                if (-not $content) { return }
                foreach ($p in $patterns) {
                    $m = [regex]::Matches($content, $p.Regex)
                    if ($m.Count -gt 0) {
                        foreach ($match in $m) {
                            $idx = $match.Index
                            $before = $content.Substring(0, $idx)
                            $line = ($before -split "`n").Count
                            $snippet = $match.Value
                            if ($snippet.Length -gt 80) { $snippet = $snippet.Substring(0,40) + "..." + $snippet.Substring($snippet.Length-10) }
                            $findings += @{
                                file = $f.FullName
                                project = (Split-Path $f.FullName -Parent)
                                pattern = $p.Name
                                line = $line
                                snippet = $snippet
                            }
                        }
                    }
                }
            }
        }
        @{ success = $true; data = @{ findings = @($findings); filesScanned = $filesScanned; count = $findings.Count } } | ConvertTo-Json -Depth 6 -Compress
    }
    default { @{ success = $false; error = "Unknown action" } | ConvertTo-Json -Compress }
}
