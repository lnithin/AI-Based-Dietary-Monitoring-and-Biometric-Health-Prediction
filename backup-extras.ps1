# Backup ML Models and Environment Files Only
# Created: December 22, 2025

$timestamp = Get-Date -Format "yyyy-MM-dd_HHmmss"
$backupRoot = "D:\PROJECT_EXTRAS_BACKUP_$timestamp"

Write-Host "🔄 Backing up ML Models and Environment Files..." -ForegroundColor Cyan
Write-Host "Backup Location: $backupRoot`n" -ForegroundColor Yellow

# Create backup directories
New-Item -ItemType Directory -Path "$backupRoot\ml_models" -Force | Out-Null
New-Item -ItemType Directory -Path "$backupRoot\env_files" -Force | Out-Null

# 1. Backup ML Models
Write-Host "🤖 Backing up ML models..." -ForegroundColor Green

$projectPath = "d:\4th year project\PROJECT"
$modelExtensions = @('*.h5', '*.pkl', '*.pt', '*.pth', '*.joblib', '*.json', '*.model')

$modelFiles = Get-ChildItem -Path "$projectPath\ml-services" -Recurse -File -Include $modelExtensions | 
    Where-Object { $_.DirectoryName -like "*\models*" -or $_.Name -like "*model*" -or $_.Name -like "*scaler*" }

$modelCount = 0
foreach ($model in $modelFiles) {
    $relativePath = $model.FullName.Replace("$projectPath\", "")
    $destPath = Join-Path "$backupRoot\ml_models" $relativePath
    $destDir = Split-Path $destPath -Parent
    
    if (-not (Test-Path $destDir)) {
        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    }
    
    Copy-Item $model.FullName -Destination $destPath -Force
    $sizeKB = [math]::Round($model.Length / 1KB, 2)
    Write-Host "  [OK] $($model.Name) - $sizeKB KB" -ForegroundColor Gray
    $modelCount++
}

if ($modelCount -eq 0) {
    Write-Host "  [WARNING] No trained models found in ml-services\models\" -ForegroundColor Yellow
} else {
    Write-Host "[SUCCESS] Backed up $modelCount model files" -ForegroundColor Green
}

# 2. Backup .env files
Write-Host "`n🔐 Backing up environment files..." -ForegroundColor Green

$envFiles = Get-ChildItem -Path $projectPath -Recurse -File -Include *.env,*.env.*,*config.json | 
    Where-Object { $_.Name -notlike "vite.config.js" -and $_.Name -notlike "jest.config.js" }

$envCount = 0
foreach ($env in $envFiles) {
    $relativePath = $env.FullName.Replace("$projectPath\", "")
    $destPath = Join-Path "$backupRoot\env_files" $relativePath
    $destDir = Split-Path $destPath -Parent
    
    if (-not (Test-Path $destDir)) {
        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    }
    
    Copy-Item $env.FullName -Destination $destPath -Force
    Write-Host "  [OK] $relativePath" -ForegroundColor Gray
    $envCount++
}

if ($envCount -eq 0) {
    Write-Host "  [WARNING] No .env files found" -ForegroundColor Yellow
} else {
    Write-Host "[SUCCESS] Backed up $envCount environment files" -ForegroundColor Green
}

# 3. Create restoration guide
$guide = @"
Extras Backup - Restoration Guide
Date: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
Backup Location: $backupRoot

What is in this backup:
- ML Models files: $modelCount files
- Environment files: $envCount files

How to Restore After Fresh Windows Install:

Step 1: Install Prerequisites
- Node.js from https://nodejs.org/
- Python 3.10 or higher from https://www.python.org/
- MongoDB from https://www.mongodb.com/try/download/community
- Git from https://git-scm.com/
- VS Code from https://code.visualstudio.com/

Step 2: Restore Your Project
- Copy your main project backup to target location
- Open PowerShell in project directory

Step 3: Restore ML Models
- Copy model files from ml_models folder to:
  ml-services\prediction_service\models\
  ml-services\cv_service\models\

Step 4: Restore Environment Files
- Copy env files from env_files folder to appropriate locations in your project

Step 5: Install Dependencies
Backend:
   cd backend
   npm install

Frontend:
   cd frontend
   npm install

ML Services:
   cd ml-services\prediction_service
   python -m venv venv
   venv\Scripts\activate
   pip install -r requirements.txt

Step 6: Start Services
- MongoDB: net start MongoDB
- Backend: cd backend and npm start
- ML Services: cd ml-services\prediction_service and python run_api.py
- Frontend: cd frontend and npm run dev

Important Notes:
- If models are missing you will need to retrain them
- Database will be empty - run test-registration.js to create test users
- Check all env files have correct paths and API keys
"@

$guide | Out-File -FilePath "$backupRoot\RESTORATION_GUIDE.txt" -Encoding UTF8

# Calculate backup size
$backupSize = (Get-ChildItem -Path $backupRoot -Recurse -File | Measure-Object -Property Length -Sum).Sum
$backupSizeMB = [math]::Round($backupSize / 1MB, 2)

Write-Host "`n[SUCCESS] Extras Backup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "📦 Location: $backupRoot" -ForegroundColor Yellow
Write-Host "📊 Size: $backupSizeMB MB" -ForegroundColor Yellow
Write-Host "🤖 Models: $modelCount files" -ForegroundColor Yellow
Write-Host "🔐 Env Files: $envCount files" -ForegroundColor Yellow
Write-Host "`n[TIP] Copy to external drive or cloud storage!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Open backup folder
Start-Process explorer.exe -ArgumentList $backupRoot
