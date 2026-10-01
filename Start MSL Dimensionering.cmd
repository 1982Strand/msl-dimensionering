@echo off
rem Starter MSL Dimensionering lokalt og aabner appen i browseren (http://127.0.0.1:5174/).
rem Koerer serveren allerede, aabnes appen blot. Luk vinduet for at stoppe serveren.
setlocal
chcp 65001 >nul
cd /d "%~dp0"
title MSL Dimensionering
set "PORT=5174"
set "URL=http://127.0.0.1:%PORT%/"

powershell -NoProfile -Command "try { (New-Object Net.Sockets.TcpClient).Connect('127.0.0.1', %PORT%); exit 0 } catch { exit 1 }"
if not errorlevel 1 (
  echo Serveren kører allerede. Appen åbnes i browseren.
  start "" "%URL%"
  exit /b 0
)

where node >nul 2>nul || (
  echo Node.js 24 eller nyere skal være installeret: https://nodejs.org/
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo Installerer afhængigheder ...
  call npm ci || goto fejl
)

rem Appen bygges kun, når koden er ændret siden sidste bygning, eller der ingen bygning er.
set "COMMIT="
for /f %%c in ('git rev-parse HEAD 2^>nul') do set "COMMIT=%%c"
set "BYGGET="
if exist "dist\.bygget" set /p BYGGET=<"dist\.bygget"
if not exist "dist\index.html" goto byg
if "%COMMIT%"=="" goto start
if "%COMMIT%"=="%BYGGET%" goto start
:byg
echo Bygger appen ...
call npm run build || goto fejl
if not "%COMMIT%"=="" >"dist\.bygget" echo %COMMIT%

:start
rem Browseren åbnes, så snart serveren svarer (højst et minut).
start "" /b powershell -NoProfile -Command "for ($i = 0; $i -lt 120; $i++) { try { (New-Object Net.Sockets.TcpClient).Connect('127.0.0.1', %PORT%); Start-Process '%URL%'; break } catch { Start-Sleep -Milliseconds 500 } }"
echo.
echo MSL Dimensionering kører på %URL%
echo Luk dette vindue for at stoppe serveren.
echo.
call npm run preview
exit /b 0

:fejl
echo.
echo Appen kunne ikke startes. Se fejlen ovenfor.
pause
exit /b 1
