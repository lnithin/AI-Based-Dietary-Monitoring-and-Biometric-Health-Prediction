# Food Recognition Test Script
# PowerShell script to test the improved food recognition

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "   FOOD RECOGNITION ACCURACY TEST" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# Test 1: Check services
Write-Host "`nTest 1: Checking Services..." -ForegroundColor Yellow

$cvService = $false
$backend = $false

try {
    $response = Invoke-WebRequest -Uri "http://localhost:5002/health" -Method GET -UseBasicParsing -TimeoutSec 3
    if ($response.StatusCode -eq 200) {
        Write-Host "  ✅ CV Service is running" -ForegroundColor Green
        $cvService = $true
    }
} catch {
    Write-Host "  ❌ CV Service not running (optional)" -ForegroundColor Red
    Write-Host "     Start with: cd ml-services\cv_service; python app.py" -ForegroundColor Gray
}

try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/api/health" -Method GET -UseBasicParsing -TimeoutSec 3
    if ($response.StatusCode -eq 200) {
        Write-Host "  ✅ Backend is running" -ForegroundColor Green
        $backend = $true
    }
} catch {
    Write-Host "  ❌ Backend not running" -ForegroundColor Red
    Write-Host "     Start with: cd backend; npm start" -ForegroundColor Gray
    exit
}

# Test 2: Text-based recognition
Write-Host "`nTest 2: Text-Based Food Recognition..." -ForegroundColor Yellow

$testCases = @(
    @{desc="I ate dosa for breakfast"; expected="Dosa"},
    @{desc="Had 2 idlis with sambar"; expected="Idli"},
    @{desc="Lunch was veg biryani"; expected="Biryani"},
    @{desc="Evening snack - medu vada"; expected="Vada"},
    @{desc="Dinner: 3 chapatis"; expected="Chapati"},
    @{desc="pongal"; expected="Pongal"},
    @{desc="white rice and curry"; expected="White Rice"},
    @{desc="poori and potato curry"; expected="Poori"}
)

$successCount = 0
foreach ($test in $testCases) {
    $body = @{
        description = $test.desc
    } | ConvertTo-Json
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8000/api/meals/extract" `
            -Method POST `
            -Body $body `
            -ContentType "application/json" `
            -UseBasicParsing `
            -TimeoutSec 5
        
        $result = $response.Content | ConvertFrom-Json
        if ($result.success -eq $true) {
            $matched = $result.foodMatched.foodName
            if ($matched -like "*$($test.expected)*") {
                Write-Host "  ✅ '$($test.desc)' → $matched" -ForegroundColor Green
                $successCount++
            } else {
                Write-Host "  ⚠️  '$($test.desc)' → $matched (expected $($test.expected))" -ForegroundColor Yellow
            }
        } else {
            Write-Host "  ❌ '$($test.desc)' → No match" -ForegroundColor Red
        }
    } catch {
        Write-Host "  ❌ '$($test.desc)' → Error" -ForegroundColor Red
    }
}

$accuracy = [math]::Round(($successCount / $testCases.Count) * 100, 1)
Write-Host "`n  Accuracy: $successCount/$($testCases.Count) ($accuracy%)" -ForegroundColor Cyan

# Test 3: Image recognition (if CV service is available)
if ($cvService) {
    Write-Host "`nTest 3: Image-Based Recognition..." -ForegroundColor Yellow
    Write-Host "  Run Python test for detailed image testing:" -ForegroundColor Gray
    Write-Host "    cd ml-services\cv_service" -ForegroundColor Gray
    Write-Host "    python test_accuracy.py" -ForegroundColor Gray
}

# Summary
Write-Host "`n=============================================" -ForegroundColor Cyan
Write-Host "   TEST SUMMARY" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  Text Recognition: $accuracy% accuracy" -ForegroundColor $(if ($accuracy -ge 80) {"Green"} elseif ($accuracy -ge 60) {"Yellow"} else {"Red"})
Write-Host "  CV Service: $(if ($cvService) {"Available ✅"} else {"Not Running ⚠️"})" -ForegroundColor $(if ($cvService) {"Green"} else {"Yellow"})
Write-Host "`n  Improvements:" -ForegroundColor Cyan
Write-Host "    • 60+ food name variations supported" -ForegroundColor White
Write-Host "    • Fuzzy matching for typo tolerance" -ForegroundColor White
Write-Host "    • Enhanced image analysis" -ForegroundColor White
Write-Host "    • Deep learning CV service (optional)" -ForegroundColor White
Write-Host "=============================================" -ForegroundColor Cyan
