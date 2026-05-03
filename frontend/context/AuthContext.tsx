import React, { createContext, useContext, useEffect, useReducer } from 'react';
import * as SecureStore from 'expo-secure-store';
import api from '../utils/api';

type User = { id: string; name: string; phone: string; email?: string; avatar_color: string };
type State = { user: User | null; token: string | null; loading: boolean };
type Action = { type: 'SET_AUTH'; user: User; token: string } | { type: 'LOGOUT' } | { type: 'SET_LOADING'; loading: boolean };

const AuthContext = createContext<any>(null);

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_AUTH':  return { ...state, user: action.user, token: action.token, loading: false };
    case 'LOGOUT':    return { user: null, token: null, loading: false };
    case 'SET_LOADING': return { ...state, loading: action.loading };
    default: return state;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { user: null, token: null, loading: true });

  useEffect(() => {
    (async () => {
      const token = await SecureStore.getItemAsync('bikore_token');
      if (token) {
        try {
          const { data } = await api.get('/auth/me');
          dispatch({ type: 'SET_AUTH', user: data, token });
        } catch { dispatch({ type: 'LOGOUT' }); }
      } else { dispatch({ type: 'SET_LOADING', loading: false }); }
    })();
  }, []);

  const login = async (phone: string, password: string) => {
    const { data } = await api.post('/auth/login', { phone, password });
    await SecureStore.setItemAsync('bikore_token', data.token);
    dispatch({ type: 'SET_AUTH', user: data.user, token: data.token });
  };

  const register = async (name: string, phone: string, password: string) => {
    const { data } = await api.post('/auth/register', { name, phone, password });
    await SecureStore.setItemAsync('bikore_token', data.token);
    dispatch({ type: 'SET_AUTH', user: data.user, token: data.token });
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync('bikore_token');
    dispatch({ type: 'LOGOUT' });
  };

  return <AuthContext.Provider value={{ ...state, login, register, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
