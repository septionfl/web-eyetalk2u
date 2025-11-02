import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, User, Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import './Login.css';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!email || !password) {
      setError('Email & password must be filled!');
      setIsLoading(false);
      return;
    }

    const result = await login(email, password);
    
    if (result.success) {
      navigate(from, { replace: true });
    } else {
      setError(result.message || 'Login gagal. Silakan coba lagi.');
    }
    
    setIsLoading(false);
  };

  const fillDemoCredentials = (type: 'admin' | 'operator' | 'viewer') => {
    const credentials = {
      admin: { email: 'admin@eyetalk2u.com', password: 'password' },
      operator: { email: 'operator@eyetalk2u.com', password: 'password123' },
      viewer: { email: 'viewer@eyetalk2u.com', password: 'viewer123' }
    };
    
    setEmail(credentials[type].email);
    setPassword(credentials[type].password);
    setShowDemo(false);
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <div className="logo">
            <div className="logo-icon">
              <Eye size={32} />
            </div>
            <h1>EyeTalk2U</h1>
          </div>
          <p className="tagline">
            Sistem Komunikasi Berbasis Eye Tracking untuk Pasien Pascaoperasi
          </p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="error-message" role="alert">
              {error}
            </div>
          )}
          
          <div className="form-group">
            <label htmlFor="email" className="form-label">
              Email Address
            </label>
            <div className="input-wrapper">
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                required
                disabled={isLoading}
                className="form-input"
                autoComplete="email"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <div className="input-wrapper">
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                disabled={isLoading}
                className="form-input"
                autoComplete="current-password"
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="login-button"
            disabled={isLoading}
            aria-busy={isLoading}
          >
            {isLoading ? (
              <>
                <div className="spinner"></div>
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="login-footer">
          <div className="demo-section">
            <button 
              type="button"
              className="demo-toggle"
              onClick={() => setShowDemo(!showDemo)}
            >
              Demo Credentials
            </button>
            
            {showDemo && (
              <div className="demo-credentials">
                <div className="demo-role">
                  <h4>Administrator</h4>
                  <button 
                    onClick={() => fillDemoCredentials('admin')}
                    className="demo-btn"
                  >
                    Use Admin Account
                  </button>
                  <p>Full access to all features</p>
                </div>
                
                <div className="demo-role">
                  <h4>Operator</h4>
                  <button 
                    onClick={() => fillDemoCredentials('operator')}
                    className="demo-btn"
                  >
                    Use Operator Account
                  </button>
                  <p>Can manage devices and sessions</p>
                </div>
                
                <div className="demo-role">
                  <h4>Viewer</h4>
                  <button 
                    onClick={() => fillDemoCredentials('viewer')}
                    className="demo-btn"
                  >
                    Use Viewer Account
                  </button>
                  <p>Read-only access</p>
                </div>
              </div>
            )}
          </div>
          
          <p className="copyright">
            EyeTalk2U &copy; 2025 - Universitas Gadjah Mada
          </p>
        </div>
      </div>

      {/* Background Decoration */}
      <div className="login-background">
        <div className="floating-icon">
          <Eye size={24} />
        </div>
        <div className="floating-icon">
          <User size={24} />
        </div>
        <div className="floating-icon">
          <Lock size={24} />
        </div>
      </div>
    </div>
  );
};

export default Login;