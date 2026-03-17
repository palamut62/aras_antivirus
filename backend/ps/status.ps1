# Mole - System Status Script
$ErrorActionPreference = "SilentlyContinue"

# CPU
$cpu = (Get-CimInstance -ClassName Win32_Processor | Measure-Object -Property LoadPercentage -Average).Average

# Memory
$os = Get-CimInstance -ClassName Win32_OperatingSystem
$memTotal = [long]$os.TotalVisibleMemorySize * 1024
$memFree = [long]$os.FreePhysicalMemory * 1024
$memUsed = $memTotal - $memFree

# Drives
$drives = @()
Get-CimInstance -ClassName Win32_LogicalDisk -Filter "DriveType=3" | ForEach-Object {
    $drives += @{
        letter = $_.DeviceID
        totalBytes = [long]$_.Size
        freeBytes = [long]$_.FreeSpace
    }
}

@{
    cpuPercent = [int]$cpu
    memTotal = $memTotal
    memUsed = $memUsed
    memFree = $memFree
    drives = $drives
} | ConvertTo-Json -Depth 3
