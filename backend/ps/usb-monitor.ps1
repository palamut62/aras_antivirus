param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("list-devices","scan-drive","check-autorun")]
    [string]$Action,

    [Parameter(Mandatory=$false)]
    [string]$DriveLetter
)

$ErrorActionPreference = "SilentlyContinue"
$startTime = Get-Date

$suspiciousExeExtensions = @(".exe",".dll",".scr",".com",".pif",".bat",".cmd",".ps1",".vbs",".vbe",".wsf",".wsh",".msi",".hta",".inf",".reg",".cpl")
$suspiciousPatterns = @(
    @{ pattern = "autorun\.inf$"; risk = 50; reason = "Autorun.inf file" },
    @{ pattern = "\.lnk$"; risk = 20; reason = "Shortcut file on USB" },
    @{ pattern = "recycler"; risk = 40; reason = "RECYCLER folder (common malware hiding spot)" },
    @{ pattern = "\\~\$"; risk = 15; reason = "Hidden temp file" }
)

# Known USB malware filenames
$knownMalwareNames = @("ravmon.exe","ntdelect.com","autorun.inf","desktop.ini.exe","folder.exe","copy.exe","host.exe","recycler.exe","usb.exe","svchost.exe","csrss.exe")

function Get-USBDrives {
    $usbDrives = @()
    $disks = Get-WmiObject -Class Win32_DiskDrive -ErrorAction SilentlyContinue | Where-Object { $_.InterfaceType -eq "USB" }
    foreach ($disk in $disks) {
        $partitions = Get-WmiObject -Query "ASSOCIATORS OF {Win32_DiskDrive.DeviceID='$($disk.DeviceID.Replace('\','\\'))'} WHERE AssocClass=Win32_DiskDriveToDiskPartition" -ErrorAction SilentlyContinue
        foreach ($partition in $partitions) {
            $logicals = Get-WmiObject -Query "ASSOCIATORS OF {Win32_DiskPartition.DeviceID='$($partition.DeviceID)'} WHERE AssocClass=Win32_LogicalDiskToPartition" -ErrorAction SilentlyContinue
            foreach ($logical in $logicals) {
                $hasAutorun = Test-Path (Join-Path $logical.DeviceID "autorun.inf")
                $usbDrives += @{
                    deviceName = $disk.Model
                    driveLetter = $logical.DeviceID
                    serialNumber = $disk.SerialNumber
                    sizeMB = [math]::Round($disk.Size / 1MB)
                    freeSpaceMB = [math]::Round($logical.FreeSpace / 1MB)
                    fileSystem = $logical.FileSystem
                    volumeName = $logical.VolumeName
                    hasAutorun = $hasAutorun
                }
            }
        }
    }

    # Fallback: also check Get-Volume for removable drives
    if ($usbDrives.Count -eq 0) {
        $removable = Get-WmiObject Win32_LogicalDisk -ErrorAction SilentlyContinue | Where-Object { $_.DriveType -eq 2 }
        foreach ($drive in $removable) {
            $hasAutorun = Test-Path (Join-Path $drive.DeviceID "autorun.inf")
            $usbDrives += @{
                deviceName = "Removable Drive"
                driveLetter = $drive.DeviceID
                serialNumber = $drive.VolumeSerialNumber
                sizeMB = [math]::Round($drive.Size / 1MB)
                freeSpaceMB = [math]::Round($drive.FreeSpace / 1MB)
                fileSystem = $drive.FileSystem
                volumeName = $drive.VolumeName
                hasAutorun = $hasAutorun
            }
        }
    }
    return $usbDrives
}

function Invoke-ListDevices {
    $drives = Get-USBDrives
    $elapsed = ((Get-Date) - $startTime).TotalMilliseconds
    return @{
        action = "list-devices"
        results = $drives
        totalScanned = $drives.Count
        threatCount = ($drives | Where-Object { $_.hasAutorun }).Count
    }
}

function Invoke-ScanDrive {
    if (-not $DriveLetter) {
        return @{ action = "scan-drive"; results = @(); totalScanned = 0; threatCount = 0; error = "DriveLetter parameter required" }
    }

    $drivePath = $DriveLetter.TrimEnd('\','/')
    if ($drivePath.Length -eq 1) { $drivePath = "${drivePath}:" }
    if (-not (Test-Path $drivePath)) {
        return @{ action = "scan-drive"; results = @(); totalScanned = 0; threatCount = 0; error = "Drive $drivePath not found" }
    }

    $results = @()
    $totalScanned = 0

    # Get all files (limit depth to prevent infinite loops on large drives)
    $allFiles = Get-ChildItem -Path "$drivePath\" -Recurse -File -Force -ErrorAction SilentlyContinue | Select-Object -First 5000

    foreach ($file in $allFiles) {
        $totalScanned++
        $ext = $file.Extension.ToLower()
        $nameLower = $file.Name.ToLower()
        $risk = 0
        $reasons = @()
        $sha256 = $null

        # Check for executable files
        if ($ext -in $suspiciousExeExtensions) {
            $risk += 25
            $reasons += "Executable on USB drive: $ext"
            $sha256 = (Get-FileHash -Path $file.FullName -Algorithm SHA256 -ErrorAction SilentlyContinue).Hash

            # Check signature
            if ($ext -in @(".exe",".dll",".msi")) {
                $sig = Get-AuthenticodeSignature -FilePath $file.FullName -ErrorAction SilentlyContinue
                if ($sig -and $sig.Status -eq "Valid") {
                    $risk -= 10
                } elseif ($sig -and $sig.Status -eq "NotSigned") {
                    $risk += 15
                    $reasons += "Not digitally signed"
                }
            }
        }

        # Known malware names
        if ($nameLower -in $knownMalwareNames) {
            $risk += 40
            $reasons += "Known USB malware filename"
            if (-not $sha256) { $sha256 = (Get-FileHash -Path $file.FullName -Algorithm SHA256 -ErrorAction SilentlyContinue).Hash }
        }

        # Hidden file check
        if ($file.Attributes -band [System.IO.FileAttributes]::Hidden) {
            if ($ext -in $suspiciousExeExtensions -or $ext -eq ".lnk") {
                $risk += 20
                $reasons += "Hidden executable/shortcut"
            }
        }

        # .lnk files with suspicious targets
        if ($ext -eq ".lnk") {
            $risk += 10
            $reasons += "Shortcut file on USB"
            try {
                $shell = New-Object -ComObject WScript.Shell
                $shortcut = $shell.CreateShortcut($file.FullName)
                $target = $shortcut.TargetPath
                if ($target -match "cmd|powershell|wscript|cscript|mshta|rundll32") {
                    $risk += 35
                    $reasons += "Shortcut targets suspicious program: $target"
                }
                [System.Runtime.InteropServices.Marshal]::ReleaseComObject($shell) | Out-Null
            } catch {}
        }

        # Check suspicious patterns
        foreach ($sp in $suspiciousPatterns) {
            if ($file.FullName -match $sp.pattern) {
                $risk += $sp.risk
                $reasons += $sp.reason
            }
        }

        # Autorun.inf content check
        if ($nameLower -eq "autorun.inf") {
            $risk = 60
            $reasons = @("Autorun.inf found on USB")
            $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
            if ($content -match "open\s*=\s*(.+)") {
                $risk = 80
                $reasons += "Autorun.inf opens: $($Matches[1].Trim())"
            }
            if ($content -match "shellexecute\s*=\s*(.+)") {
                $risk = 80
                $reasons += "Autorun.inf shellexecutes: $($Matches[1].Trim())"
            }
        }

        # Folder disguised as exe (folder.exe)
        if ($nameLower -match "^(documents?|photos?|pictures?|videos?|music|backup|data|files?)\.exe$") {
            $risk += 40
            $reasons += "Executable disguised as folder name"
        }

        $risk = [math]::Max(0, [math]::Min(100, $risk))
        if ($risk -gt 0) {
            $results += @{
                path = $file.FullName
                fileName = $file.Name
                extension = $ext
                sizeKB = [math]::Round($file.Length / 1KB, 1)
                sha256 = $sha256
                riskScore = $risk
                reasons = $reasons
                hidden = ($file.Attributes -band [System.IO.FileAttributes]::Hidden) -ne 0
                created = $file.CreationTime.ToString("o")
            }
        }
    }

    $results = $results | Sort-Object { $_.riskScore } -Descending
    $elapsed = ((Get-Date) - $startTime).TotalMilliseconds
    return @{
        action = "scan-drive"
        results = $results
        totalScanned = $totalScanned
        threatCount = ($results | Where-Object { $_.riskScore -ge 30 }).Count
    }
}

function Invoke-CheckAutorun {
    $results = @()
    $removable = Get-WmiObject Win32_LogicalDisk -ErrorAction SilentlyContinue | Where-Object { $_.DriveType -eq 2 }

    # Also check all non-system fixed drives as some USB drives appear as fixed
    $allDrives = Get-WmiObject Win32_LogicalDisk -ErrorAction SilentlyContinue | Where-Object { $_.DriveType -in @(2,3) }

    foreach ($drive in $allDrives) {
        $autorunPath = Join-Path $drive.DeviceID "autorun.inf"
        if (Test-Path $autorunPath) {
            $content = Get-Content $autorunPath -Raw -ErrorAction SilentlyContinue
            $risk = 60
            $reasons = @("Autorun.inf found on $($drive.DeviceID)")
            $opensFile = $null
            $icon = $null

            if ($content) {
                if ($content -match "(?i)open\s*=\s*(.+)") {
                    $opensFile = $Matches[1].Trim()
                    $risk = 85
                    $reasons += "Auto-opens: $opensFile"
                }
                if ($content -match "(?i)shellexecute\s*=\s*(.+)") {
                    $opensFile = $Matches[1].Trim()
                    $risk = 85
                    $reasons += "Shell-executes: $opensFile"
                }
                if ($content -match "(?i)icon\s*=\s*(.+)") {
                    $icon = $Matches[1].Trim()
                }
            }

            $fileInfo = Get-Item $autorunPath -Force -ErrorAction SilentlyContinue
            $results += @{
                driveLetter = $drive.DeviceID
                driveType = if ($drive.DriveType -eq 2) { "Removable" } else { "Fixed" }
                volumeName = $drive.VolumeName
                autorunPath = $autorunPath
                content = $content
                opensFile = $opensFile
                icon = $icon
                riskScore = $risk
                reasons = $reasons
                hidden = ($fileInfo.Attributes -band [System.IO.FileAttributes]::Hidden) -ne 0
                created = $fileInfo.CreationTime.ToString("o")
            }
        }
    }

    $elapsed = ((Get-Date) - $startTime).TotalMilliseconds
    return @{
        action = "check-autorun"
        results = $results
        totalScanned = $allDrives.Count
        threatCount = $results.Count
    }
}

# Execute
$output = switch ($Action) {
    "list-devices"  { Invoke-ListDevices }
    "scan-drive"    { Invoke-ScanDrive }
    "check-autorun" { Invoke-CheckAutorun }
}

$output | ConvertTo-Json -Depth 5 -Compress
