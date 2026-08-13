<template>
  <div class="login-page">
    <div class="login-card">
      <h1 class="title">第二届龙脊学社第五组</h1>
      <form @submit.prevent="submit">
        <div class="form-group">
          <label class="form-label">账号</label>
          <input v-model="form.username" class="input" placeholder="请输入账号" autocomplete="username" />
        </div>
        <div class="form-group">
          <label class="form-label">密码</label>
          <input v-model="form.password" type="password" class="input" placeholder="请输入密码" autocomplete="current-password" />
        </div>
        <button type="submit" class="btn btn-primary login-btn" :disabled="loading">
          {{ loading ? '登录中...' : '登录' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import api from '../api.js';
import { useToast } from '../composables.js';
import { useAuth } from '../useAuth.js';

const router = useRouter();
const auth = useAuth();
const { show } = useToast();
const form = reactive({ username: '', password: '' });
const loading = ref(false);

async function submit() {
  if (!form.username || !form.password) {
    show('请填写账号和密码', 'error');
    return;
  }
  loading.value = true;
  try {
    const res = await api.post('/login', form);
    auth.setToken(res.data.token);
    await auth.loadUser();
    show('登录成功', 'success');
    router.push('/');
  } catch (e) {
    show(e.response?.data?.error || '登录失败', 'error');
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: linear-gradient(160deg, #FBF6EE 0%, #FDF3E8 100%);
}
.login-card {
  background: #fff;
  border-radius: 32px;
  box-shadow: 0 16px 40px rgba(156,133,112,0.18);
  padding: 36px 28px;
  width: 100%;
  max-width: 380px;
  text-align: center;
}
.title {
  font-family: var(--font-serif);
  font-size: 28px;
  letter-spacing: 0.1em;
  margin-bottom: 6px;
}
.subtitle {
  color: var(--text-light);
  font-size: 13px;
  letter-spacing: 0.15em;
  margin-bottom: 28px;
}
.login-btn { width: 100%; margin-top: 8px; }
.hint {
  margin-top: 18px;
  font-size: 12px;
  color: #b8a99a;
}
</style>
