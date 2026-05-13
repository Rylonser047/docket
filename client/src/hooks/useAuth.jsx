import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../lib/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [setupRequired, setSetupRequired] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('docket_token');
    api.get('/auth/status').then(({ setup_complete }) => {
      if (!setup_complete) { setSetupRequired(true); setLoading(false); return; }
      if (!token) { setLoading(false); return; }
      api.get('/auth/me').then(setUser).catch(() => {}).finally(() => setLoading(false));
    }).catch(() => setLoading(false));
  }, []);

  const login = async (password) => {
    const data = await api.post('/auth/login', { password });
    localStorage.setItem('docket_token', data.token);
    setUser(data.settings);
    return data;
  };

  const setup = async (formData) => {
    const data = await api.post('/auth/setup', formData);
    localStorage.setItem('docket_token', data.token);
    setUser(data.settings);
    setSetupRequired(false);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('docket_token');
    setUser(null);
  };

  const updateSettings = async (formData) => {
    const data = await api.put('/auth/settings', formData);
    setUser(data);
    return data;
  };

  return (
    <AuthContext.Provider value={{ user, loading, setupRequired, login, setup, logout, updateSettings }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
