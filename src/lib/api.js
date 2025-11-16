import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

const envBase = import.meta.env.VITE_API_BASE_URL;
const fallbackBase = 'http://127.0.0.1:8000/api/';
const normalizedBase = envBase ? (envBase.endsWith('/') ? envBase : `${envBase}/`) : fallbackBase;
export const API_BASE_URL = normalizedBase;

const ACCESS_KEY = 'access_token';
const REFRESH_KEY = 'refresh_token';
const USER_KEY = 'user_profile';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

function getAccessToken() {
  return localStorage.getItem(ACCESS_KEY);
}

function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY);
}

function setTokens({ access, refresh }) {
  if (access) localStorage.setItem(ACCESS_KEY, access);
  if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
}

function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getUserFromAccess() {
  const token = getAccessToken();
  if (!token) return null;
  try {
    return jwtDecode(token);
  } catch (err) {
    console.error('Failed to decode access token', err);
    return null;
  }
}

function cacheUserProfile(user) {
  if (!user) return;
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (err) {
    // ignore
  }
}

export function getCachedUserProfile() {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function clearCachedUserProfile() {
  localStorage.removeItem(USER_KEY);
}

// Attach access token to requests
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let refreshSubscribers = [];

function onRefreshed(newAccess) {
  refreshSubscribers.forEach((cb) => cb(newAccess));
  refreshSubscribers = [];
}

function addRefreshSubscriber(cb) {
  refreshSubscribers.push(cb);
}

async function refreshAccessToken() {
  const refresh = getRefreshToken();
  if (!refresh) throw new Error('No refresh token available');

  const resp = await axios.post(`${API_BASE_URL}auth/token/refresh/`, { refresh }, { headers: { 'Content-Type': 'application/json', Accept: 'application/json' } });
  const { access, refresh: newRefresh } = resp.data;
  setTokens({ access, refresh: newRefresh || refresh });
  return access;
}

// Response interceptor: try refresh on 401 and retry
api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const originalRequest = error.config;
    if (!error.response || error.response.status !== 401) return Promise.reject(error);

    if (originalRequest._retry) return Promise.reject(error);
    originalRequest._retry = true;

    try {
      if (isRefreshing) {
        // queue request until refresh finishes
        return new Promise((resolve, reject) => {
          addRefreshSubscriber((newAccess) => {
            if (!newAccess) return reject(error);
            originalRequest.headers.Authorization = `Bearer ${newAccess}`;
            resolve(api(originalRequest));
          });
        });
      }

      isRefreshing = true;
      const newAccess = await refreshAccessToken();
      isRefreshing = false;
      onRefreshed(newAccess);

      originalRequest.headers.Authorization = `Bearer ${newAccess}`;
      return api(originalRequest);
    } catch (refreshError) {
      isRefreshing = false;
      onRefreshed(null);
      clearTokens();
      return Promise.reject(refreshError);
    }
  }
);

// Sweets API helpers
export async function listSweets(params = {}) {
  const resp = await api.get('sweets/', { params });
  return resp.data;
}

export async function getSweet(id) {
  const resp = await api.get(`sweets/${id}/`);
  return resp.data;
}

export async function createSweet(payload) {
  const resp = await api.post('sweets/', payload);
  return resp.data;
}

export async function updateSweet(id, payload) {
  const resp = await api.patch(`sweets/${id}/`, payload);
  return resp.data;
}

export async function deleteSweet(id) {
  await api.delete(`sweets/${id}/`);
  return true;
}

export async function searchSweets({ name, category, min_price, max_price } = {}) {
  const params = {};
  if (name) params.name = name;
  if (category) params.category = category;
  if (min_price !== undefined) params.min_price = String(min_price);
  if (max_price !== undefined) params.max_price = String(max_price);
  const resp = await api.get('sweets/search/', { params });
  return resp.data;
}

export async function purchaseSweet(id, quantity) {
  const resp = await api.post(`sweets/${id}/purchase/`, { quantity });
  return resp.data;
}

export async function restockSweet(id, quantity) {
  const resp = await api.post(`sweets/${id}/restock/`, { quantity });
  return resp.data;
}

// Auth helpers
export async function login({ email, password }) {
  const resp = await api.post('auth/login/', { email, password });
  const { tokens, user } = resp.data;
  setTokens(tokens);
  cacheUserProfile(user);
  return { user, tokens };
}

export async function register({ username, email, password }) {
  const resp = await api.post('auth/register/', { username, email, password });
  const { tokens, user } = resp.data;
  setTokens(tokens);
  cacheUserProfile(user);
  return { user, tokens };
}

export function logout() {
  clearTokens();
}

export function parseDRFErrors(err) {
  if (!err || !err.response || !err.response.data) return { nonFieldErrors: ['Unknown error'] };
  const data = err.response.data;
  if (data.detail && typeof data.detail === 'string') return { nonFieldErrors: [data.detail] };
  return data;
}

export { api as axiosInstance };

export default {
  api,
  // auth
  login,
  register,
  logout,
  getUserFromAccess,
  getCachedUserProfile,
  clearCachedUserProfile,
  // sweets
  listSweets,
  getSweet,
  createSweet,
  updateSweet,
  deleteSweet,
  searchSweets,
  purchaseSweet,
  restockSweet,
  // utils
  parseDRFErrors,
};