# Start All Services Script
# Usage: .\start-all.ps1

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Starting All Services" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

# Check if services are already running
$backendRunning = Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object {$_.Path -like "*backend*"}
$cvServiceRunning = Get-NetTCPConnection -LocalPort 5002 -ErrorAction SilentlyContinue
$lstmServiceRunning = Get-NetTCPConnection -LocalPort 5001 -ErrorAction SilentlyContinue

if ($backendRunning) {
    Write-Host "Warning: Backend already running. Stopping..." -ForegroundColor Yellow
    taskkill /F /IM node.exe 2>$null
    Start-Sleep -Seconds 2
}

# Start Backend
Write-Host ""
Write-Host "Starting Backend (Port 8000)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'd:\4th year project\PROJECT\backend'; npm start" -WindowStyle Normal

Start-Sleep -Seconds 3

# Start Frontend
Write-Host "Starting Frontend (Port 5173)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'd:\4th year project\PROJECT\frontend'; npm run dev" -WindowStyle Normal

Start-Sleep -Seconds 2

# Start LSTM Prediction Service
Write-Host "Starting LSTM Prediction Service (Port 5001)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'd:\4th year project\PROJECT\ml-services\prediction_service'; python run_api.py" -WindowStyle Normal

Start-Sleep -Seconds 2

# Start CV Service
Write-Host "Starting CV Service (Port 5002)..." -ForegroundColor Green
Start-Process cmd -ArgumentList "/k", "cd /d `"D:\4th year project\PROJECT\ml-services\cv_service`" && `"C:\Program Files\Python39\python.exe`" app.py" -WindowStyle Normal

Start-Sleep -Seconds 3

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  All Services Started!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Service URLs:" -ForegroundColor White
Write-Host "  Frontend:    http://localhost:5173" -ForegroundColor Cyan
Write-Host "  Backend:     http://localhost:8000" -ForegroundColor Cyan
Write-Host "  LSTM API:    http://localhost:5001" -ForegroundColor Cyan
Write-Host "  CV Service:  http://localhost:5002" -ForegroundColor Cyan
Write-Host ""
Write-Host "Tip: Close terminal windows to stop services" -ForegroundColor Yellow
Write-Host "Or run: .\stop-all.ps1" -ForegroundColor Yellow
Write-Host ""
