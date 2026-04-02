@echo off
setlocal

set "NO_PAUSE="
if /i "%~1"=="--no-pause" (
  set "NO_PAUSE=1"
  shift
)

:: Get the commit message from arguments, default to "Update settings"
set "msg=%~1"
if "%msg%"=="" set "msg=Update settings (%date% %time%)"

echo Starting commit and push process...
echo ----------------------------------

:: Add all changes
echo [1/3] Staging changes...
git add .

:: Commit
echo [2/3] Committing changes with message: "%msg%"
git commit -m "%msg%"

:: Push (to origin which has both GitHub and GitLab)
echo [3/3] Pushing to GitHub and GitLab...
git push origin

echo ----------------------------------
echo Done!
if "%NO_PAUSE%"=="" pause
