<template>
  <div class="app-shell">
    <Toast :toasts="toasts" />
    <router-view />
    <BottomNav v-if="auth.isLoggedIn.value" />
  </div>
</template>

<script setup>
import { inject } from 'vue';
import Toast from './components/Toast.vue';
import BottomNav from './components/BottomNav.vue';
import { useToast } from './composables.js';

const auth = inject('auth');
const { toasts } = useToast();
</script>
