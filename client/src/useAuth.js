import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import api from './api.js';

export function useAuth() {
  const token = ref(localStorage.getItem('token') || null);
  const user = ref(null);
  const router = useRouter();

  async function loadUser() {
    if (!token.value) return;
    try {
      const res = await api.get('/me');
      user.value = res.data;
      if (user.value.forcePasswordChange) {
        router.push('/profile');
      }
    } catch (e) {
      logout();
    }
  }

  function setToken(t) {
    token.value = t;
    localStorage.setItem('token', t);
    api.defaults.headers.common.Authorization = `Bearer ${t}`;
  }

  function logout() {
    token.value = null;
    user.value = null;
    localStorage.removeItem('token');
    delete api.defaults.headers.common.Authorization;
    router.push('/login');
  }

  const isAdmin = computed(() => user.value?.role === 'admin');
  const isLoggedIn = computed(() => !!token.value);

  if (token.value) {
    api.defaults.headers.common.Authorization = `Bearer ${token.value}`;
  }

  return { token, user, isAdmin, isLoggedIn, setToken, logout, loadUser };
}
