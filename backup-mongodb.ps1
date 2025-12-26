# Backup MongoDB Database
# December 22, 2025

$timestamp = Get-Date -Format "yyyy-MM-dd_HHmmss"
$backupPath = "D:\MONGODB_BACKUP_$timestamp"

Write-Host "Starting MongoDB backup..." -ForegroundColor Cyan
Write-Host "Backup location: $backupPath" -ForegroundColor Yellow
Write-Host ""

# Create backup directory
New-Item -ItemType Directory -Path $backupPath -Force | Out-Null

# Export the dietary-monitoring database
Write-Host "Exporting database: dietary-monitoring" -ForegroundColor Green

try {
    mongodump --db dietary-monitoring --out $backupPath
    
    if ($LASTEXITCODE -eq 0) {
        $backupSize = (Get-ChildItem -Path $backupPath -Recurse -File | Measure-Object -Property Length -Sum).Sum
        $backupSizeMB = [math]::Round($backupSize / 1MB, 2)
        
        Write-Host ""
        Write-Host "======================================" -ForegroundColor Cyan
        Write-Host "MongoDB Backup Complete!" -ForegroundColor Green
        Write-Host "Location: $backupPath" -ForegroundColor Yellow
        Write-Host "Size: $backupSizeMB MB" -ForegroundColor Yellow
        Write-Host "======================================" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "To restore after fresh install:" -ForegroundColor Cyan
        Write-Host "  mongorestore --db dietary-monitoring $backupPath\dietary-monitoring" -ForegroundColor Gray
        
        Start-Process explorer.exe -ArgumentList $backupPath
    } else {
        Write-Host "ERROR: MongoDB backup failed" -ForegroundColor Red
        Write-Host "Make sure MongoDB is running" -ForegroundColor Yellow
    }
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Possible issues:" -ForegroundColor Yellow
    Write-Host "  1. MongoDB service not running" -ForegroundColor Gray
    Write-Host "  2. mongodump command not found (add to PATH)" -ForegroundColor Gray
    Write-Host "  3. Database 'dietary-monitoring' doesn't exist" -ForegroundColor Gray
}
