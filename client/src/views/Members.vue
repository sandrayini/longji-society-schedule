<template>
  <div class="page">
    <h1 class="page-title">成员</h1>
    <p class="page-subtitle">第五组 · 成员一览</p>
    <div class="card">
      <div v-for="m in members" :key="m.id" class="member-row">
        <div class="badge" :style="{background: colorOf(m.id)}">{{ initial(m.name) }}</div>
        <div class="info">
          <div class="name">{{ m.name }} <span class="role">{{ m.role || '成员' }}</span></div>
          <div class="contact">{{ m.contact || '暂无联系方式' }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useMembers } from '../composables.js';
import { colorOf, initial } from '../utils.js';

const { members } = useMembers();
</script>

<style scoped>
.member-row { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid #F5EFE6; }
.member-row:last-child { border-bottom: none; }
.role { font-size: 12px; color: var(--text-light); font-weight: normal; }
.contact { font-size: 13px; color: var(--text-light); margin-top: 2px; }
</style>
