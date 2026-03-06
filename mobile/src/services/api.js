import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (data) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
  exchangeSession: (sessionId) => api.post('/auth/session', { session_id: sessionId }),
};

// KYC API
export const kycAPI = {
  submit: (data) => api.post('/kyc/submit', data),
  getStatus: () => api.get('/kyc/status'),
};

// Tontine API
export const tontineAPI = {
  getMarketplace: () => api.get('/tontines/marketplace'),
  getUserTontines: () => api.get('/tontines/user/active'),
  getTontine: (id) => api.get(`/tontines/${id}`),
  create: (data) => api.post('/tontines', data),
  join: (tontineId) => api.post('/tontines/join', { tontine_id: tontineId }),
};

// Payment API
export const paymentAPI = {
  createCheckout: (tontineId, originUrl) => 
    api.post('/payments/checkout', { tontine_id: tontineId, origin_url: originUrl }),
  getStatus: (sessionId) => api.get(`/payments/status/${sessionId}`),
  getHistory: () => api.get('/payments/history'),
};

// Wallet API
export const walletAPI = {
  get: () => api.get('/wallet'),
};

// Trust Score API
export const trustScoreAPI = {
  get: () => api.get('/trust-score'),
};

// Support API
export const supportAPI = {
  createTicket: (data) => api.post('/support/tickets', data),
  getTickets: () => api.get('/support/tickets'),
};

// User API
export const userAPI = {
  updateSettings: (data) => api.put('/users/settings', data),
};

export default api;
