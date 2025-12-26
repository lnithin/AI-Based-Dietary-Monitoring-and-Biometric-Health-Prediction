# Stop All Services Script
# Usage: .\stop-all.ps1

Write-Host "============================================" -ForegroundColor Red
Write-Host "  Stopping All Services" -ForegroundColor Red
Write-Host "============================================" -ForegroundColor Red

# Stop Node.js processes (Backend + Frontend)
Write-Host ""
Write-Host "Stopping Node.js services..." -ForegroundColor Yellow
$nodeProcesses = Get-Process -Name node -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    taskkill /F /IM node.exe 2>$null
    Write-Host "   Node.js services stopped" -ForegroundColor Green
} else {
    Write-Host "   No Node.js services running" -ForegroundColor Gray
}

# Stop Python processes on specific ports
Write-Host ""
Write-Host "Stopping Python services..." -ForegroundColor Yellow

# Find and kill process on port 5001 (LSTM)
$lstmPort = Get-NetTCPConnection -LocalPort 5001 -ErrorAction SilentlyContinue
if ($lstmPort) {
    $lstmPID = $lstmPort.OwningProcess
    Stop-Process -Id $lstmPID -Force -ErrorAction SilentlyContinue
    Write-Host "   LSTM service stopped (Port 5001)" -ForegroundColor Green
} else {
    Write-Host "   LSTM service not running (Port 5001)" -ForegroundColor Gray
}

# Find and kill process on port 5002 (CV)
$cvPort = Get-NetTCPConnection -LocalPort 5002 -ErrorAction SilentlyContinue
if ($cvPort) {
    $cvPID = $cvPort.OwningProcess
    Stop-Process -Id $cvPID -Force -ErrorAction SilentlyContinue
    Write-Host "   CV service stopped (Port 5002)" -ForegroundColor Green
} else {
    Write-Host "   CV service not running (Port 5002)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Red
Write-Host "  All Services Stopped!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Red
Write-Host ""
