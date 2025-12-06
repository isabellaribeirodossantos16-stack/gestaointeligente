@echo off
echo Iniciando a instalacao de dependencias...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo Erro ao executar npm install. Encerrando.
    pause
    exit /b %ERRORLEVEL%
)

echo ---
echo Instalacao concluida. Iniciando o servidor de desenvolvimento em uma NOVA JANELA...
start "Vite Server" npm run dev

echo ---
echo Dando 5 segundos para o servidor iniciar completamente...
ping -n 6 127.0.0.1 > nul

echo ---
echo Abrindo a pagina no navegador...
start http://localhost:3000/

echo ---
echo Script concluido. O servidor esta rodando na janela separada.
pause