import { ref, onMounted, provide, readonly } from 'vue';
import { useRouter } from 'vue-router';
import api from './api.js';
import { useAuth } from './useAuth.js';

export function provideAuth() {
  const auth = useAuth();
  provide('auth', auth);
  return auth;
}

export function useToast() {
  const toasts = ref([]);
  let id = 0;
  function show(message, type = 'info') {
    const t = { id: ++id, message, type };
    toasts.value.push(t);
    setTimeout(() => {
      toasts.value = toasts.value.filter(x => x.id !== t.id);
    }, 2500);
  }
  return { toasts, show };
}

export function useMembers() {
  const members = ref([]);
  async function load() {
    const res = await api.get('/members');
    members.value = res.data;
  }
  onMounted(load);
  return { members, load };
}

export function useActivities() {
  const activities = ref([]);
  async function load() {
    const res = await api.get('/activities');
    activities.value = res.data;
  }
  onMounted(load);
  return { activities, load, loadActivities: load };
}

export function useActivity(id) {
  const activity = ref(null);
  const submissions = ref([]);
  async function load() {
    const res = await api.get(`/activities/${id}`);
    activity.value = res.data.activity;
    submissions.value = res.data.submissions;
    // normalize data string to object
    submissions.value.forEach(s => { if (typeof s.data === 'string') s.data = JSON.parse(s.data || '{}'); });
  }
  return { activity, submissions, load };
}
