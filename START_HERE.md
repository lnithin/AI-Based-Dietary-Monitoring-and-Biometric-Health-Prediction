# 🚀 Quick Start Guide

## One-Command Startup

Run this single command to start all services:

```powershell
.\start-all.ps1
```

This will automatically start:
- ✅ Backend API (Port 8000)
- ✅ Frontend UI (Port 5173)
- ✅ LSTM Prediction Service (Port 5001)
- ✅ CV Food Recognition Service (Port 5002)

## Stop All Services

```powershell
.\stop-all.ps1
```

## Manual Startup (if needed)

### 1. Backend
```powershell
cd backend
npm start
```

### 2. Frontend
```powershell
cd frontend
npm run dev
```

### 3. LSTM Prediction Service
```powershell
cd ml-services/prediction_service
python run_api.py
```

### 4. CV Service
```powershell
cd ml-services/cv_service
python app.py
```

## Access the Application

After starting services:
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:8000
- **LSTM API:** http://localhost:5001
- **CV API:** http://localhost:5002

## Troubleshooting

### Port Already in Use
```powershell
# Stop all services first
.\stop-all.ps1

# Then restart
.\start-all.ps1
```

### Python Services Not Starting
```powershell
# Activate virtual environment
.venv\Scripts\Activate.ps1

# Then run start script
.\start-all.ps1
```

### Check Service Status
```powershell
# Check which ports are in use
netstat -ano | findstr "8000 5173 5001 5002"
```
