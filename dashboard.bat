@echo off
REM dashboard.bat — lets you run "dashboard notes", "dashboard serve", etc.
REM from anywhere in the repo instead of "cd python && python generate_notes_index.py".
REM
REM Place this file at the repo root (next to src/, python/, tools/).
REM To use it as a bare "dashboard" command from any terminal, add the
REM repo root to your PATH once:
REM     setx PATH "%PATH%;C:\path\to\this\repo"
REM (open a new terminal after running that once)
REM
REM Without adding it to PATH, you can still run it directly from the
REM repo root as:  dashboard.bat notes

setlocal
set SCRIPT_DIR=%~dp0
python "%SCRIPT_DIR%python\dashboard.py" %*
endlocal
