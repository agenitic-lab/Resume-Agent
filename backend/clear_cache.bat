@echo off
REM Clear Python bytecode cache
REM Run this if you experience issues with old code being executed

echo Clearing Python cache files...
echo.

REM Delete all __pycache__ directories
for /d /r . %%d in (__pycache__) do @if exist "%%d" rd /s /q "%%d"

REM Delete all .pyc files
del /s /q *.pyc 2>nul
del /s /q *.pyo 2>nul

echo.
echo Cache cleared successfully!
echo.
echo If running uvicorn, it should auto-reload.
echo Otherwise, restart your Python server.
echo.
pause
