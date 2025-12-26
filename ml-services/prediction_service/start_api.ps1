#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Glucose Prediction API - Quick Start Script for Windows PowerShell

.DESCRIPTION
    Activates the virtual environment and starts the Glucose Prediction API server

.EXAMPLE
    .\start_api.ps1
#>

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Glucose Prediction API - Quick Start" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get the script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$projectRoot = Join-Path $scriptDir "..\..\.."

Write-Host "Project directory: $projectRoot" -ForegroundColor Gray

# Check if virtual environment exists
$venvPython = Join-Path $projectRoot ".venv\Scripts\python.exe"
if (-not (Test-Path $venvPython)) {
    Write-Host ""
    Write-Host "ERROR: Virtual environment not found at $projectRoot\.venv" -ForegroundColor Red
    Write-Host "Please create one first:" -ForegroundColor Yellow
    Write-Host "  python -m venv .venv" -ForegroundColor Gray
    exit 1
}

Write-Host ""
Write-Host "Activating virtual environment..." -ForegroundColor Yellow

# Activate virtual environment
& (Join-Path $projectRoot ".venv\Scripts\Activate.ps1")

Write-Host "Virtual environment activated" -ForegroundColor Green

# Check dependencies
Write-Host ""
Write-Host "Checking dependencies..." -ForegroundColor Yellow

try {
    python -c "import tensorflow, flask, numpy, pandas, sklearn" 2>&1 | Out-Null
}
catch {
    Write-Host "Installing missing dependencies..." -ForegroundColor Yellow
    pip install tensorflow flask numpy pandas scikit-learn keras
}

Write-Host "Dependencies verified" -ForegroundColor Green

Write-Host ""
Write-Host "Starting Glucose Prediction API Server..." -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "API Server Starting on http://localhost:5001" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Available Endpoints:" -ForegroundColor Green
Write-Host "  GET  http://localhost:5001/health" -ForegroundColor Gray
Write-Host "  GET  http://localhost:5001/api/glucose-prediction/health" -ForegroundColor Gray
Write-Host "  GET  http://localhost:5001/api/glucose-prediction/features" -ForegroundColor Gray
Write-Host "  POST http://localhost:5001/api/glucose-prediction/predict" -ForegroundColor Gray
Write-Host "  POST http://localhost:5001/api/glucose-prediction/train" -ForegroundColor Gray
Write-Host "  POST http://localhost:5001/api/glucose-prediction/evaluate" -ForegroundColor Gray
Write-Host "  GET  http://localhost:5001/api/glucose-prediction/model-info" -ForegroundColor Gray
Write-Host ""

Write-Host "Testing API before starting..." -ForegroundColor Yellow

try {
    python -c "
import sys
sys.path.insert(0, r'$scriptDir')
from lstm_glucose_model import GlucoseLSTMModel
print('  [OK] LSTM model loaded successfully')
" 2>&1
}
catch {
    Write-Host "  [ERROR] Failed to load LSTM model" -ForegroundColor Red
    exit 1
}

Write-Host "All checks passed. Starting server..." -ForegroundColor Green
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

# Run the API server
Set-Location $scriptDir
python run_api.py

Write-Host ""
Write-Host "API server stopped" -ForegroundColor Yellow
