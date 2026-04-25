$ErrorActionPreference = "Stop"

$AppName = "plfetch"
$InstallDir = if ($env:PLFETCH_INSTALL_DIR) { $env:PLFETCH_INSTALL_DIR } else { Join-Path $env:LOCALAPPDATA "Programs\$AppName" }
$BinDir = if ($env:PLFETCH_BIN_DIR) { $env:PLFETCH_BIN_DIR } else { Join-Path $env:LOCALAPPDATA "Microsoft\WindowsApps" }
$RawBaseUrl = if ($env:PLFETCH_RAW_BASE_URL) { $env:PLFETCH_RAW_BASE_URL.TrimEnd("/") } else { "https://raw.githubusercontent.com/nestezup/plfetch/main" }

function Require-Command {
  param([string]$Name)

  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "missing required command: $Name"
  }
}

function Download-File {
  param(
    [string]$Url,
    [string]$OutputPath
  )

  Invoke-WebRequest -Uri $Url -OutFile $OutputPath
}

try {
  Require-Command "node"
}
catch {
  Write-Error @"
missing required command: node

Install Node.js first:
  https://nodejs.org/
"@
  exit 1
}

New-Item -ItemType Directory -Force `
  $InstallDir, `
  (Join-Path $InstallDir "bin"), `
  (Join-Path $InstallDir "src"), `
  $BinDir, `
  (Join-Path $env:APPDATA $AppName), `
  (Join-Path $env:USERPROFILE "Downloads\$AppName") | Out-Null

Download-File "$RawBaseUrl/package.json" (Join-Path $InstallDir "package.json")
Download-File "$RawBaseUrl/README.md" (Join-Path $InstallDir "README.md")
Download-File "$RawBaseUrl/bin/plfetch.js" (Join-Path $InstallDir "bin\plfetch.js")
Download-File "$RawBaseUrl/src/core.js" (Join-Path $InstallDir "src\core.js")

$CmdPath = Join-Path $BinDir "$AppName.cmd"
@"
@echo off
node "$InstallDir\bin\plfetch.js" %*
"@ | Set-Content -Path $CmdPath -Encoding ASCII

$UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($UserPath -notlike "*$BinDir*") {
  [Environment]::SetEnvironmentVariable("Path", "$UserPath;$BinDir", "User")
}

Write-Host "Installed $AppName"
Write-Host ""
Write-Host "Command:"
Write-Host "  $CmdPath"
Write-Host ""
Write-Host "Config:"
Write-Host "  $(Join-Path $env:APPDATA "$AppName\.env")"
Write-Host ""
Write-Host "Downloads:"
Write-Host "  $(Join-Path $env:USERPROFILE "Downloads\$AppName")"
Write-Host ""
Write-Host "If 'plfetch' is not found, open a new PowerShell window."
Write-Host ""
Write-Host "Next:"
Write-Host "  plfetch onboard"
