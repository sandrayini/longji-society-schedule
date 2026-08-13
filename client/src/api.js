import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      const evt = new CustomEvent('unauthorized', { detail: err.response?.data?.error || '登录已过期' });
      window.dispatchEvent(evt);
    }
    return Promise.reject(err);
  }
);

export default api;
