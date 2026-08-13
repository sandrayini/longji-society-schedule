<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-card">
      <h3 class="modal-title">👤 成员管理</h3>
      <div class="list">
        <div v-for="m in members" :key="m.id" class="member-row">
          <div class="badge" :style="{background: colorOf(m.id)}">{{ initial(m.name) }}</div>
          <div class="info">
            <div class="name">{{ m.name }}</div>
            <div class="contact">{{ (m.position || m.role) || '成员' }} · {{ m.contact || '无联系方式' }}</div>
          </div>
          <div class="actions">
            <button class="btn btn-sm btn-secondary" @click="edit(m)">编辑</button>
            <button class="btn btn-sm btn-danger" @click="resetPwd(m)">重置密码</button>
          </div>
        </div>
      </div>
      <button class="btn btn-primary" style="width:100%;margin:12px 0" @click="add">新增成员</button>
      <button class="btn btn-secondary" style="width:100%" @click="$emit('close')">关闭</button>

      <div v-if="editing" class="editor">
        <h4>{{ editing.id ? '编辑成员' : '新增成员' }}</h4>
        <div class="form-group"><label class="form-label">姓名</label><input v-model="editing.name" class="input" @input="stash" /></div>
        <div class="form-group"><label class="form-label">职务</label><input v-model="editing.position" class="input" placeholder="如组长/副组长" @input="stash" @blur="stash" /></div>
        <div class="form-group"><label class="form-label">联系方式</label><input v-model="editing.contact" class="input" placeholder="手机号或微信号" @input="stash" @blur="stash" /></div>
        <div class="form-group"><label class="form-label">登录账号</label><input v-model="editing.username" class="input" :disabled="!!editing.id" @input="stash" /></div>
        <div class="form-group" v-if="!editing.id"><label class="form-label">初始密码</label><input v-model="editing.password" class="input" placeholder="默认 longji123" @input="stash" /></div>
        <div class="form-group"><label class="form-label">状态</label>
          <select v-model="editing.active" class="input" @change="stash">
            <option :value="1">启用</option>
            <option :value="0">停用</option>
          </select>
        </div>
        <div class="row-btns">
          <button class="btn btn-primary" @click="save">保存</button>
          <button class="btn btn-secondary" @click="cancelEdit">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import api from '../api.js';
import { useToast } from '../composables.js';
import { colorOf, initial } from '../utils.js';

const STASH_KEY = 'member_editor_draft';
const emit = defineEmits(['close', 'saved']);
const { show } = useToast();
const members = ref([]);
const editing = ref(null);

async function load() {
  const res = await api.get('/members');
  members.value = res.data;
}

function add() {
  const draft = sessionStorage.getItem(STASH_KEY);
  editing.value = draft ? JSON.parse(draft) : { name: '', position: '', contact: '', username: '', password: 'longji123', active: 1 };
}

function edit(m) {
  editing.value = { ...m, password: '' };
}

function stash() {
  if (editing.value) {
    sessionStorage.setItem(STASH_KEY, JSON.stringify(editing.value));
  }
}

function clearStash() {
  sessionStorage.removeItem(STASH_KEY);
}

function cancelEdit() {
  clearStash();
  editing.value = null;
}

async function save() {
  try {
    if (editing.value.id) {
      await api.put(`/members/${editing.value.id}`, editing.value);
    } else {
      await api.post('/members', editing.value);
    }
    show('保存成功', 'success');
    clearStash();
    editing.value = null;
    await load();
    emit('saved');
  } catch (e) {
    show(e.response?.data?.error || '保存失败', 'error');
  }
}

async function resetPwd(m) {
  if (!confirm(`确定重置 ${m.name} 的密码为 longji123 吗？`)) return;
  try {
    await api.post(`/members/${m.id}/reset-password`);
    show('密码已重置', 'success');
  } catch (e) {
    show(e.response?.data?.error || '重置失败', 'error');
  }
}

onMounted(load);
onUnmounted(clearStash);
</script>

<style scoped>
.modal-overlay { position: fixed; inset: 0; background: rgba(90,74,66,0.35); z-index: 100; display: flex; align-items: flex-end; justify-content: center; }
.modal-card { background: #fff; width: 100%; max-width: 640px; border-radius: 28px 28px 0 0; max-height: 90vh; overflow: auto; padding: 24px; }
.modal-title { font-family: var(--font-serif); text-align: center; margin-bottom: 16px; }
.member-row { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid #F5EFE6; }
.info { flex: 1; }
.name { font-weight: 500; }
.contact { font-size: 12px; color: var(--text-light); }
.actions { display: flex; gap: 6px; }
.editor { background: #FFFCF7; border-radius: 18px; padding: 16px; margin-top: 14px; }
.row-btns { display: flex; gap: 10px; margin-top: 10px; }
.row-btns .btn { flex: 1; }
</style>
