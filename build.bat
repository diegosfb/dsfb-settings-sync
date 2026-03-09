@echo on
call npm install @vscode/vsce --save-dev
call npx vsce package
