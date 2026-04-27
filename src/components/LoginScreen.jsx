import { useState } from 'react';
import { ShieldCheck, ChefHat, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react';
import { loginUser } from '../api/authApi';

const ALLOWED_ROLES = ['restaurant_owner', 'restaurant_staff', 'admin'];

export default function LoginScreen({ onLogin, message }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(message || '');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await loginUser({ email, password });
      
      if (!ALLOWED_ROLES.includes(data.primary_role)) {
        setError('You do not have permission to access Kitchen Display System');
        setLoading(false);
        return;
      }

      onLogin(data);
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-ambient login-ambient--1" />
      <div className="login-ambient login-ambient--2" />

      <form className="login-card" onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
        <div className="login-logo">
          <div className="login-logo__icon">
            <ChefHat size={40} strokeWidth={1.5} />
          </div>
          <h1 className="login-logo__title">Mangaale <span>KDS</span></h1>
          <p className="login-logo__subtitle">Kitchen Command Center</p>
        </div>

        {error && (
          <div className="login-error" role="alert">
            <ShieldCheck size={16} />
            <span>{error}</span>
          </div>
        )}

        <div className="login-field">
          <label htmlFor="email" className="login-label">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            className="login-input login-input--single"
            placeholder="e.g. chef@mangaale.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            autoFocus
            aria-label="Email address"
          />
        </div>

        <div className="login-field">
          <label htmlFor="password" className="login-label">
            Password
          </label>
          <div className="login-input-wrapper">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              className="login-input login-input--single"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              aria-label="Password"
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              disabled={loading}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="login-btn"
          disabled={!email.trim() || !password.trim() || loading}
          aria-label="Login to Kitchen Display"
        >
          {loading ? (
            <>
              <Loader2 size={18} className="spin" />
              <span>Signing in...</span>
            </>
          ) : (
            <>
              <span>LOGIN TO KITCHEN DISPLAY</span>
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
