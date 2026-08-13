import { createApp } from 'vue';
import App from './App.vue';
import router from './router.js';
import { useAuth } from './useAuth.js';
import './style.css';

const app = createApp(App);
const auth = useAuth();
app.provide('auth', auth);
app.use(router).mount('#app');
auth.loadUser();
