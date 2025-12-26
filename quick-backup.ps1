# Quick Backup for ML Models and Environment Files
# December 22, 2025

$timestamp = Get-Date -Format "yyyy-MM-dd_HHmmss"
$backupRoot = "D:\PROJECT_EXTRAS_$timestamp"

Write-Host "Starting backup of ML models and env files..." -ForegroundColor Cyan
Write-Host "Backup location: $backupRoot" -ForegroundColor Yellow
Write-Host ""

New-Item -ItemType Directory -Path "$backupRoot\ml_models" -Force | Out-Null
New-Item -ItemType Directory -Path "$backupRoot\env_files" -Force | Out-Null

$projectPath = "d:\4th year project\PROJECT"

# Backup ML models
Write-Host "Backing up ML models..." -ForegroundColor Green
$modelCount = 0
$modelExts = @('*.h5', '*.pkl', '*.pt', '*.pth', '*.joblib')

Get-ChildItem -Path "$projectPath\ml-services" -Recurse -File -Include $modelExts | ForEach-Object {
    $relativePath = $_.FullName.Replace("$projectPath\", "")
    $destPath = Join-Path "$backupRoot\ml_models" $relativePath
    $destDir = Split-Path $destPath -Parent
    
    if (-not (Test-Path $destDir)) {
        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    }
    
    Copy-Item $_.FullName -Destination $destPath -Force
    $sizeKB = [math]::Round($_.Length / 1KB, 2)
    Write-Host "  Copied: $($_.Name) - ${sizeKB} KB" -ForegroundColor Gray
    $modelCount++
}

if ($modelCount -eq 0) {
    Write-Host "  WARNING: No model files found" -ForegroundColor Yellow
} else {
    Write-Host "Successfully backed up $modelCount model files" -ForegroundColor Green
}

# Backup environment files
Write-Host ""
Write-Host "Backing up environment files..." -ForegroundColor Green
$envCount = 0

Get-ChildItem -Path $projectPath -Recurse -File -Filter "*.env*" | ForEach-Object {
    $relativePath = $_.FullName.Replace("$projectPath\", "")
    $destPath = Join-Path "$backupRoot\env_files" $relativePath
    $destDir = Split-Path $destPath -Parent
    
    if (-not (Test-Path $destDir)) {
        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    }
    
    Copy-Item $_.FullName -Destination $destPath -Force
    Write-Host "  Copied: $relativePath" -ForegroundColor Gray
    $envCount++
}

if ($envCount -eq 0) {
    Write-Host "  WARNING: No .env files found" -ForegroundColor Yellow
} else {
    Write-Host "Successfully backed up $envCount environment files" -ForegroundColor Green
}

# Calculate total size
$backupSize = (Get-ChildItem -Path $backupRoot -Recurse -File | Measure-Object -Property Length -Sum).Sum
$backupSizeMB = [math]::Round($backupSize / 1MB, 2)

# Create simple readme
$readme = "BACKUP CREATED: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')

Contents:
- ML Model files: $modelCount
- Environment files: $envCount
- Total size: $backupSizeMB MB

To restore:
1. Copy ml_models contents to your project ml-services folders
2. Copy env_files contents to their original locations
3. Retrain models if any are missing
"

$readme | Out-File -FilePath "$backupRoot\README.txt" -Encoding UTF8

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Backup Complete!" -ForegroundColor Green
Write-Host "Location: $backupRoot" -ForegroundColor Yellow
Write-Host "Size: $backupSizeMB MB" -ForegroundColor Yellow
Write-Host "Models: $modelCount files" -ForegroundColor Yellow
Write-Host "Env files: $envCount files" -ForegroundColor Yellow
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "TIP: Copy this folder to external drive!" -ForegroundColor Cyan

Start-Process explorer.exe -ArgumentList $backupRoot
