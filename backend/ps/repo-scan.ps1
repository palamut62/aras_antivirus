param(
    [Parameter(Mandatory=$true)]
    [string]$Path
)

$ErrorActionPreference = "SilentlyContinue"

if (-not (Test-Path $Path)) {
    @{ repoPath = $Path; findings = @(); totalFindings = 0; riskSummary = @{ high = 0; suspicious = 0; medium = 0; low = 0 }; error = "Path not found" } | ConvertTo-Json -Depth 5
    exit
}

$findings = @()

function Add-Finding {
    param([string]$File, [string]$Category, [string]$Description, [int]$RiskScore)
    $severity = switch ($true) {
        ($RiskScore -ge 70) { "high" }
        ($RiskScore -ge 50) { "suspicious" }
        ($RiskScore -ge 25) { "medium" }
        default { "low" }
    }
    $script:findings += @{
        file = $File
        category = $Category
        description = $Description
        riskScore = $RiskScore
        severity = $severity
    }
}

# 1. package.json checks
$pkgFiles = Get-ChildItem -Path $Path -Recurse -Filter "package.json" -File -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch 'node_modules' }
foreach ($pf in $pkgFiles) {
    $content = Get-Content $pf.FullName -Raw
    if ($content -match '"(preinstall|postinstall|preuninstall)"\s*:\s*"[^"]*?(curl|wget|powershell|cmd|bash\s+-c|sh\s+-c|Invoke-WebRequest|DownloadString)') {
        Add-Finding -File $pf.FullName -Category "suspicious_script" -Description "Package.json lifecycle script with suspicious command: $($Matches[0])" -RiskScore 70
    }
}

# 2. requirements.txt checks
$reqFiles = Get-ChildItem -Path $Path -Recurse -Filter "requirements.txt" -File -ErrorAction SilentlyContinue
$maliciousPatterns = @('python3-dateutil','jeIlyfish','python-binance','crypt0','httpslib','requestslib','colourslib')
foreach ($rf in $reqFiles) {
    $lines = Get-Content $rf.FullName
    foreach ($line in $lines) {
        $pkg = ($line -split '[=<>!~]')[0].Trim()
        foreach ($mp in $maliciousPatterns) {
            if ($pkg -ieq $mp) {
                Add-Finding -File $rf.FullName -Category "malicious_package" -Description "Known malicious package pattern: $pkg" -RiskScore 80
            }
        }
    }
}

# 3. .env files
$envFiles = Get-ChildItem -Path $Path -Recurse -Filter ".env*" -File -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch 'node_modules|\.git[\\/]' }
foreach ($ef in $envFiles) {
    $lines = Get-Content $ef.FullName
    foreach ($line in $lines) {
        if ($line -match '(?i)^(api[_-]?key|secret|token|password|aws_secret|database_url|private_key)\s*=\s*\S{8,}') {
            Add-Finding -File $ef.FullName -Category "exposed_secret" -Description "Exposed secret in env file: $($Matches[1])" -RiskScore 60
            break
        }
    }
}

# 4. Shell scripts
$shFiles = Get-ChildItem -Path $Path -Recurse -Include "*.sh","*.bash" -File -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch 'node_modules|\.git[\\/]' }
foreach ($sf in $shFiles) {
    $content = Get-Content $sf.FullName -Raw
    if ($content -match '(?i)(curl|wget)\s+.*\|\s*(bash|sh|python)') {
        Add-Finding -File $sf.FullName -Category "suspicious_shell" -Description "Pipe-to-shell execution pattern" -RiskScore 75
    }
    if ($content -match '(?i)(rm\s+-rf\s+/|chmod\s+777|eval\s+.*\$\()') {
        Add-Finding -File $sf.FullName -Category "suspicious_shell" -Description "Dangerous shell command detected" -RiskScore 50
    }
}

# 5. Token/API key patterns in source files
$sourceFiles = Get-ChildItem -Path $Path -Recurse -Include "*.js","*.ts","*.py","*.json","*.env","*.jsx","*.tsx" -File -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch 'node_modules|\.git[\\/]|dist[\\/]|build[\\/]|\.min\.' -and $_.Length -lt 1MB }
foreach ($sf in $sourceFiles) {
    $content = Get-Content $sf.FullName -Raw
    if (-not $content) { continue }

    # Hardcoded tokens
    $tokenPatterns = @(
        @{ pattern = 'ghp_[A-Za-z0-9_]{36}'; name = 'GitHub PAT' },
        @{ pattern = 'sk-[A-Za-z0-9]{32,}'; name = 'OpenAI API Key' },
        @{ pattern = 'AKIA[0-9A-Z]{16}'; name = 'AWS Access Key' },
        @{ pattern = 'xox[bpoas]-[0-9]{10,}-[A-Za-z0-9]+'; name = 'Slack Token' },
        @{ pattern = '[0-9]{8,}:[A-Za-z0-9_-]{35}'; name = 'Telegram Bot Token' }
    )
    foreach ($tp in $tokenPatterns) {
        if ($content -match $tp.pattern) {
            Add-Finding -File $sf.FullName -Category "hardcoded_secret" -Description "Possible $($tp.name) found" -RiskScore 65
        }
    }

    # Obfuscated code
    if ($content -match '\\x[0-9a-fA-F]{2}(\\x[0-9a-fA-F]{2}){10,}') {
        Add-Finding -File $sf.FullName -Category "obfuscation" -Description "Hex-escaped string sequence detected" -RiskScore 45
    }
    if ($content -match 'eval\s*\(\s*(atob|Buffer\.from|unescape)\s*\(') {
        Add-Finding -File $sf.FullName -Category "obfuscation" -Description "Eval with decode/unescape pattern" -RiskScore 55
    }
}

# Risk summary
$riskSummary = @{ high = 0; suspicious = 0; medium = 0; low = 0 }
foreach ($f in $findings) {
    $riskSummary[$f.severity]++
}

@{
    repoPath = $Path
    findings = @($findings)
    totalFindings = $findings.Count
    riskSummary = $riskSummary
} | ConvertTo-Json -Depth 5
