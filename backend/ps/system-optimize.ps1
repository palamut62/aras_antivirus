param(
    [string]$Action = "status",
    [string[]]$Tasks = @()
)

$ErrorActionPreference = "SilentlyContinue"

function Get-OptimizationStatus {
    $items = @()

    # 1. DNS Cache
    $dnsStats = Get-DnsClientCache 2>$null
    $dnsCount = if ($dnsStats) { ($dnsStats | Measure-Object).Count } else { 0 }
    $items += @{
        id = "dns-flush"
        name = "DNS Cache Temizle"
        nameEn = "Flush DNS Cache"
        description = "DNS onbellegi temizle, baglanti sorunlarini coz"
        descriptionEn = "Flush DNS cache to fix connection issues"
        category = "network"
        currentValue = "$dnsCount kayit / $dnsCount entries"
        risk = "safe"
    }

    # 2. Windows Search Index
    $searchService = Get-Service -Name "WSearch" 2>$null
    $searchStatus = if ($searchService) { $searchService.Status.ToString() } else { "NotFound" }
    $items += @{
        id = "search-rebuild"
        name = "Windows Search Yeniden Olustur"
        nameEn = "Rebuild Windows Search Index"
        description = "Arama indeksini yeniden olustur"
        descriptionEn = "Rebuild search index for better results"
        category = "system"
        currentValue = "Service: $searchStatus"
        risk = "moderate"
    }

    # 3. Disk Optimize (Trim/Defrag)
    $volumes = Get-Volume | Where-Object { $_.DriveLetter -and $_.DriveType -eq 'Fixed' } | Select-Object DriveLetter, FileSystemType, Size, SizeRemaining
    $diskInfo = ($volumes | ForEach-Object { "$($_.DriveLetter): $([math]::Round($_.SizeRemaining/1GB,1))GB free" }) -join ", "
    $items += @{
        id = "disk-optimize"
        name = "Disk Optimizasyonu"
        nameEn = "Optimize Disk (Trim/Defrag)"
        description = "SSD trim veya HDD defrag calistir"
        descriptionEn = "Run SSD trim or HDD defragmentation"
        category = "disk"
        currentValue = $diskInfo
        risk = "safe"
    }

    # 4. Temp Files
    $tempSize = (Get-ChildItem "$env:TEMP" -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
    $winTempSize = (Get-ChildItem "$env:SystemRoot\Temp" -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
    $totalTemp = ($tempSize + $winTempSize)
    $items += @{
        id = "temp-clean"
        name = "Temp Dosyalari Temizle"
        nameEn = "Clean Temp Files"
        description = "Gecici dosyalari temizle"
        descriptionEn = "Remove temporary files"
        category = "disk"
        currentValue = "$([math]::Round($totalTemp/1MB, 1)) MB"
        risk = "safe"
        sizeBytes = $totalTemp
    }

    # 5. SFC Scan
    $items += @{
        id = "sfc-scan"
        name = "Sistem Dosyasi Dogrulama (SFC)"
        nameEn = "System File Checker (SFC)"
        description = "Bozuk sistem dosyalarini tara ve onar"
        descriptionEn = "Scan and repair corrupted system files"
        category = "system"
        currentValue = "Tarama gerekli / Scan needed"
        risk = "safe"
    }

    # 6. Network Reset
    $items += @{
        id = "network-reset"
        name = "Ag Ayarlarini Sifirla"
        nameEn = "Reset Network Settings"
        description = "Winsock, IP stack ve DNS sifirla"
        descriptionEn = "Reset Winsock, IP stack and DNS"
        category = "network"
        risk = "moderate"
        currentValue = ""
    }

    # 7. Windows Update Cleanup
    $wuSize = 0
    $wuPath = "$env:SystemRoot\SoftwareDistribution\Download"
    if (Test-Path $wuPath) {
        $wuSize = (Get-ChildItem $wuPath -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
    }
    $items += @{
        id = "wu-cleanup"
        name = "Windows Update Temizligi"
        nameEn = "Windows Update Cleanup"
        description = "Eski guncelleme dosyalarini temizle"
        descriptionEn = "Clean old Windows Update files"
        category = "disk"
        currentValue = "$([math]::Round($wuSize/1MB, 1)) MB"
        risk = "moderate"
        sizeBytes = $wuSize
    }

    # 8. Startup Programs
    $startups = Get-CimInstance Win32_StartupCommand 2>$null
    $startupCount = if ($startups) { ($startups | Measure-Object).Count } else { 0 }
    $items += @{
        id = "startup-review"
        name = "Baslangic Programlari"
        nameEn = "Review Startup Programs"
        description = "Gereksiz baslangic programlarini gozden gecir"
        descriptionEn = "Review and manage startup programs"
        category = "performance"
        currentValue = "$startupCount program"
        risk = "info"
    }

    return $items
}

function Run-Optimization {
    param([string[]]$TaskList)
    $results = @()

    foreach ($task in $TaskList) {
        $r = @{ id = $task; success = $false; message = "" }
        switch ($task) {
            "dns-flush" {
                Clear-DnsClientCache 2>$null
                ipconfig /flushdns 2>$null | Out-Null
                $r.success = $true
                $r.message = "DNS cache temizlendi / DNS cache flushed"
            }
            "search-rebuild" {
                Stop-Service WSearch -Force 2>$null
                $indexPath = "$env:ProgramData\Microsoft\Search\Data\Applications\Windows\Windows.edb"
                if (Test-Path $indexPath) {
                    Remove-Item $indexPath -Force 2>$null
                }
                Start-Service WSearch 2>$null
                $r.success = $true
                $r.message = "Search index yeniden olusturuluyor / Search index rebuilding"
            }
            "disk-optimize" {
                $volumes = Get-Volume | Where-Object { $_.DriveLetter -and $_.DriveType -eq 'Fixed' }
                foreach ($vol in $volumes) {
                    Optimize-Volume -DriveLetter $vol.DriveLetter -Verbose 2>$null
                }
                $r.success = $true
                $r.message = "Disk optimizasyonu tamamlandi / Disk optimization completed"
            }
            "temp-clean" {
                $before = (Get-ChildItem "$env:TEMP" -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
                Remove-Item "$env:TEMP\*" -Recurse -Force -ErrorAction SilentlyContinue
                Remove-Item "$env:SystemRoot\Temp\*" -Recurse -Force -ErrorAction SilentlyContinue
                $r.success = $true
                $r.message = "Temp dosyalar temizlendi / Temp files cleaned"
                $r.sizeFreed = $before
            }
            "sfc-scan" {
                $sfcOutput = & sfc /scannow 2>&1
                $r.success = $true
                $r.message = "SFC taramasi tamamlandi / SFC scan completed"
                $r.details = ($sfcOutput | Out-String).Trim()
            }
            "network-reset" {
                netsh winsock reset 2>$null | Out-Null
                netsh int ip reset 2>$null | Out-Null
                ipconfig /flushdns 2>$null | Out-Null
                ipconfig /release 2>$null | Out-Null
                ipconfig /renew 2>$null | Out-Null
                $r.success = $true
                $r.message = "Ag ayarlari sifirlandi / Network settings reset"
            }
            "wu-cleanup" {
                $wuPath = "$env:SystemRoot\SoftwareDistribution\Download"
                $before = 0
                if (Test-Path $wuPath) {
                    $before = (Get-ChildItem $wuPath -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
                    Stop-Service wuauserv -Force 2>$null
                    Remove-Item "$wuPath\*" -Recurse -Force -ErrorAction SilentlyContinue
                    Start-Service wuauserv 2>$null
                }
                $r.success = $true
                $r.message = "Windows Update temizlendi / Windows Update cleaned"
                $r.sizeFreed = $before
            }
            "startup-review" {
                $startups = Get-CimInstance Win32_StartupCommand 2>$null
                $list = @()
                if ($startups) {
                    foreach ($s in $startups) {
                        $list += @{
                            name = $s.Name
                            command = $s.Command
                            location = $s.Location
                            user = $s.User
                        }
                    }
                }
                $r.success = $true
                $r.message = "Baslangic programlari listelendi"
                $r.startups = $list
            }
        }
        $results += $r
    }
    return $results
}

# Main
switch ($Action) {
    "status" {
        $items = Get-OptimizationStatus
        @{
            success = $true
            data = @{
                items = $items
                totalItems = $items.Count
            }
        } | ConvertTo-Json -Depth 5
    }
    "optimize" {
        if ($Tasks.Count -eq 0) {
            @{ success = $false; error = "No tasks specified" } | ConvertTo-Json
            return
        }
        $results = Run-Optimization -TaskList $Tasks
        $totalFreed = ($results | Where-Object { $_.sizeFreed } | Measure-Object -Property sizeFreed -Sum).Sum
        @{
            success = $true
            data = @{
                results = $results
                completedCount = ($results | Where-Object { $_.success }).Count
                totalTasks = $results.Count
                totalSizeFreed = if ($totalFreed) { $totalFreed } else { 0 }
            }
        } | ConvertTo-Json -Depth 5
    }
}
