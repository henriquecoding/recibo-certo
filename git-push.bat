@echo off
cd /d "%~dp0"
git add -A
git commit -m "fix: corrigir bugs mobile e de logica no simulador"
git push
pause
