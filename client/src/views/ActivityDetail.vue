<template>
  <div class="page">
    <div v-if="activity" class="detail">
      <div class="header">
        <span class="tag" :style="{background: typeColor(activity)}">{{ typeLabel(activity) }}</span>
        <span class="tag" :class="statusClass(activity)">{{ statusText(activity) }}</span>
      </div>
      <h1 class="title">{{ activity.title }}</h1>
      <p class="desc">{{ activity.description }}</p>
      <p class="time">发起于 {{ formatTime(activity.createdAt) }}</p>

      <div v-if="activity.type==='tentative'" class="card">
        <div class="card-title"><div class="card-icon" style="background:#8FAECC">⏰</div>统计时间段</div>
        <p class="range">{{ formatTime(activity.rangeStart) }} 至 {{ formatTime(activity.rangeEnd) }}</p>
        <p v-if="activity.deadline" class="deadline">回复截止：{{ formatTime(activity.deadline) }}</p>
      </div>
      <div v-else-if="activity.type==='fixed'" class="card">
        <div class="card-title"><div class="card-icon" style="background:#7BAE7F">📍</div>确定时间</div>
        <p class="range">{{ formatTime(activity.fixedStart) }} 至 {{ formatTime(activity.fixedEnd) }}</p>
        <p v-if="activity.deadline" class="deadline">回复截止：{{ formatTime(activity.deadline) }}</p>
      </div>
      <div v-else-if="activity.type==='vote'" class="card">
        <div class="card-title"><div class="card-icon" style="background:#F4A6C3">🗳️</div>投票说明</div>
        <p v-if="activity.description" class="desc">{{ activity.description }}</p>
        <p v-if="activity.deadline" class="deadline">投票截止：{{ formatTime(activity.deadline) }}</p>
      </div>

      <div class="card" v-if="!isClosed && !activity.ended && activity.type !== 'vote'">
        <div class="card-title"><div class="card-icon" style="background:#E3B04B">✏️</div>我的填录</div>
        <TentativeForm v-if="activity.type==='tentative'" :activity="activity" :submissions="submissions" @saved="load" />
        <FixedForm v-else :activity="activity" :submissions="submissions" @saved="load" />
      </div>

      <div class="card" v-if="activity.type==='vote'">
        <div class="card-title"><div class="card-icon" style="background:#F0937E">✏️</div>我的投票</div>
        <VoteForm v-if="!isClosed && !activity.ended" :activity="activity" :submissions="submissions" @saved="load" />
        <div v-else class="closed-hint">该投票已截止，不可再投票。</div>
      </div>

      <div class="card" v-if="activity.type==='vote'">
        <div class="card-title"><div class="card-icon" style="background:#F4A6C3">📊</div>投票结果</div>
        <VoteResult :activity="activity" />
      </div>

      <div class="card" v-if="activity.type==='tentative'">
        <div class="card-title"><div class="card-icon" style="background:#F0937E">✨</div>共同空闲时间</div>
        <CommonFreeTime :activity="activity" :submissions="submissions" />
      </div>

      <div class="card" v-if="activity.type!=='vote'">
        <div class="card-title"><div class="card-icon" style="background:#EFA8B8">📋</div>全部提交</div>
        <SubmissionList :activity="activity" :submissions="submissions" />
      </div>

      <div class="admin-actions" v-if="auth.isAdmin.value && !isClosed && !activity.ended">
        <button v-if="activity.type==='vote'" class="btn btn-secondary" style="flex:1" @click="close">截止投票</button>
        <button v-if="activity.type!=='vote'" class="btn btn-secondary" style="flex:1" @click="close">截止征集</button>
        <button v-if="activity.type!=='vote'" class="btn btn-danger" style="flex:1" @click="end">结束活动</button>
      </div>
      <div class="admin-actions" v-if="auth.isAdmin.value && activity.type==='vote' && isClosed && !activity.ended">
        <button class="btn btn-danger" style="width:100%" @click="deleteVote">删除投票</button>
      </div>
      <div v-if="isClosed && !activity.ended && activity.type!=='vote'" class="closed-hint">该活动已截止征集，但仍可查看统计结果。</div>
      <div v-if="activity.ended" class="closed-hint">该活动已结束。</div>
    </div>
  </div>
</template>

<script setup>
import { inject, ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '../api.js';
import { useToast, useActivity } from '../composables.js';
import { formatTime, statusText, statusClass, typeLabel, typeColor } from '../utils.js';
import TentativeForm from '../components/TentativeForm.vue';
import FixedForm from '../components/FixedForm.vue';
import VoteForm from '../components/VoteForm.vue';
import VoteResult from '../components/VoteResult.vue';
import CommonFreeTime from '../components/CommonFreeTime.vue';
import SubmissionList from '../components/SubmissionList.vue';

const route = useRoute();
const router = useRouter();
const auth = inject('auth');
const { show } = useToast();
const { activity, submissions, load } = useActivity(route.params.id);

const isClosed = computed(() => {
  if (activity.value?.closed || activity.value?.ended) return true;
  if (activity.value?.deadline && new Date() > new Date(activity.value.deadline)) return true;
  return false;
});

async function close() {
  await api.post(`/activities/${route.params.id}/close`);
  show('已截止', 'success');
  load();
}
async function end() {
  await api.post(`/activities/${route.params.id}/end`);
  show('已结束活动', 'success');
  load();
}
async function deleteVote() {
  if (!confirm(`确定删除投票「${activity.value.title}」吗？删除后所有投票记录将一并删除，不可恢复。`)) return;
  try {
    await api.delete(`/activities/${route.params.id}`);
    show('投票已删除', 'success');
    router.push('/');
  } catch (e) {
    show(e.response?.data?.error || '删除失败', 'error');
  }
}

onMounted(load);
</script>

<style scoped>
.detail { padding-bottom: 20px; }
.header { display: flex; gap: 8px; margin-bottom: 10px; }
.title { font-family: var(--font-serif); font-size: 22px; margin: 0 0 8px; }
.desc { color: var(--text-light); font-size: 14px; line-height: 1.6; margin: 0 0 8px; white-space: pre-wrap; }
.time { font-size: 12px; color: #b8a99a; margin-bottom: 18px; }
.range { font-size: 15px; margin: 0 0 6px; font-weight: 500; }
.deadline { font-size: 12px; color: #c45b4a; margin: 0; }
.admin-actions { display: flex; gap: 10px; margin-top: 16px; }
.closed-hint { text-align: center; font-size: 13px; color: #9C8570; background: #FDF6E8; padding: 10px 14px; border-radius: 12px; margin-top: 12px; }
</style>
