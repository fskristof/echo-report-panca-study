<#
Sets up the Panca study backup as a scheduled task on THIS computer (for the user who runs it; no admin rights,
no stored password). Run it again with other values to change the settings: it replaces the task.

    powershell -NoProfile -ExecutionPolicy Bypass -File install_backup_task.ps1 -Source "<study folder>"
               [-UsbLabel "<USB stick's volume label>"] [-Extra "\\pc\share\PancaBackup"] [-Day Friday] [-Time 17:00]
               [-Dest C:\PancaBackup]

It copies panca_backup.ps1 into the backup folder (so the task does not depend on this repository's folder), then
registers the task "Panca biztonsági mentés": weekly on -Day at -Time; if the computer was off or asleep then, it
runs as soon as it can. It runs only while the user is signed in (the OneDrive folder and the message box need that).
Remove it:  Unregister-ScheduledTask -TaskName "Panca biztonsági mentés"
#>
param(
    [Parameter(Mandatory = $true)][string]$Source,
    [string]$Dest = "C:\PancaBackup",
    [string]$UsbLabel = "",
    [string[]]$Extra = @(),
    [System.DayOfWeek]$Day = [System.DayOfWeek]::Friday,
    [string]$Time = "17:00"
)
$ErrorActionPreference = "Stop"
$TaskName = "Panca biztonsági mentés"

if (-not (Test-Path -LiteralPath $Source -PathType Container)) { throw "Nincs ilyen mappa: $Source" }
New-Item -ItemType Directory -Force -Path $Dest | Out-Null
$script = Join-Path $Dest "panca_backup.ps1"
Copy-Item -LiteralPath (Join-Path $PSScriptRoot "panca_backup.ps1") -Destination $script -Force

$q = { param($s) '"' + $s.Replace('"', '\"') + '"' }
$argLine = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File $(& $q $script) -Source $(& $q $Source) -Dest $(& $q $Dest)"
if ($UsbLabel) { $argLine += " -UsbLabel $(& $q $UsbLabel)" }
$extraList = (@($Extra) | Where-Object { $_ }) -join ";"
if ($extraList) { $argLine += " -Extra $(& $q $extraList)" }    # one value: -File cannot pass a list

$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument $argLine -WorkingDirectory $Dest
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek $Day -At $Time
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
            -ExecutionTimeLimit (New-TimeSpan -Minutes 30) -MultipleInstances IgnoreNew
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited
Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal `
    -Description "Heti biztonsági mentés a Panca vizsgálat mappájáról ($Dest, napló: backup.log)" -Force | Out-Null

$t = Get-ScheduledTask -TaskName $TaskName
"Beállítva: '$TaskName' - minden $Day $Time, mentés ide: $Dest"
"Következő futás: $((Get-ScheduledTaskInfo -TaskName $TaskName).NextRunTime)"
