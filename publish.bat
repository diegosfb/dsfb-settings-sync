@echo off
setlocal

set "NO_BUMP="
set "NO_PAUSE="

if /i "%~1"=="--no-bump" set "NO_BUMP=1"
if /i "%~1"=="--no-pause" set "NO_PAUSE=1"
if /i "%~2"=="--no-pause" set "NO_PAUSE=1"

echo Loading environment variables...
for %%f in (.env token.env) do (
    if exist %%f (
        echo Loading from %%f...
        for /f "usebackq tokens=1,2 delims==" %%a in ("%%f") do (
            set %%a=%%b
        )
    )
)

if not exist .\node_modules\.bin\vsce.cmd (
    echo Installing dependencies...
    call npm ci
    if %ERRORLEVEL% neq 0 exit /b %ERRORLEVEL%
)

if "%NO_BUMP%"=="" (
    echo Bumping version...
    call npm version patch --no-git-tag-version
    if %ERRORLEVEL% neq 0 exit /b %ERRORLEVEL%
) else (
    echo Skipping version bump (--no-bump)
)

echo Building and Packaging...
call npm run package

if %ERRORLEVEL% neq 0 (
    echo Build failed! Exiting...
    exit /b %ERRORLEVEL%
)

echo Publishing to VS Code Marketplace...
call .\node_modules\.bin\vsce.cmd publish
if %ERRORLEVEL% neq 0 (
    echo VSCE Publish failed!
    exit /b %ERRORLEVEL%
)

echo Publishing to Open VSX...
if "%OVSX_PAT%"=="" (
    echo ERROR: OVSX_PAT environment variable is not set.
    echo Please set it in .env file: OVSX_PAT=your_token
    exit /b 2
)
call .\node_modules\.bin\ovsx.cmd publish -p %OVSX_PAT%
if %ERRORLEVEL% neq 0 (
    echo Open VSX Publish failed!
    exit /b %ERRORLEVEL%
)

:version
for /f %%v in ('node -p "require('./package.json').version"') do set VERSION=%%v
echo.
echo Published version: %VERSION%
echo Tip: push a tag v%VERSION% to trigger GitHub Release workflow.

if "%NO_PAUSE%"=="" pause
exit /b 0
