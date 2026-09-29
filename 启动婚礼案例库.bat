@echo off
if not defined CODEX_HOME set "CODEX_HOME=G:\gpt\codex"
cd /d "%~dp0"
start "诺漫婚礼案例库" "http://localhost:4188"
"C:\Program Files\nodejs\node.exe" server.js
