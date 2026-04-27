import { useState, useCallback } from 'react';
import { TOKEN_KEY, USER_ROLE_KEY, USER_NAME_KEY } from '../utils/constants';
import LoginScreen from './LoginScreen';
import KDSDashboard from './KDSDashboard';

export default function AppShell() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || '');
  const [logoutMessage, setLogoutMessage] = useState('');

  const handleLogin = useCallback((userData) => {
    localStorage.setItem(TOKEN_KEY, userData.authToken);
    localStorage.setItem(USER_ROLE_KEY, userData.primary_role);
    localStorage.setItem(USER_NAME_KEY, userData.display_name);
    setLogoutMessage('');
    setToken(userData.authToken);
  }, []);

  const handleLogout = useCallback((message = '') => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_ROLE_KEY);
    localStorage.removeItem(USER_NAME_KEY);
    setToken('');
    setLogoutMessage(message);
  }, []);

  if (!token) {
    return <LoginScreen onLogin={handleLogin} message={logoutMessage} />;
  }

  return <KDSDashboard token={token} onLogout={handleLogout} />;
}
