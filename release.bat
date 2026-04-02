@echo off
setlocal

REM Full release flow:
REM 1) Ensure clean working tree
REM 2) Bump version (patch by default)
REM 3) Ensure CHANGELOG.md has section for that version
REM 4) Publish to VS Code Marketplace + Open VSX
REM 5) Commit + tag vX.Y.Z + push (tag triggers GitHub Release workflow)

set "BUMP=patch"
set "NO_PAUSE="
if /i "%~1"=="--no-pause" (
  set "NO_PAUSE=1"
  shift
)
if not "%~1"=="" set "BUMP=%~1"

for /f "delims=" %%s in ('git status --porcelain') do (
  echo Release aborted: working tree not clean. Please commit/stash changes first.
  if "%NO_PAUSE%"=="" pause
  exit /b 10
)

echo Bumping version: %BUMP%
call npm version %BUMP% --no-git-tag-version
if %ERRORLEVEL% neq 0 exit /b %ERRORLEVEL%

for /f %%v in ('node -p "require('./package.json').version"') do set VERSION=%%v
set TAG=v%VERSION%

findstr /c:"## [%VERSION%]" CHANGELOG.md >nul
if %ERRORLEVEL% neq 0 (
  echo Release aborted: CHANGELOG.md does not contain section "## [%VERSION%]".
  echo Add release notes for %VERSION% and run again.
  if "%NO_PAUSE%"=="" pause
  exit /b 2
)

git rev-parse "%TAG%" >nul 2>nul
if %ERRORLEVEL% equ 0 (
  echo Release aborted: git tag "%TAG%" already exists.
  if "%NO_PAUSE%"=="" pause
  exit /b 3
)

echo Publishing marketplaces...
set "NO_PAUSE=1"
call publish.bat --no-bump --no-pause
if %ERRORLEVEL% neq 0 (
  echo Release aborted: publish.bat failed.
  if "%NO_PAUSE%"=="" pause
  exit /b %ERRORLEVEL%
)

echo.
echo Committing release changes...
git add package.json package-lock.json README.md CHANGELOG.md
git commit -m "Release %TAG%"
if %ERRORLEVEL% neq 0 exit /b %ERRORLEVEL%

echo.
echo Tagging %TAG%...
git tag "%TAG%"
if %ERRORLEVEL% neq 0 exit /b %ERRORLEVEL%

echo.
echo Pushing commit and tag (this triggers GitHub Actions release)...
git push origin
if %ERRORLEVEL% neq 0 exit /b %ERRORLEVEL%

git push origin "%TAG%"
if %ERRORLEVEL% neq 0 exit /b %ERRORLEVEL%

echo.
echo Done: %TAG% published and pushed.
if "%NO_PAUSE%"=="" pause
