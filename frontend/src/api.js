import axios from 'axios';

const api = axios.create({
  baseURL: 'https://quantumproject-wbu2.onrender.com',
  withCredentials: true, // ✅ THIS WAS MISSING
});

// Add token automatically
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
