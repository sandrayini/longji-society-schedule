<template>
  <div class="page">
    <h1 class="page-title">我的</h1>
    <p class="page-subtitle">第五组 · 个人设置</p>

    <div class="card">
      <div class="user-card">
        <div class="badge" :style="{background: colorOf(auth.user.value?.id)}">{{ initial(auth.user.value?.name || '?') }}</div>
        <div>
          <div class="name">{{ auth.user.value?.name }}</div>
          <div class="role">{{ auth.user.value?.role || '成员' }}</div>
        </div>
      </div>
    </div>

    <div class="card">
      <h3 class="card-title">修改密码</h3>
      <div class="form-group"><label class="form-label">新密码</label><input v-model="pwd.new" type="password" class="input" placeholder="至少6位" /></div>
      <div class="form-group"><label class="form-label">确认新密码</label><input v-model="pwd.confirm" type="password" class="input" placeholder="再次输入" /></div>
      <button class="btn btn-primary" style="width:100%" @click="changePassword" :disabled="loadingPwd">修改密码</button>
    </div>

    <div class="card">
      <h3 class="card-title">联系方式</h3>
      <div class="form-group"><label class="form-label">联系方式</label><input v-model="contact" class="input" placeholder="手机号/微信号" /></div>
      <button class="btn btn-primary" style="width:100%" @click="saveContact" :disabled="loadingContact">保存</button>
    </div>

    <button class="btn btn-secondary" style="width:100%;margin-top:12px" @click="auth.logout()">退出登录</button>
  </div>
</template>

<script setup>
import { inject, ref, onMounted } from 'vue';
import api from '../api.js';
import { useToast } from '../composables.js';
import { colorOf, initial } from '../utils.js';

const auth = inject('auth');
const { show } = useToast();
const pwd = ref({ new: '', confirm: '' });
const contact = ref('');
const loadingPwd = ref(false);
const loadingContact = ref(false);

onMounted(async () => {
  await auth.loadUser();
  contact.value = auth.user.value?.contact || '';
});

async function changePassword() {
  if (pwd.value.new.length < 6) { show('密码至少6位', 'error'); return; }
  if (pwd.value.new !== pwd.value.confirm) { show('两次密码不一致', 'error'); return; }
  loadingPwd.value = true;
  try {
    await api.post('/change-password', { password: pwd.value.new });
    show('密码已修改', 'success');
    pwd.value = { new: '', confirm: '' };
  } catch (e) {
    show(e.response?.data?.error || '修改失败', 'error');
  } finally { loadingPwd.value = false; }
}

async function saveContact() {
  loadingContact.value = true;
  try {
    await api.put('/me/contact', { contact: contact.value });
    show('已保存', 'success');
  } catch (e) {
    show(e.response?.data?.error || '保存失败', 'error');
  } finally { loadingContact.value = false; }
}
</script>

<style scoped>
.user-card { display: flex; align-items: center; gap: 14px; }
.name { font-size: 18px; font-weight: 700; }
.role { font-size: 13px; color: var(--text-light); margin-top: 2px; }
</style>
