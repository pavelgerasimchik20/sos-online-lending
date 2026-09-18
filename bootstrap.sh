#!/usr/bin/env bash
# Проверяет наличие Node.js и Docker, при необходимости пытается установить их
# (Homebrew на macOS, apt/dnf/pacman или get.docker.com на Linux), затем
# поднимает проект (npm install && npm run start:all).
#
# Ограничение: на macOS Docker Desktop после установки нужно один раз
# запустить вручную и принять лицензию — это ограничение самого Docker
# Desktop, обойти его автоматически нельзя. На Linux ставится Docker Engine
# (без GUI) через официальный скрипт get.docker.com — там ручных шагов, как
# правило, не требуется (кроме перезахода в систему для применения группы
# docker, если пользователь был добавлен в неё только что).

set -euo pipefail

step() { printf '\n==> %s\n' "$1"; }
ok() { printf '    \033[32m%s\033[0m\n' "$1"; }
warn() { printf '    \033[33m%s\033[0m\n' "$1"; }
err() { printf '    \033[31m%s\033[0m\n' "$1" >&2; }

have() { command -v "$1" >/dev/null 2>&1; }

OS="$(uname -s)"

# --- Node.js -----------------------------------------------------------------

step 'Проверяю Node.js'
if have node; then
  ok "Node.js уже установлен: $(node -v)"
else
  warn 'Node.js не найден. Пытаюсь установить...'
  case "$OS" in
    Darwin)
      if ! have brew; then
        warn 'Homebrew не найден, устанавливаю...'
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        eval "$(/opt/homebrew/bin/brew shellenv 2>/dev/null || /usr/local/bin/brew shellenv 2>/dev/null || true)"
      fi
      brew install node
      ;;
    Linux)
      if have apt-get; then
        curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
        sudo apt-get install -y nodejs
      elif have dnf; then
        curl -fsSL https://rpm.nodesource.com/setup_lts.x | sudo bash -
        sudo dnf install -y nodejs
      elif have pacman; then
        sudo pacman -Sy --noconfirm nodejs npm
      else
        err 'Не удалось определить пакетный менеджер.'
        err 'Установите Node.js вручную: https://nodejs.org/ (LTS) и запустите скрипт снова.'
        exit 1
      fi
      ;;
    *)
      err "Неизвестная ОС ($OS)."
      err 'Установите Node.js вручную: https://nodejs.org/ (LTS) и запустите скрипт снова.'
      exit 1
      ;;
  esac
  if ! have node; then
    err 'Не удалось автоматически установить Node.js.'
    err 'Установите вручную: https://nodejs.org/ и запустите скрипт снова.'
    exit 1
  fi
  ok "Node.js установлен: $(node -v)"
fi

# --- Docker --------------------------------------------------------------------

step 'Проверяю Docker'
docker_running() { have docker && docker info >/dev/null 2>&1; }

if docker_running; then
  ok 'Docker установлен и запущен.'
else
  if ! have docker; then
    warn 'Docker не найден. Пытаюсь установить...'
    case "$OS" in
      Darwin)
        if ! have brew; then
          err 'Homebrew не найден. Установите Docker Desktop вручную:'
          err 'https://www.docker.com/products/docker-desktop/'
          exit 1
        fi
        brew install --cask docker
        warn 'Docker Desktop установлен. Открываю (потребуется один раз принять лицензию)...'
        open -a Docker || true
        ;;
      Linux)
        curl -fsSL https://get.docker.com | sudo sh
        sudo usermod -aG docker "$USER" || true
        sudo systemctl enable --now docker || true
        warn 'Docker Engine установлен. Если команда docker недоступна — перезайдите в систему'
        warn '(чтобы применилось членство в группе docker) и запустите скрипт ещё раз.'
        ;;
      *)
        err "Неизвестная ОС ($OS). Установите Docker вручную: https://www.docker.com/products/docker-desktop/"
        exit 1
        ;;
    esac
  fi

  step 'Жду запуска Docker (до 3 минут)...'
  ready=0
  for _ in $(seq 1 36); do
    if docker_running; then
      ready=1
      break
    fi
    sleep 5
  done

  if [ "$ready" -ne 1 ]; then
    err 'Docker не запустился автоматически за отведённое время.'
    err 'Запустите Docker Desktop (macOS) или сервис docker (Linux: sudo systemctl start docker)'
    err 'вручную, дождитесь готовности, затем запустите этот скрипт ещё раз.'
    exit 1
  fi
  ok 'Docker запущен.'
fi

# --- Проект ------------------------------------------------------------------

step 'Устанавливаю зависимости и запускаю проект (npm install && npm run start:all)'
npm install
npm run start:all
