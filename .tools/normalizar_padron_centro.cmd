@echo off
setlocal

if "%~1"=="" (
  echo Uso:
  echo   normalizar_padron_centro.cmd archivo.txt
  echo   normalizar_padron_centro.cmd archivo.txt salida.csv
  exit /b 1
)

set "SCRIPT_DIR=%~dp0"

if "%~2"=="" (
  python "%SCRIPT_DIR%normalize_padron_centro.py" "%~1"
) else (
  python "%SCRIPT_DIR%normalize_padron_centro.py" "%~1" -o "%~2"
)
