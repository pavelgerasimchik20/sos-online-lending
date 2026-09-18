#Requires -Version 5.1
<#
  Проверяет наличие Node.js и Docker, при необходимости пытается установить их
  через winget, затем поднимает проект (npm install && npm run start:all).

  Ограничение: Docker Desktop на Windows после установки требует ручного
  первого запуска (принятие лицензии, включение WSL2) — это ограничение
  самого Docker Desktop, обойти его автоматически нельзя. Если скрипт не
  смог дождаться запуска Docker, он объяснит, что сделать вручную, и его
  можно будет просто запустить ещё раз.
#>

$ErrorActionPreference = 'Stop'

function Write-Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-Ok($msg) { Write-Host "    $msg" -ForegroundColor Green }
function Write-Warn2($msg) { Write-Host "    $msg" -ForegroundColor Yellow }
function Write-Err2($msg) { Write-Host "    $msg" -ForegroundColor Red }

function Test-Command($name) {
  return [bool](Get-Command $name -ErrorAction SilentlyContinue)
}

function Refresh-Path {
  $machine = [System.Environment]::GetEnvironmentVariable('Path', 'Machine')
  $user = [System.Environment]::GetEnvironmentVariable('Path', 'User')
  $env:Path = "$machine;$user"
}

# --- Node.js ---------------------------------------------------------------

Write-Step 'Проверяю Node.js'
if (Test-Command node) {
  Write-Ok "Node.js уже установлен: $(node -v)"
}
else {
  Write-Warn2 'Node.js не найден. Пытаюсь установить через winget...'
  if (-not (Test-Command winget)) {
    Write-Err2 'winget не найден на этой машине.'
    Write-Err2 'Установите Node.js вручную: https://nodejs.org/ (LTS), затем запустите этот скрипт снова.'
    exit 1
  }
  winget install --id OpenJS.NodeJS.LTS -e --accept-source-agreements --accept-package-agreements
  Refresh-Path
  if (-not (Test-Command node)) {
    Write-Err2 'Node.js установлен, но не виден в текущей сессии терминала.'
    Write-Err2 'Закройте это окно, откройте терминал заново и запустите скрипт ещё раз.'
    exit 1
  }
  Write-Ok "Node.js установлен: $(node -v)"
}

# --- Docker ------------------------------------------------------------------

Write-Step 'Проверяю Docker'

function Test-DockerRunning {
  if (-not (Test-Command docker)) { return $false }
  docker info *> $null
  return $LASTEXITCODE -eq 0
}

if (Test-DockerRunning) {
  Write-Ok 'Docker установлен и запущен.'
}
else {
  if (-not (Test-Command docker)) {
    Write-Warn2 'Docker не найден. Пытаюсь установить Docker Desktop через winget...'
    if (-not (Test-Command winget)) {
      Write-Err2 'winget не найден на этой машине.'
      Write-Err2 'Установите Docker Desktop вручную: https://www.docker.com/products/docker-desktop/'
      exit 1
    }
    winget install --id Docker.DockerDesktop -e --accept-source-agreements --accept-package-agreements
    Refresh-Path
    Write-Warn2 'Docker Desktop установлен. При первом запуске он попросит принять лицензию и может потребовать включить WSL2 — это делается вручную один раз.'
  }

  $dockerDesktopExe = Join-Path ${Env:ProgramFiles} 'Docker\Docker\Docker Desktop.exe'
  if (Test-Path $dockerDesktopExe) {
    Write-Step 'Запускаю Docker Desktop...'
    Start-Process $dockerDesktopExe | Out-Null
  }

  Write-Step 'Жду запуска Docker (до 3 минут)...'
  $ready = $false
  for ($i = 0; $i -lt 36; $i++) {
    if (Test-DockerRunning) { $ready = $true; break }
    Start-Sleep -Seconds 5
  }

  if (-not $ready) {
    Write-Err2 'Docker не запустился автоматически за отведённое время.'
    Write-Err2 'Откройте Docker Desktop вручную (примите лицензию / включите WSL2, если попросит,'
    Write-Err2 'возможна перезагрузка компьютера при первой установке WSL2), дождитесь статуса'
    Write-Err2 '"Running" в трее, затем запустите этот скрипт ещё раз.'
    exit 1
  }
  Write-Ok 'Docker запущен.'
}

# --- Проект ------------------------------------------------------------------

Write-Step 'Устанавливаю зависимости и запускаю проект (npm install && npm run start:all)'
npm install
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
npm run start:all
