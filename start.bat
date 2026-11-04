@echo off
setlocal
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel% equ 0 (
  py -3 "%~dp0start.py"
) else (
  where python >nul 2>nul
  if errorlevel 1 (
    echo Python 3.8 or newer is required. Install Python or open index.html directly.
  ) else (
    python "%~dp0start.py"
  )
)
pause
endlocal
