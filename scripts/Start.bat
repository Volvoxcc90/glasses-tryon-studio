@echo off
setlocal

set PORT=8000

REM запускаем backend.exe в фоне
start "" /min "%~dp0backend.exe"

REM ждём, пока backend поднимется
set TRY=0
:WAIT
set /a TRY+=1
if %TRY% GTR 60 goto CONTINUE
curl -s http://127.0.0.1:%PORT%/health >nul 2>&1
if %ERRORLEVEL%==0 goto CONTINUE
timeout /t 1 >nul
goto WAIT

:CONTINUE
start "" "%~dp0GlassesTryOnStudio.exe"
endlocal
