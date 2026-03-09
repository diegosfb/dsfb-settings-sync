@echo off
echo Building and Packaging...
call npm run package

if %ERRORLEVEL% neq 0 (
    echo Build failed! Exiting...
    exit /b %ERRORLEVEL%
)

echo Publishing to VS Code Marketplace...
call npx vsce publish
if %ERRORLEVEL% neq 0 (
    echo VSCE Publish failed!
)

echo Publishing to Open VSX...
if "%OVSX_PAT%"=="" (
    echo ERROR: OVSX_PAT environment variable is not set.
    echo Please set it with: set OVSX_PAT=your_token
    goto :end
)
call npx ovsx publish -p %OVSX_PAT%
if %ERRORLEVEL% neq 0 (
    echo Open VSX Publish failed!
)

:end
pause
