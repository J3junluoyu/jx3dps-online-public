@echo off
chcp 65001 >nul
title 明尊计算器（本地版）
cd /d "%~dp0"
if not exist "%~dp0runtime\node.exe" (
  echo 缺少运行文件，请完整解压整个压缩包后再启动。
  pause
  exit /b 1
)
"%~dp0runtime\node.exe" "%~dp0server.cjs"
if errorlevel 1 pause
