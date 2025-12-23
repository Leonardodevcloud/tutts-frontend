@echo off
echo ========================================
echo   Sistema Tutts - Build e Deploy
echo ========================================
echo.

:: Executa o build (atualiza versao do SW)
echo [1/4] Atualizando versao do Service Worker...
node build.js

if %ERRORLEVEL% NEQ 0 (
    echo ERRO: Falha no build!
    pause
    exit /b 1
)

echo.
echo [2/4] Adicionando arquivos ao Git...
git add .

echo.
echo [3/4] Criando commit...
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set VERSION=%datetime:~0,8%_%datetime:~8,6%
git commit -m "Deploy v%VERSION%"

echo.
echo [4/4] Enviando para o repositorio (deploy automatico Vercel)...
git push

echo.
echo ========================================
echo   Deploy concluido com sucesso!
echo ========================================
echo.
pause
