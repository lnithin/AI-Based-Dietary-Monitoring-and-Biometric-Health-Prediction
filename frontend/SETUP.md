# Frontend Setup Guide

## Prerequisites

- Node.js (v16 or higher)
- npm (v7 or higher)

## Installation & Running

### 1. Install Dependencies

From the `frontend` directory, run:

```bash
npm install
```

This will install:
- React 18.2.0
- React DOM 18.2.0
- Vite (build tool)
- Vite React plugin

### 2. Start Development Server

```bash
npm run dev
```

This will:
- Start the Vite dev server on http://localhost:3000
- Automatically open the app in your browser
- Enable hot module reloading (HMR) for instant updates

### 3. Build for Production

```bash
npm run build
```

This will create an optimized production build in the `dist/` folder.

## Project Structure

```
frontend/
├── src/
│   ├── pages/
│   │   ├── App.jsx              # Main app component with routing
│   │   ├── App.css              # Global styling and theming
│   │   ├── Auth.jsx             # Login & Sign Up page
│   │   ├── Auth.css             # Auth page styling
│   │   ├── Dashboard.jsx        # Dashboard with stats
│   │   ├── MealLogger.jsx       # Meal logging with NLP
│   │   ├── BiometricTracker.jsx # Vital signs tracking
│   │   ├── Recommendations.jsx  # AI meal suggestions
│   │   ├── Alerts.jsx           # Health alerts
│   │   └── Profile.jsx          # User profile management
│   └── main.jsx                 # React entry point
├── index.html                   # HTML template
├── package.json                 # Dependencies and scripts
├── vite.config.js              # Vite configuration
└── .gitignore
```

## Features

### 🔐 Authentication
- Login with email & password
- Register with personal details
- JWT token-based authentication
- Token stored in localStorage

### 📊 Dashboard
- Health statistics overview
- Recent meals display
- Recent alerts summary
- Health tips

### 🍽️ Meal Logger
- Text-based meal entry
- NLP-powered ingredient extraction
- Nutrition information display
- Meal history tracking

### ❤️ Biometric Tracker
- 7 vital sign types (glucose, BP, HR, cholesterol, etc.)
- Manual data entry
- Statistical analysis (avg, min, max, count)
- Health status indicators
- Recommended value ranges

### 💡 Recommendations
- AI-powered meal suggestions
- Personalized recommendations
- Feedback (like/skip) system
- Filter by meal type

### 🔔 Alerts
- Health warning system
- Severity-based filtering
- Suggested actions
- Alert acknowledgment

### 👤 Profile
- Personal information management
- Physical measurements (height, weight)
- Health conditions tracking
- Dietary preferences
- Allergy information

## Environment Configuration

The frontend connects to:
- **Backend API**: http://localhost:8000
- **NLP Service**: http://localhost:5001
- **Recommendation Service**: http://localhost:5004

Ensure these services are running before starting the frontend.

## Demo Credentials

- **Email**: demo@example.com
- **Password**: demo123

## Troubleshooting

### Port 3000 Already in Use

If port 3000 is already in use, Vite will automatically try the next available port.
Check the terminal output for the actual URL.

### API Connection Errors

Make sure the backend server is running on port 8000:

```bash
cd backend
npm start
```

### Module Not Found Errors

Clear node_modules and reinstall:

```bash
rm -r node_modules package-lock.json
npm install
```

## API Integration

All API calls use JWT bearer tokens stored in localStorage.

Example API call structure:
```javascript
const response = await fetch('http://localhost:8000/api/endpoint', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

## Development Tips

- Use React DevTools browser extension for debugging
- Check browser console (F12) for API errors
- Use network tab to inspect API requests
- Hot reload is enabled - changes auto-reflect
- All styling uses CSS variables for theming

## Performance Optimization

The app includes:
- Code splitting with Vite
- Lazy component loading
- CSS optimization
- Efficient state management with React hooks

## Next Steps

1. Install dependencies: `npm install`
2. Start backend and ML services
3. Run frontend: `npm run dev`
4. Open browser to http://localhost:3000
5. Login with demo@example.com / demo123
6. Start exploring the system!

---

For backend setup, see `../backend/README.md`
For ML services, see `../ml-services/README.md`
