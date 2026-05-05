import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Use different base URLs based on platform
const API_BASE = Platform.OS === 'web' 
  ? 'http://localhost:5000/api'
  : 'http://192.168.1.70:5000/api';

const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('bikore_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;