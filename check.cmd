@echo off
REM Double-click: checks every repository file in this folder against the
REM current version on GitHub and prints a download URL for each one that is
REM missing or outdated. Download check.ps1 fresh first - it carries the list.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0check.ps1" %*
echo.
pause
