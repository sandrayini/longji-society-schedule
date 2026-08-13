import { createRouter, createWebHistory } from 'vue-router';
import Login from './views/Login.vue';
import Home from './views/Home.vue';
import ActivityDetail from './views/ActivityDetail.vue';
import Members from './views/Members.vue';
import Profile from './views/Profile.vue';

const routes = [
  { path: '/login', name: 'Login', component: Login, meta: { public: true } },
  { path: '/', name: 'Home', component: Home },
  { path: '/activity/:id', name: 'ActivityDetail', component: ActivityDetail },
  { path: '/members', name: 'Members', component: Members },
  { path: '/profile', name: 'Profile', component: Profile },
  { path: '/:pathMatch(.*)*', redirect: '/' }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token');
  if (!to.meta.public && !token) {
    next('/login');
  } else if (to.meta.public && token) {
    next('/');
  } else {
    next();
  }
});

export default router;
