@echo off
chcp 65001 >nul
set SCRIPT_DIR=%~dp0

powershell -NoProfile -Command ^
  "$ws = New-Object -COM WScript.Shell;" ^
  "$atalho = $ws.CreateShortcut([System.IO.Path]::Combine([Environment]::GetFolderPath('Desktop'), 'Coleta Bip-a-Bip.lnk'));" ^
  "$atalho.TargetPath = '%SCRIPT_DIR%index.html';" ^
  "$atalho.WorkingDirectory = '%SCRIPT_DIR%';" ^
  "$atalho.Description = 'Coleta Bip-a-Bip - Pet''s Go';" ^
  "$atalho.Save()"

if %errorlevel%==0 (
    echo.
    echo ============================================================
    echo  Pronto! Um icone "Coleta Bip-a-Bip" foi criado na
    echo  Area de Trabalho deste computador.
    echo  A partir de agora, e so dar 2 cliques nele para abrir o app.
    echo ============================================================
) else (
    echo.
    echo Nao foi possivel criar o atalho automaticamente.
    echo Alternativa: clique com o botao direito no arquivo "index.html"
    echo dentro desta pasta e escolha "Enviar para" - "Area de trabalho".
)
echo.
pause
