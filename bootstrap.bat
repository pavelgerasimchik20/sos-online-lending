@echo off
rem Двойной клик по этому файлу запускает bootstrap.ps1, даже если политика
rem выполнения PowerShell на машине по умолчанию блокирует .ps1-скрипты.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0bootstrap.ps1"
echo.
pause
