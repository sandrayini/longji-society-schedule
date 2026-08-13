import { computed, ref } from 'vue';

const token = ref(localStorage.getItem('token') || null);
const user = ref(null);

async function loadUser() {
  if (!token.value) return;
  const { default: api } = await import('./api.js');
  try {
    const res = await api.get('/me');
    user.value = res.data;
  } catch (e) {
    if (e.response?.status === 401) {
      logout();
    }
  }
}

function setToken(t) {
  token.value = t;
  localStorage.setItem('token', t);
  import('./api.js').then(({ default: api }) => {
    api.defaults.headers.common.Authorization = `Bearer ${t}`;
  });
}

function logout() {
  token.value = null;
  user.value = null;
  localStorage.removeItem('token');
  import('./api.js').then(({ default: api }) => {
    delete api.defaults.headers.common.Authorization;
  });
}

const isAdmin = computed(() => user.value?.role === 'admin');
const isLoggedIn = computed(() => !!user.value);

if (token.value) {
  import('./api.js').then(({ default: api }) => {
    api.defaults.headers.common.Authorization = `Bearer ${token.value}`;
  });
}

export function useAuth() {
  return { token, user, isAdmin, isLoggedIn, setToken, logout, loadUser };
}
