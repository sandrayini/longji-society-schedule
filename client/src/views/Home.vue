<template>
  <div class="page">
    <h1 class="page-title">龙脊学社</h1>
    <p class="page-subtitle">第五组 · 活动日程</p>

    <div class="card">
      <div class="card-title">
        <div class="card-icon" style="background:#F0937E">👥</div>
        成员列表
        <button v-if="auth.isAdmin.value" class="btn btn-sm btn-secondary" style="margin-left:auto" @click="showMemberEditor=true">管理</button>
      </div>
      <div class="members-row">
        <div v-for="m in members" :key="m.id" class="member-chip">
          <div class="badge" :style="{background: colorOf(m.id)}">{{ initial(m.name) }}</div>
          <span class="member-name">{{ m.name }}</span>
          <span class="member-role">{{ m.role || '成员' }}</span>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">
        <div class="card-icon" style="background:#E3B04B">📅</div>
        活动列表
        <button v-if="auth.isAdmin.value" class="btn btn-sm btn-primary" style="margin-left:auto" @click="openActivityEditor()">+ 发起活动</button>
      </div>
      <div v-if="activities.length===0" class="empty">暂无活动</div>
      <div v-for="a in activities" :key="a.id" class="activity-item" @click="go(a)">
        <div class="activity-meta">
          <span class="tag" :style="{background: a.type==='tentative' ? '#8FAECC':'#7BAE7F'}">{{ a.type==='tentative' ? '时间待定':'时间已定' }}</span>
          <span class="status tag" :class="statusClass(a)">{{ statusText(a) }}</span>
        </div>
        <h3 class="activity-title">{{ a.title }}</h3>
        <p class="activity-desc">{{ a.description || '暂无内容' }}</p>
        <p class="activity-time">发起于 {{ formatTime(a.createdAt) }}</p>
      </div>
    </div>

    <MemberEditor v-if="showMemberEditor" @close="showMemberEditor=false" @saved="loadMembers" />
    <ActivityEditor v-if="showActivityEditor" @close="showActivityEditor=false" @saved="loadActivities" />
  </div>
</template>

<script setup>
import { inject, ref } from 'vue';
import { useRouter } from 'vue-router';
import api from '../api.js';
import { useMembers, useActivities } from '../composables.js';
import { colorOf, initial, formatTime, statusText, statusClass } from '../utils.js';
import MemberEditor from '../components/MemberEditor.vue';
import ActivityEditor from '../components/ActivityEditor.vue';

const auth = inject('auth');
const router = useRouter();
const { members, load: loadMembers } = useMembers();
const { activities, load: loadActivities } = useActivities();
const showMemberEditor = ref(false);
const showActivityEditor = ref(false);

function openActivityEditor() { showActivityEditor.value = true; }
function go(a) { router.push(`/activity/${a.id}`); }
</script>

<style scoped>
.members-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16px 12px;
  justify-content: center;
  padding: 8px 0;
}
.member-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 68px;
}
.member-name { font-size: 13px; margin-top: 6px; font-weight: 500; }
.member-role { font-size: 11px; color: var(--text-light); }

.activity-item {
  background: #FFFCF7;
  border-radius: 18px;
  padding: 14px;
  margin-bottom: 12px;
  cursor: pointer;
  transition: transform .12s;
}
.activity-item:active { transform: scale(0.98); }
.activity-meta { display: flex; gap: 8px; margin-bottom: 8px; }
.activity-title { font-size: 16px; margin: 0 0 6px; }
.activity-desc { font-size: 13px; color: var(--text-light); margin: 0 0 8px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.activity-time { font-size: 11px; color: #b8a99a; margin: 0; }
</style>
