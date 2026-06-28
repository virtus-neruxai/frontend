import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const API_URL = import.meta.env.VITE_BACKEND_URL;

// Create axios instance for auth with proper base URL
const authApi = axios.create({
  baseURL: `${API_URL}/api/v1`,
});

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  }, []);

  // Manejar token OIDC del callback en la URL
  useEffect(() => {
    const handleOIDCCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const urlToken = urlParams.get('token');
      
      if (urlToken && !token) {
        try {
          localStorage.setItem('token', urlToken);
          setToken(urlToken);
          
          // Verificar si es un usuario nuevo
          const isNewUser = urlParams.get('new_user') === 'true';
          
          // Limpiar parámetros de URL
          window.history.replaceState({}, document.title, window.location.pathname);
          
          console.log('Token OIDC procesado exitosamente');
        } catch (error) {
          console.error('Error al procesar el token OIDC:', error);
          // Limpiar parámetros de URL incluso si hay error
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    };
    
    handleOIDCCallback();
  }, [token]);

  useEffect(() => {
    const validateToken = async () => {
      if (token) {
        try {
          const response = await authApi.get(`/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setUser(response.data);
        } catch (error) {
          logout();
        }
      }
      setLoading(false);
    };
    validateToken();
  }, [token, logout]);

  const authenticateWithToken = async (accessToken) => {
    localStorage.setItem('token', accessToken);
    setToken(accessToken);
    const userResponse = await authApi.get(`/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    setUser(userResponse.data);
  };

  const loginFromToken = useCallback(async (accessToken) => {
    try {
      await authenticateWithToken(accessToken);
    } catch (error) {
      console.error('Error processing OIDC token:', error);
      logout();
    }
  }, [logout]);

  const login = async (username, password) => {
    const response = await authApi.post(`/auth/login`, {
      username,
      password
    });
    const { access_token } = response.data;
    await authenticateWithToken(access_token);
    return response.data;
  };

  const register = async (username, password, options = {}) => {
    const response = await authApi.post(`/auth/register`, {
      username,
      password,
      ...options
    });
    const { access_token } = response.data;
    await authenticateWithToken(access_token);
    return response.data;
  };

  const value = {
    token,
    user,
    loading,
    isAuthenticated: !!token,
    login,
    register,
    logout,
    loginFromToken
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
