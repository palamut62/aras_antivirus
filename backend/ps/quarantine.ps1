param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("list","add","restore","delete")]
    [string]$Action,
    [string]$FilePath,
    [string]$QuarantineId
)

$ErrorActionPreference = "SilentlyContinue"
$quarantineDir = Join-Path $env:LOCALAPPDATA "Mole\quarantine"

if (-not (Test-Path $quarantineDir)) {
    New-Item -ItemType Directory -Path $quarantineDir -Force | Out-Null
}

function New-QuarantineId {
    return [guid]::NewGuid().ToString("N").Substring(0, 12)
}

switch ($Action) {
    "list" {
        $items = @()
        $metaFiles = Get-ChildItem -Path $quarantineDir -Filter "*.meta.json" -ErrorAction SilentlyContinue
        foreach ($mf in $metaFiles) {
            $meta = Get-Content $mf.FullName -Raw | ConvertFrom-Json
            $qFile = Join-Path $quarantineDir "$($meta.quarantineId).quarantine"
            $items += @{
                quarantineId = $meta.quarantineId
                originalPath = $meta.originalPath
                fileName = $meta.fileName
                sizeBytes = $meta.sizeBytes
                quarantinedAt = $meta.quarantinedAt
                sha256 = $meta.sha256
                exists = (Test-Path $qFile)
            }
        }
        @{ action = "list"; items = @($items); count = $items.Count } | ConvertTo-Json -Depth 5
    }
    "add" {
        if (-not $FilePath -or -not (Test-Path $FilePath)) {
            @{ action = "add"; success = $false; error = "File not found: $FilePath" } | ConvertTo-Json -Depth 5
            exit
        }
        $id = New-QuarantineId
        $fileInfo = Get-Item $FilePath
        $hash = (Get-FileHash -Path $FilePath -Algorithm SHA256).Hash

        $meta = @{
            quarantineId = $id
            originalPath = $fileInfo.FullName
            fileName = $fileInfo.Name
            sizeBytes = $fileInfo.Length
            sha256 = $hash
            quarantinedAt = (Get-Date -Format "o")
        }

        $qFilePath = Join-Path $quarantineDir "$id.quarantine"
        $metaPath = Join-Path $quarantineDir "$id.meta.json"

        Move-Item -Path $FilePath -Destination $qFilePath -Force
        $meta | ConvertTo-Json -Depth 3 | Set-Content -Path $metaPath -Encoding UTF8

        @{ action = "add"; success = $true; quarantineId = $id; originalPath = $fileInfo.FullName } | ConvertTo-Json -Depth 5
    }
    "restore" {
        if (-not $QuarantineId) {
            @{ action = "restore"; success = $false; error = "QuarantineId required" } | ConvertTo-Json -Depth 5
            exit
        }
        $metaPath = Join-Path $quarantineDir "$QuarantineId.meta.json"
        $qFilePath = Join-Path $quarantineDir "$QuarantineId.quarantine"

        if (-not (Test-Path $metaPath)) {
            @{ action = "restore"; success = $false; error = "Quarantine entry not found" } | ConvertTo-Json -Depth 5
            exit
        }

        $meta = Get-Content $metaPath -Raw | ConvertFrom-Json
        $restorePath = $meta.originalPath
        $restoreDir = Split-Path $restorePath -Parent
        if (-not (Test-Path $restoreDir)) { New-Item -ItemType Directory -Path $restoreDir -Force | Out-Null }

        Move-Item -Path $qFilePath -Destination $restorePath -Force
        Remove-Item -Path $metaPath -Force

        @{ action = "restore"; success = $true; restoredTo = $restorePath; quarantineId = $QuarantineId } | ConvertTo-Json -Depth 5
    }
    "delete" {
        if (-not $QuarantineId) {
            @{ action = "delete"; success = $false; error = "QuarantineId required" } | ConvertTo-Json -Depth 5
            exit
        }
        $metaPath = Join-Path $quarantineDir "$QuarantineId.meta.json"
        $qFilePath = Join-Path $quarantineDir "$QuarantineId.quarantine"

        if (-not (Test-Path $metaPath)) {
            @{ action = "delete"; success = $false; error = "Quarantine entry not found" } | ConvertTo-Json -Depth 5
            exit
        }

        Remove-Item -Path $qFilePath -Force -ErrorAction SilentlyContinue
        Remove-Item -Path $metaPath -Force

        @{ action = "delete"; success = $true; quarantineId = $QuarantineId } | ConvertTo-Json -Depth 5
    }
}
