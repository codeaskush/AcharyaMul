import { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { authApi } from '@/api/client';

const AuthContext = createContext(null);

const initialState = {
  user: null,
  loading: true,
  error: null,
};

function authReducer(state, action) {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload, loading: false, error: null };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'LOGOUT':
      return { ...initialState, loading: false };
    default:
      return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Fetch current user on app load
  useEffect(() => {
    authApi.me()
      .then(res => dispatch({ type: 'SET_USER', payload: res.data }))
      .catch(() => dispatch({ type: 'SET_USER', payload: null }));
  }, []);

  const login = useCallback(() => {
    window.location.href = '/api/v1/auth/google';
  }, []);

  const logout = useCallback(async () => {
    if (!window.confirm('Are you sure you want to logout?')) return;
    try {
      await authApi.logout();
    } catch {
      // ignore
    }
    dispatch({ type: 'LOGOUT' });
    window.location.href = '/login';
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, dispatch, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
