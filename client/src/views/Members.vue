<template>
  <div class="page">
    <h1 class="page-title">成员</h1>
    <p class="page-subtitle">第五组 · 成员一览</p>
    <div class="card">
      <div v-for="m in visibleMembers" :key="m.id" class="member-row" :class="{ inactive: m.active === 0 }">
        <div class="badge" :style="{background: colorOf(m.id)}">{{ initial(m.name) }}</div>
        <div class="info">
          <div class="name">
            {{ m.name }}
            <span class="role">{{ (m.position || m.role) || '成员' }}</span>
            <span v-if="m.active === 0" class="inactive-tag">已停用</span>
          </div>
          <div class="contact">{{ m.contact || '暂无联系方式' }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, inject } from 'vue';
import { useMembers } from '../composables.js';
import { colorOf, initial } from '../utils.js';

const auth = inject('auth');
const { members } = useMembers();
const visibleMembers = computed(() => {
  if (auth.user.value?.role === 'admin') return members.value;
  return members.value.filter(m => m.active === 1);
});
</script>

<style scoped>
.member-row { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid #F5EFE6; }
.member-row:last-child { border-bottom: none; }
.member-row.inactive .badge { opacity: 0.45; filter: grayscale(0.6); }
.member-row.inactive .name { color: #a39b92; }
.role { font-size: 12px; color: var(--text-light); font-weight: normal; }
.contact { font-size: 13px; color: var(--text-light); margin-top: 2px; }
.inactive-tag { font-size: 10px; color: #fff; background: #c8bdb0; border-radius: 999px; padding: 2px 8px; margin-left: 6px; }
</style>
