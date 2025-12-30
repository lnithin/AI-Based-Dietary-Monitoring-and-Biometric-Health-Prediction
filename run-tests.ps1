# Quick Test Runner for AI-Based Dietary Monitoring System
# Run this script to execute end-to-end validation

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "AI Dietary Monitoring - E2E Test Runner" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Check if Python is available
$pythonCmd = Get-Command python -ErrorAction SilentlyContinue
if (-not $pythonCmd) {
    Write-Host "ERROR: Python not found. Please install Python 3.8+" -ForegroundColor Red
    exit 1
}

$pythonVersion = python --version
Write-Host "Using: $pythonVersion" -ForegroundColor Green

# Check if required packages are installed
Write-Host "`nChecking dependencies..." -ForegroundColor Yellow
$packagesOk = $true

try {
    python -c "import requests" 2>$null
} catch {
    Write-Host "  [MISSING] requests" -ForegroundColor Red
    $packagesOk = $false
}

try {
    python -c "import pymongo" 2>$null
} catch {
    Write-Host "  [OPTIONAL] pymongo (database tests will be skipped)" -ForegroundColor Yellow
}

if (-not $packagesOk) {
    Write-Host "`nInstalling missing dependencies..." -ForegroundColor Yellow
    pip install requests
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to install dependencies" -ForegroundColor Red
        exit 1
    }
}

Write-Host "  All required dependencies available" -ForegroundColor Green

# Check if services are running
Write-Host "`nChecking services..." -ForegroundColor Yellow

$backendUp = $false
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/health" -TimeoutSec 2 -UseBasicParsing -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        Write-Host "  [OK] Backend (port 8000)" -ForegroundColor Green
        $backendUp = $true
    }
} catch {
    Write-Host "  [DOWN] Backend (port 8000)" -ForegroundColor Red
}

$lstmUp = $false
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5001/health" -TimeoutSec 2 -UseBasicParsing -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        Write-Host "  [OK] LSTM Service (port 5001)" -ForegroundColor Green
        $lstmUp = $true
    }
} catch {
    Write-Host "  [DOWN] LSTM Service (port 5001)" -ForegroundColor Red
}

try {
    $response = Invoke-WebRequest -Uri "http://localhost:5002/health" -TimeoutSec 2 -UseBasicParsing -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        Write-Host "  [OK] CV Service (port 5002)" -ForegroundColor Green
    }
} catch {
    Write-Host "  [OPTIONAL] CV Service (port 5002)" -ForegroundColor Yellow
}

if (-not $backendUp -or -not $lstmUp) {
    Write-Host "`nWARNING: Required services are not running!" -ForegroundColor Red
    Write-Host "Please start services with: .\start-all.ps1" -ForegroundColor Yellow
    $response = Read-Host "`nContinue anyway? (y/N)"
    if ($response -ne "y" -and $response -ne "Y") {
        exit 1
    }
}

# Run tests
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Running End-to-End Tests..." -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

python test_system_e2e.py

$exitCode = $LASTEXITCODE

# Show report location
if (Test-Path "test_report.json") {
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "Test report saved to: test_report.json" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    
    # Optionally open report
    $openReport = Read-Host "`nOpen test report in browser? (y/N)"
    if ($openReport -eq "y" -or $openReport -eq "Y") {
        # Create simple HTML viewer
        $html = @"
<!DOCTYPE html>
<html>
<head>
    <title>Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
        .container { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        h1 { color: #333; }
        .pass { color: green; }
        .fail { color: red; }
        .skip { color: orange; }
        pre { background: #f8f8f8; padding: 15px; border-radius: 4px; overflow-x: auto; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Test Report</h1>
        <pre id="report"></pre>
    </div>
    <script>
        fetch('test_report.json')
            .then(r => r.json())
            .then(data => {
                document.getElementById('report').textContent = JSON.stringify(data, null, 2);
            });
    </script>
</body>
</html>
"@
        Set-Content -Path "test_report.html" -Value $html
        Start-Process "test_report.html"
    }
}

exit $exitCode
