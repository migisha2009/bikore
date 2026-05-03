import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_BASE = 'http://localhost:4000/api'; // Change to your deployed URL

const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('bikore_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
