#Requires -RunAsAdministrator
$ErrorActionPreference = "Continue"
$log = Join-Path $PSScriptRoot "docker-setup-log.txt"
function Log($m) {
    $line = "$(Get-Date -Format o) $m"
    Add-Content -Path $log -Value $line
    Write-Host $line
}

Log "=== START elevated Docker prep ==="
$cpu = Get-CimInstance Win32_Processor
Log "CPU=$($cpu.Name)"
Log "VirtualizationFirmwareEnabled=$($cpu.VirtualizationFirmwareEnabled)"
Log "SLAT=$($cpu.SecondLevelAddressTranslationExtensions)"

if (-not $cpu.VirtualizationFirmwareEnabled) {
    Log "WARNING: VT-x seems DISABLED in BIOS. Docker will likely still fail until you enable Intel Virtualization Technology in BIOS (HP: F10 at boot)."
}

foreach ($f in @(
    'VirtualMachinePlatform',
    'Microsoft-Windows-Subsystem-Linux',
    'HypervisorPlatform',
    'Containers'
)) {
    try {
        $before = Get-WindowsOptionalFeature -Online -FeatureName $f
        Log "Feature $f before=$($before.State)"
        if ($before.State -ne 'Enabled') {
            $r = Enable-WindowsOptionalFeature -Online -FeatureName $f -All -NoRestart
            Log "Enable $f RestartNeeded=$($r.RestartNeeded)"
        }
    } catch {
        Log "Feature $f ERROR: $($_.Exception.Message)"
    }
}

Log "Installing / updating WSL..."
try {
    & wsl --install --no-distribution 2>&1 | ForEach-Object { Log "$_" }
} catch {
    Log "wsl install ERROR: $($_.Exception.Message)"
}
try {
    & wsl --update 2>&1 | ForEach-Object { Log "$_" }
} catch {
    Log "wsl update ERROR: $($_.Exception.Message)"
}

try {
    bcdedit /set hypervisorlaunchtype auto | ForEach-Object { Log "$_" }
} catch {
    Log "bcdedit ERROR: $($_.Exception.Message)"
}

Log "=== DONE elevated Docker prep ==="
Log "NEXT: 1) Enable VT-x in BIOS if still disabled  2) Reboot  3) Start Docker Desktop  4) Run scripts\start-sprint0.ps1"
Write-Host ""
Write-Host "Appuie sur Entree pour fermer..."
Read-Host | Out-Null
