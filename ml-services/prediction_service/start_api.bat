@echo off
REM Glucose Prediction API - Quick Start Script for Windows

setlocal enabledelayedexpansion

echo.
echo ========================================
echo Glucose Prediction API - Quick Start
echo ========================================
echo.

REM Get the script directory
set "SCRIPT_DIR=%~dp0"
echo Script directory: !SCRIPT_DIR!

REM Check if virtual environment exists
if not exist "!SCRIPT_DIR!..\..\\.venv\Scripts\python.exe" (
    echo ERROR: Virtual environment not found at .venv
    echo Please create one first:
    echo   python -m venv .venv
    exit /b 1
)

echo.
echo Activating virtual environment...
call "!SCRIPT_DIR!..\..\\.venv\Scripts\activate.bat"

if errorlevel 1 (
    echo ERROR: Failed to activate virtual environment
    exit /b 1
)

echo.
echo Checking dependencies...
python -c "import tensorflow, flask, numpy, pandas, sklearn" 2>nul
if errorlevel 1 (
    echo ERROR: Missing dependencies. Installing...
    pip install tensorflow flask numpy pandas scikit-learn keras
    if errorlevel 1 (
        echo ERROR: Failed to install dependencies
        exit /b 1
    )
)

echo.
echo Starting Glucose Prediction API Server...
echo.
echo ========================================
echo API Server Starting on http://localhost:5001
echo ========================================
echo.
echo Endpoints available:
echo   GET  http://localhost:5001/health
echo   GET  http://localhost:5001/api/glucose-prediction/health
echo   GET  http://localhost:5001/api/glucose-prediction/features
echo   POST http://localhost:5001/api/glucose-prediction/predict
echo   POST http://localhost:5001/api/glucose-prediction/train
echo   POST http://localhost:5001/api/glucose-prediction/evaluate
echo   GET  http://localhost:5001/api/glucose-prediction/model-info
echo.
echo Press Ctrl+C to stop the server
echo.

REM Run the API server
python "!SCRIPT_DIR!run_api.py"

if errorlevel 1 (
    echo.
    echo ERROR: Failed to start API server
    echo Check that all dependencies are installed
    pause
    exit /b 1
)

pause
