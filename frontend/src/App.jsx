import React, { useState, useEffect } from 'react';
import './App.css';
import Dashboard from './pages/Dashboard';
import MealLogger from './pages/MealLogger';
import BiometricTracker from './pages/BiometricTracker';
import Recommendations from './pages/Recommendations';
import Alerts from './pages/Alerts';
import Profile from './pages/Profile';
import Auth from './pages/Auth';
import GlucosePrediction from './pages/GlucosePrediction';
import BloodPressurePrediction from './pages/BloodPressurePrediction';
import CholesterolPrediction from './pages/CholesterolPrediction';
import MultiModalFusion from './pages/MultiModalFusion';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      setIsAuthenticated(true);
      verifyToken();
    }
  }, [token]);

  const verifyToken = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/auth/verify', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        logout();
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      logout();
    }
  };

  const handleLogin = (newToken, userData) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(userData);
    setIsAuthenticated(true);
    setCurrentPage('dashboard');
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setIsAuthenticated(false);
    setUser(null);
    setCurrentPage('dashboard');
  };

  if (!isAuthenticated) {
    return <Auth onLogin={handleLogin} />;
  }

  return (
    <div className="app">
      <nav className="navbar">
        <div className="nav-brand">
          <h1>🍎 Dietary Health Monitor</h1>
          <p className="nav-subtitle">AI-Powered Nutrition & Health Tracking</p>
        </div>
        
        <div className="nav-menu">
          <button 
            className={`nav-link ${currentPage === 'dashboard' ? 'active' : ''}`}
            onClick={() => setCurrentPage('dashboard')}
          >
            📊 Dashboard
          </button>
          <button 
            className={`nav-link ${currentPage === 'meals' ? 'active' : ''}`}
            onClick={() => setCurrentPage('meals')}
          >
            🍽️ Meals
          </button>
          <button 
            className={`nav-link ${currentPage === 'biometrics' ? 'active' : ''}`}
            onClick={() => setCurrentPage('biometrics')}
          >
            ❤️ Biometrics
          </button>
          <button 
            className={`nav-link ${currentPage === 'recommendations' ? 'active' : ''}`}
            onClick={() => setCurrentPage('recommendations')}
          >
            🎯 Recommendations
          </button>
          <button 
            className={`nav-link ${currentPage === 'alerts' ? 'active' : ''}`}
            onClick={() => setCurrentPage('alerts')}
          >
            🔔 Alerts
          </button>
          <button 
            className={`nav-link ${currentPage === 'profile' ? 'active' : ''}`}
            onClick={() => setCurrentPage('profile')}
          >
            👤 Profile
          </button>
          <button 
            className={`nav-link ${currentPage === 'glucose-prediction' ? 'active' : ''}`}
            onClick={() => setCurrentPage('glucose-prediction')}
          >
            🧬 Glucose Prediction
          </button>
          <button 
            className={`nav-link ${currentPage === 'bp-prediction' ? 'active' : ''}`}
            onClick={() => setCurrentPage('bp-prediction')}
          >
            🩺 Blood Pressure
          </button>
          <button 
            className={`nav-link ${currentPage === 'cholesterol-prediction' ? 'active' : ''}`}
            onClick={() => setCurrentPage('cholesterol-prediction')}
          >
            💊 Cholesterol
          </button>
          <button 
            className={`nav-link ${currentPage === 'fusion' ? 'active' : ''}`}
            onClick={() => setCurrentPage('fusion')}
          >
            🔗 Fusion
          </button>
        </div>

        <div className="nav-user">
          <span>{user?.firstName} {user?.lastName}</span>
          <button className="logout-btn" onClick={logout}>Logout</button>
        </div>
      </nav>

      <main className="main-content">
        {currentPage === 'dashboard' && <Dashboard token={token} user={user} />}
        {currentPage === 'meals' && <MealLogger token={token} user={user} />}
        {currentPage === 'biometrics' && <BiometricTracker token={token} user={user} />}
        {currentPage === 'recommendations' && <Recommendations token={token} user={user} />}
        {currentPage === 'alerts' && <Alerts token={token} user={user} />}
        {currentPage === 'profile' && <Profile token={token} user={user} onUpdate={setUser} />}
        {currentPage === 'glucose-prediction' && <GlucosePrediction token={token} userBiometrics={user} />}
        {currentPage === 'bp-prediction' && <BloodPressurePrediction />}
        {currentPage === 'cholesterol-prediction' && <CholesterolPrediction />}
        {currentPage === 'fusion' && <MultiModalFusion />}
      </main>
    </div>
  );
}

export default App;
