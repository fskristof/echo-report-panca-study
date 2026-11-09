<#
Panca study: backup of the study's patient folder (the OneDrive / SharePoint folder the study page saves into).

Each run makes ONE dated zip of the whole folder in the backup folder (default C:\PancaBackup), checks it (every file
is in the zip), then copies every zip that is not there yet to the extra places: a USB stick (found by its volume
label, so the drive letter may change) and / or network folders (\\computer\share\...). A place that is missing this
time (stick not plugged in, other computer off) is only logged: the next run copies everything it missed.
Nothing is ever deleted: the zips are small (a few KB per exam), so every backup is kept.

A run that finds the folder missing or empty stops with an error and makes no zip (so a broken OneDrive link can never
look like a successful backup). Any error shows a message box and is written to backup.log.

    powershell -NoProfile -ExecutionPolicy Bypass -File panca_backup.ps1 -Source "<study folder>" [-Dest C:\PancaBackup]
               [-UsbLabel "<volume label>"] [-Extra "\\pc\share\PancaBackup","D:\other"] [-Quiet]

install_backup_task.ps1 sets it up as a scheduled task. The folder names are given only there (on the computer),
never in this repository: patient data and its location stay out of the public code.
#>
param(
    [Parameter(Mandatory = $true)][string]$Source,
    [string]$Dest = "C:\PancaBackup",
    [string]$UsbLabel = "",
    [string[]]$Extra = @(),
    [switch]$Quiet                                   # no message box (for a test run from the console)
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

New-Item -ItemType Directory -Force -Path $Dest | Out-Null
$log = Join-Path $Dest "backup.log"
$problems = New-Object System.Collections.Generic.List[string]

function Log([string]$text) {
    $line = "{0}  {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $text
    Add-Content -Path $log -Value $line -Encoding UTF8
    Write-Output $line
}

function Show([string]$text, [int]$icon) {
    if ($Quiet) { return }
    try { (New-Object -ComObject WScript.Shell).Popup($text, 0, "Panca biztonsági mentés", $icon) | Out-Null } catch {}
}

function CopyMissing([string]$target, [string]$what) {
    try {
        New-Item -ItemType Directory -Force -Path $target | Out-Null
        $n = 0
        foreach ($z in Get-ChildItem -Path $Dest -Filter "PANCA_*.zip" -File) {
            $to = Join-Path $target $z.Name
            if (-not (Test-Path -LiteralPath $to) -or (Get-Item -LiteralPath $to).Length -ne $z.Length) {
                Copy-Item -LiteralPath $z.FullName -Destination $to -Force
                $n++
            }
        }
        Log "$what ($target): $n új mentés átmásolva"
    } catch {
        $problems.Add("$what ($target): nem sikerült másolni: $($_.Exception.Message)")
        Log "HIBA $what ($target): $($_.Exception.Message)"
    }
}

try {
    Log "--- mentés indul: $Source"
    if (-not (Test-Path -LiteralPath $Source -PathType Container)) {
        throw "A vizsgálati mappa nem található: $Source (átnevezték, áthelyezték, vagy a OneDrive nincs bejelentkezve?)"
    }
    $files = @(Get-ChildItem -LiteralPath $Source -Recurse -File -Force | Where-Object { $_.Name -notlike "*.lock.json" })
    if ($files.Count -eq 0) {
        throw "A vizsgálati mappa üres: $Source. Nem készült mentés (a korábbi mentések megvannak)."
    }

    # 1. the zip: written under a temporary name, renamed only when it is complete and checked
    $stamp = Get-Date -Format "yyyy-MM-dd_HHmmss"            # seconds too: two runs never share a name
    $zipPath = Join-Path $Dest "PANCA_$stamp.zip"
    $tmpPath = "$zipPath.tmp"
    if (Test-Path -LiteralPath $tmpPath) { Remove-Item -LiteralPath $tmpPath -Force }
    $root = (Get-Item -LiteralPath $Source).FullName.TrimEnd('\')
    $zip = [System.IO.Compression.ZipFile]::Open($tmpPath, [System.IO.Compression.ZipArchiveMode]::Create)
    try {
        foreach ($f in $files) {
            $rel = $f.FullName.Substring($root.Length + 1).Replace('\', '/')
            # reading a OneDrive "online only" file downloads it first; a file that cannot be read stops the backup
            [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $f.FullName, $rel,
                [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
        }
    } finally { $zip.Dispose() }

    # 2. check: every file is in the zip with its size
    $check = [System.IO.Compression.ZipFile]::OpenRead($tmpPath)
    try {
        $inZip = @{}
        foreach ($e in $check.Entries) { $inZip[$e.FullName] = $e.Length }
        foreach ($f in $files) {
            $rel = $f.FullName.Substring($root.Length + 1).Replace('\', '/')
            if (-not $inZip.ContainsKey($rel) -or $inZip[$rel] -ne $f.Length) { throw "Ellenőrzés: hiányzik a mentésből: $rel" }
        }
    } finally { $check.Dispose() }
    Move-Item -LiteralPath $tmpPath -Destination $zipPath -Force
    $patients = @(Get-ChildItem -LiteralPath $Source -Directory | Where-Object { $_.Name -match '^\d{9}$' }).Count
    Log ("Kész: {0} ({1} beteg, {2} fájl, {3:N0} KB)" -f (Split-Path $zipPath -Leaf), $patients, $files.Count, ((Get-Item $zipPath).Length / 1KB))

    # 3. the extra places: everything that is not there yet
    if ($UsbLabel) {
        $vol = Get-Volume | Where-Object { $_.FileSystemLabel -eq $UsbLabel -and $_.DriveLetter } | Select-Object -First 1
        if ($vol) { CopyMissing ("{0}:\PancaBackup" -f $vol.DriveLetter) "USB" }
        else { Log "USB ($UsbLabel): nincs bedugva, legközelebb másolja" }
    }
    foreach ($x in ($Extra -join ";").Split(";")) { if ($x.Trim()) { CopyMissing $x.Trim() "Hálózati mappa" } }   # several: "a;b"

    if ($problems.Count) {
        Show ("A mentés elkészült ($zipPath), de nem minden helyre sikerült átmásolni:`n`n" + ($problems -join "`n") +
              "`n`nRészletek: $log") 48
    }
    Log "--- vége"
    exit 0
} catch {
    Log "HIBA: $($_.Exception.Message)"
    if ($tmpPath -and (Test-Path -LiteralPath $tmpPath)) { Remove-Item -LiteralPath $tmpPath -Force -ErrorAction SilentlyContinue }
    Show ("A heti biztonsági mentés NEM készült el.`n`n$($_.Exception.Message)`n`nRészletek: $log") 16
    exit 1
}
