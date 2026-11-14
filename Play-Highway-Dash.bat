@echo off
rem Starts the local server and opens the game in your browser.
rem In Edge/Chrome use the "Install" icon in the address bar to put Highway Showdown on your desktop as an app.
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js was not found. Install it from https://nodejs.org and run this again. & pause & exit /b 1)
start "" http://localhost:8123/car-game.html
node serve.js
