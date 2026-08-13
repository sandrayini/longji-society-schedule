<template>
  <div class="app-shell">
    <Toast :toasts="toasts" />
    <router-view />
    <BottomNav v-if="auth && auth.isLoggedIn.value" />
  </div>
</template>

<script setup>
import { inject, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import Toast from './components/Toast.vue';
import BottomNav from './components/BottomNav.vue';
import { useToast } from './composables.js';

const auth = inject('auth');
const router = useRouter();
const { show, toasts } = useToast();

onMounted(() => {
  window.addEventListener('unauthorized', (e) => {
    show(e.detail || '登录已过期，请重新登录', 'error');
    auth.logout();
    router.push('/login');
  });
});
</script>
