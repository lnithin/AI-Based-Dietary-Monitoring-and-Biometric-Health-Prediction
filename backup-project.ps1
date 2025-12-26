# Project Backup Script
# Created: December 22, 2025

$timestamp = Get-Date -Format "yyyy-MM-dd_HHmmss"
$backupRoot = "D:\PROJECT_BACKUP_$timestamp"

Write-Host "🔄 Starting Project Backup..." -ForegroundColor Cyan
Write-Host "Backup Location: $backupRoot`n" -ForegroundColor Yellow

# Create backup directory structure
New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null
New-Item -ItemType Directory -Path "$backupRoot\source_code" -Force | Out-Null
New-Item -ItemType Directory -Path "$backupRoot\ml_models" -Force | Out-Null
New-Item -ItemType Directory -Path "$backupRoot\env_files" -Force | Out-Null

# 1. Backup entire project source code (excluding node_modules, venv, pycache)
Write-Host "📂 Backing up source code..." -ForegroundColor Green
$excludeDirs = @('node_modules', '__pycache__', '.venv', 'venv', 'dist', 'build', '.git')

$sourceFiles = Get-ChildItem -Path "d:\4th year project\PROJECT" -Recurse -File | 
    Where-Object { 
        $exclude = $false
        foreach ($dir in $excludeDirs) {
            if ($_.FullName -match [regex]::Escape("\$dir\")) {
                $exclude = $true
                break
            }
        }
        -not $exclude
    }

$totalFiles = $sourceFiles.Count
$currentFile = 0

foreach ($file in $sourceFiles) {
    $currentFile++
    $relativePath = $file.FullName.Replace("d:\4th year project\PROJECT\", "")
    $destPath = Join-Path "$backupRoot\source_code" $relativePath
    $destDir = Split-Path $destPath -Parent
    
    if (-not (Test-Path $destDir)) {
        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    }
    
    Copy-Item $file.FullName -Destination $destPath -Force
    
    if ($currentFile % 50 -eq 0) {
        Write-Progress -Activity "Copying files" -Status "$currentFile of $totalFiles files" -PercentComplete (($currentFile / $totalFiles) * 100)
    }
}
Write-Progress -Activity "Copying files" -Completed
Write-Host "✅ Copied $totalFiles source files" -ForegroundColor Green

# 2. Backup ML Models (specifically)
Write-Host "`n🤖 Backing up ML models..." -ForegroundColor Green

$modelPaths = @(
    "ml-services\prediction_service\models",
    "ml-services\cv_service\models",
    "ml-services\nlp_service\models",
    "ml-services\recommendation_service\models",
    "ml-services\xai_service\models"
)

foreach ($modelPath in $modelPaths) {
    $fullPath = "d:\4th year project\PROJECT\$modelPath"
    if (Test-Path $fullPath) {
        $destPath = "$backupRoot\ml_models\$modelPath"
        $destDir = Split-Path $destPath -Parent
        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
        
        $modelFiles = Get-ChildItem -Path $fullPath -File -Recurse -Include *.h5,*.pkl,*.pt,*.pth,*.joblib,*.json
        foreach ($model in $modelFiles) {
            $relativePath = $model.FullName.Replace($fullPath, "")
            $destFile = Join-Path $destPath $relativePath
            $destFileDir = Split-Path $destFile -Parent
            
            if (-not (Test-Path $destFileDir)) {
                New-Item -ItemType Directory -Path $destFileDir -Force | Out-Null
            }
            
            Copy-Item $model.FullName -Destination $destFile -Force
            Write-Host "  ✓ $($model.Name)" -ForegroundColor Gray
        }
    }
}

# 3. Backup .env files
Write-Host "`n🔐 Backing up environment files..." -ForegroundColor Green

$envFiles = Get-ChildItem -Path "d:\4th year project\PROJECT" -Recurse -File -Include *.env,*.env.example,*.env.local

foreach ($env in $envFiles) {
    $relativePath = $env.FullName.Replace("d:\4th year project\PROJECT\", "")
    $destPath = Join-Path "$backupRoot\env_files" $relativePath
    $destDir = Split-Path $destPath -Parent
    
    if (-not (Test-Path $destDir)) {
        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    }
    
    Copy-Item $env.FullName -Destination $destPath -Force
    Write-Host "  ✓ $relativePath" -ForegroundColor Gray
}

# 4. Create backup summary
$summary = @"
# Project Backup Summary
Date: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
Backup Location: $backupRoot

## What was backed up:
✅ Source Code ($totalFiles files)
✅ ML Models (.h5, .pkl, .pt files)
✅ Environment Files (.env files)

## What was NOT backed up:
❌ node_modules/ folders
❌ __pycache__/ folders
❌ Virtual environments (.venv, venv)
❌ Build outputs (dist/, build/)
❌ MongoDB database data

## To Restore:
1. Copy source_code folder contents to your project directory
2. Copy ml_models to appropriate locations
3. Copy env_files to appropriate locations
4. Run: npm install (in backend and frontend)
5. Run: pip install -r requirements.txt (in ml-services)
6. Retrain models if needed or restore from ml_models backup

## After Fresh Windows Install:
1. Install Node.js (https://nodejs.org/)
2. Install Python (https://www.python.org/)
3. Install MongoDB (https://www.mongodb.com/try/download/community)
4. Install Git (https://git-scm.com/)
5. Install VS Code (https://code.visualstudio.com/)
6. Restore this backup
7. Run npm install and pip install
"@

$summary | Out-File -FilePath "$backupRoot\BACKUP_README.txt" -Encoding UTF8

# Calculate backup size
$backupSize = (Get-ChildItem -Path $backupRoot -Recurse -File | Measure-Object -Property Length -Sum).Sum
$backupSizeMB = [math]::Round($backupSize / 1MB, 2)

Write-Host "`n✅ Backup Complete!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "📦 Backup Location: $backupRoot" -ForegroundColor Yellow
Write-Host "📊 Total Size: $backupSizeMB MB" -ForegroundColor Yellow
Write-Host "📄 Files Backed Up: $totalFiles" -ForegroundColor Yellow
Write-Host "`n💡 Tip: Copy this backup to external drive or cloud storage!" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

# Open backup folder
Start-Process explorer.exe -ArgumentList $backupRoot
