@echo off
title Core Banking Backend Service (Port 8082)
echo ========================================================
echo   Starting Core Banking Backend Service on Port 8082
echo   Group 2: Core Banking Engineering
echo ========================================================

REM Run Spring Boot JAR with explicit Gateway URL and Port overrides
java -jar cbd.jar ^
  --server.port=8082 ^
  --group3.gateway.base-url=http://42.156.32.114:8093 ^
  --group3.gateway.internal-key=MMSPG-SEC-KEY-2026 ^
  --spring.config.additional-location=file:./application.properties

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Backend service exited with error code %ERRORLEVEL%.
    pause
)
