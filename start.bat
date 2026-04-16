@echo off
echo Starting PassTan Marathon Server...
echo.
echo http://localhost:8085
echo.
start http://localhost:8085
npx -y http-server -p 8085 -c-1 --cors
pause
