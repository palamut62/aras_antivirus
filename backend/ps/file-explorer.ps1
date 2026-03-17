param(
    [Parameter(Mandatory=$true)]
    [string]$Action,

    [string]$Path = "",
    [string]$NewName = "",
    [string]$Destination = ""
)

$ErrorActionPreference = "Stop"

function Format-FileItem {
    param($Item)
    @{
        name = $Item.Name
        path = $Item.FullName
        isDirectory = $Item.PSIsContainer
        size = if ($Item.PSIsContainer) { 0 } else { $Item.Length }
        extension = if ($Item.PSIsContainer) { "" } else { $Item.Extension }
        lastModified = $Item.LastWriteTime.ToString("yyyy-MM-dd HH:mm:ss")
        createdAt = $Item.CreationTime.ToString("yyyy-MM-dd HH:mm:ss")
        isHidden = [bool]($Item.Attributes -band [IO.FileAttributes]::Hidden)
        isReadOnly = [bool]($Item.Attributes -band [IO.FileAttributes]::ReadOnly)
    }
}

try {
    switch ($Action) {
        "list" {
            if (-not $Path -or -not (Test-Path $Path)) {
                # Return drives
                $drives = Get-PSDrive -PSProvider FileSystem | Where-Object { $_.Used -ne $null } | ForEach-Object {
                    @{
                        name = $_.Name + ":\"
                        path = $_.Root
                        isDirectory = $true
                        size = 0
                        extension = ""
                        lastModified = ""
                        createdAt = ""
                        isHidden = $false
                        isReadOnly = $false
                        driveInfo = @{
                            totalSize = $_.Used + $_.Free
                            freeSpace = $_.Free
                            usedSpace = $_.Used
                            format = (Get-Volume -DriveLetter $_.Name -ErrorAction SilentlyContinue).FileSystemType
                        }
                    }
                }
                @{ success = $true; data = @{ items = $drives; currentPath = ""; parentPath = ""; isDriveRoot = $true } } | ConvertTo-Json -Depth 5
            } else {
                $items = Get-ChildItem -Path $Path -Force -ErrorAction Stop | Sort-Object @{Expression={-not $_.PSIsContainer}}, Name | ForEach-Object {
                    Format-FileItem $_
                }
                $parent = Split-Path $Path -Parent
                @{
                    success = $true
                    data = @{
                        items = @($items)
                        currentPath = (Resolve-Path $Path).Path
                        parentPath = if ($parent) { $parent } else { "" }
                        isDriveRoot = ($Path -match '^[A-Z]:\\?$')
                    }
                } | ConvertTo-Json -Depth 5
            }
        }

        "delete" {
            if (-not $Path -or -not (Test-Path $Path)) {
                @{ success = $false; error = "Dosya bulunamadi: $Path" } | ConvertTo-Json
                return
            }
            Remove-Item -Path $Path -Recurse -Force
            @{ success = $true; data = @{ deleted = $Path } } | ConvertTo-Json -Depth 3
        }

        "rename" {
            if (-not $Path -or -not (Test-Path $Path)) {
                @{ success = $false; error = "Dosya bulunamadi: $Path" } | ConvertTo-Json
                return
            }
            if (-not $NewName) {
                @{ success = $false; error = "Yeni isim belirtilmedi" } | ConvertTo-Json
                return
            }
            Rename-Item -Path $Path -NewName $NewName -Force
            $parentDir = Split-Path $Path -Parent
            $newPath = Join-Path $parentDir $NewName
            @{ success = $true; data = @{ oldPath = $Path; newPath = $newPath } } | ConvertTo-Json -Depth 3
        }

        "copy" {
            if (-not $Path -or -not (Test-Path $Path)) {
                @{ success = $false; error = "Kaynak bulunamadi: $Path" } | ConvertTo-Json
                return
            }
            if (-not $Destination) {
                @{ success = $false; error = "Hedef belirtilmedi" } | ConvertTo-Json
                return
            }
            Copy-Item -Path $Path -Destination $Destination -Recurse -Force
            @{ success = $true; data = @{ source = $Path; destination = $Destination } } | ConvertTo-Json -Depth 3
        }

        "move" {
            if (-not $Path -or -not (Test-Path $Path)) {
                @{ success = $false; error = "Kaynak bulunamadi: $Path" } | ConvertTo-Json
                return
            }
            if (-not $Destination) {
                @{ success = $false; error = "Hedef belirtilmedi" } | ConvertTo-Json
                return
            }
            Move-Item -Path $Path -Destination $Destination -Force
            @{ success = $true; data = @{ source = $Path; destination = $Destination } } | ConvertTo-Json -Depth 3
        }

        "create-folder" {
            if (-not $Path) {
                @{ success = $false; error = "Yol belirtilmedi" } | ConvertTo-Json
                return
            }
            New-Item -Path $Path -ItemType Directory -Force | Out-Null
            @{ success = $true; data = @{ created = $Path } } | ConvertTo-Json -Depth 3
        }

        "info" {
            if (-not $Path -or -not (Test-Path $Path)) {
                @{ success = $false; error = "Dosya bulunamadi: $Path" } | ConvertTo-Json
                return
            }
            $item = Get-Item -Path $Path -Force
            $info = Format-FileItem $item
            if ($item.PSIsContainer) {
                $childItems = Get-ChildItem -Path $Path -Recurse -Force -ErrorAction SilentlyContinue
                $info.size = ($childItems | Where-Object { -not $_.PSIsContainer } | Measure-Object -Property Length -Sum).Sum
                $info["fileCount"] = ($childItems | Where-Object { -not $_.PSIsContainer }).Count
                $info["folderCount"] = ($childItems | Where-Object { $_.PSIsContainer }).Count
            }
            @{ success = $true; data = $info } | ConvertTo-Json -Depth 4
        }

        "open" {
            if (-not $Path -or -not (Test-Path $Path)) {
                @{ success = $false; error = "Dosya bulunamadi: $Path" } | ConvertTo-Json
                return
            }
            Start-Process -FilePath "explorer.exe" -ArgumentList "/select,`"$Path`""
            @{ success = $true; data = @{ opened = $Path } } | ConvertTo-Json -Depth 3
        }

        default {
            @{ success = $false; error = "Bilinmeyen aksiyon: $Action" } | ConvertTo-Json
        }
    }
} catch {
    @{ success = $false; error = $_.Exception.Message } | ConvertTo-Json
}
