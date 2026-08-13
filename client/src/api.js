import axios from 'axios';

const api = axios.create({ baseURL: '/api' });
const token = localStorage.getItem('token');
if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`;

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
