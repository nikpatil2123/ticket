import axios from 'axios';

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// We no longer manually attach the JWT token from localStorage.
// The browser will automatically send the HttpOnly 'token' cookie with every request.

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const originalRequest = error.config;
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      // Do not redirect if the request was to the login endpoint itself
      if (typeof window !== 'undefined' && originalRequest.url !== '/auth/login') {
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
