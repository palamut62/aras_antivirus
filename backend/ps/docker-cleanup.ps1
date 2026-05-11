param(
    [string]$Action = "status"
)
$ErrorActionPreference = "SilentlyContinue"

function Test-Docker { return [bool](Get-Command docker -ErrorAction SilentlyContinue) }

function Invoke-DockerJson($args_) {
    try {
        $out = & docker @args_ 2>$null
        return $out
    } catch { return $null }
}

if (-not (Test-Docker)) {
    @{ success = $false; error = "Docker CLI not found"; data = @{ available = $false } } | ConvertTo-Json -Compress
    return
}

# Check daemon
$ping = & docker info --format '{{.ServerVersion}}' 2>$null
if (-not $ping) {
    @{ success = $false; error = "Docker daemon not running"; data = @{ available = $true; running = $false } } | ConvertTo-Json -Compress
    return
}

switch ($Action) {
    "status" {
        $containers = @()
        $imageLines = & docker images --format '{{.Repository}}:{{.Tag}}|{{.ID}}|{{.Size}}|{{.CreatedSince}}' 2>$null
        $containerLines = & docker ps -a --format '{{.Names}}|{{.ID}}|{{.Image}}|{{.Status}}|{{.Size}}' 2>$null
        $volumeLines = & docker volume ls --format '{{.Name}}|{{.Driver}}' 2>$null
        $diskRaw = & docker system df --format '{{.Type}}|{{.TotalCount}}|{{.Active}}|{{.Size}}|{{.Reclaimable}}' 2>$null

        $images = @(); $cnts = @(); $vols = @(); $df = @()
        if ($imageLines) { foreach ($l in $imageLines) { $p = $l -split '\|'; if ($p.Count -ge 4) { $images += @{ repo = $p[0]; id = $p[1]; size = $p[2]; created = $p[3] } } } }
        if ($containerLines) { foreach ($l in $containerLines) { $p = $l -split '\|'; if ($p.Count -ge 4) { $cnts += @{ name = $p[0]; id = $p[1]; image = $p[2]; status = $p[3]; size = if ($p.Count -ge 5) { $p[4] } else { "" } } } } }
        if ($volumeLines) { foreach ($l in $volumeLines) { $p = $l -split '\|'; if ($p.Count -ge 2) { $vols += @{ name = $p[0]; driver = $p[1] } } } }
        if ($diskRaw) { foreach ($l in $diskRaw) { $p = $l -split '\|'; if ($p.Count -ge 5) { $df += @{ type = $p[0]; total = $p[1]; active = $p[2]; size = $p[3]; reclaimable = $p[4] } } } }

        @{ success = $true; data = @{
            available = $true; running = $true; version = $ping
            images = @($images); containers = @($cnts); volumes = @($vols); df = @($df)
        } } | ConvertTo-Json -Depth 6 -Compress
    }
    "prune-containers" {
        $out = & docker container prune -f 2>&1
        @{ success = $true; data = @{ output = ($out -join "`n") } } | ConvertTo-Json -Compress
    }
    "prune-images" {
        $out = & docker image prune -a -f 2>&1
        @{ success = $true; data = @{ output = ($out -join "`n") } } | ConvertTo-Json -Compress
    }
    "prune-volumes" {
        $out = & docker volume prune -f 2>&1
        @{ success = $true; data = @{ output = ($out -join "`n") } } | ConvertTo-Json -Compress
    }
    "prune-networks" {
        $out = & docker network prune -f 2>&1
        @{ success = $true; data = @{ output = ($out -join "`n") } } | ConvertTo-Json -Compress
    }
    "prune-build-cache" {
        $out = & docker builder prune -a -f 2>&1
        @{ success = $true; data = @{ output = ($out -join "`n") } } | ConvertTo-Json -Compress
    }
    "prune-all" {
        $out = & docker system prune -a --volumes -f 2>&1
        @{ success = $true; data = @{ output = ($out -join "`n") } } | ConvertTo-Json -Compress
    }
    default { @{ success = $false; error = "Unknown action" } | ConvertTo-Json -Compress }
}
