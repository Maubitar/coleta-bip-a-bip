@echo off
cd /d "%~dp0"

where python >nul 2>nul
if errorlevel 1 (
    echo.
    echo ============================================================
    echo  Python nao encontrado neste PC.
    echo  Instale em https://www.python.org/downloads/
    echo  (marque a opcao "Add python.exe to PATH" na instalacao)
    echo  Depois de instalar, rode este arquivo de novo.
    echo ============================================================
    echo.
    pause
    exit /b 1
)

echo Iniciando servidor local em http://localhost:8000 ...
start "" http://localhost:8000/index.html
python -m http.server 8000
