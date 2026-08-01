import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5555/api';
const refreshClient = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

let accessToken = localStorage.getItem('accessToken') || '';

export function setAccessToken(token) {
  accessToken = token || '';

  if (token) {
    localStorage.setItem('accessToken', token);
  } else {
    localStorage.removeItem('accessToken');
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('auth:changed'));
  }
}

export function clearAccessToken() {
  accessToken = '';
  localStorage.removeItem('accessToken');

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('auth:logout'));
  }
}

export function getAccessToken() {
  return accessToken;
}

api.interceptors.request.use(config => {
  const token = accessToken || localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest.__isRetryRequest &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/register') &&
      !originalRequest.url?.includes('/auth/refresh') &&
      !originalRequest.url?.includes('/auth/logout')
    ) {
      try {
        originalRequest.__isRetryRequest = true;
        const refreshResponse = await refreshClient.post('/auth/refresh');
        const nextAccessToken = refreshResponse.data?.accessToken;

        if (nextAccessToken) {
          setAccessToken(nextAccessToken);
          originalRequest.headers.Authorization = `Bearer ${nextAccessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        clearAccessToken();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
