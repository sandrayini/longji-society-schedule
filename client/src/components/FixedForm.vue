<template>
  <div>
    <div class="form-group"><label class="form-label">是否参加</label>
      <div class="mode-toggle">
        <button class="btn btn-sm" :class="attending==='yes' ? 'btn-primary':'btn-secondary'" @click="attending='yes'">参加</button>
        <button class="btn btn-sm" :class="attending==='no' ? 'btn-primary':'btn-secondary'" @click="attending='no'">不参加</button>
      </div>
    </div>
    <div class="form-group"><label class="form-label">备注</label><input v-model="note" class="input" placeholder="如：要请假" /></div>
    <div v-if="mySubmission" class="submitted-label">已提交（截止前可修改）</div>
    <button class="btn btn-primary" style="width:100%" @click="submit" :disabled="loading">
      {{ mySubmission ? '更新提交' : '提交' }}
    </button>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import api from '../api.js';
import { useToast } from '../composables.js';

const props = defineProps({ activity: Object, submissions: Array });
const emit = defineEmits(['saved']);
const { show } = useToast();
const loading = ref(false);
const attending = ref('yes');
const note = ref('');

const mySubmission = computed(() => props.submissions.find(s => s.userId === props.activity.myUserId));

if (mySubmission.value) {
  const data = JSON.parse(mySubmission.value.data || '{}');
  attending.value = data.attending ? 'yes' : 'no';
  note.value = data.note || '';
}

async function submit() {
  loading.value = true;
  try {
    await api.post(`/activities/${props.activity.id}/submit`, {
      type: 'fixed',
      note: note.value,
      data: { attending: attending.value === 'yes', note: note.value }
    });
    show('提交成功', 'success');
    emit('saved');
  } catch (e) {
    show(e.response?.data?.error || '提交失败', 'error');
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.mode-toggle { display: flex; gap: 8px; }
.submitted-label { text-align: center; color: #7BAE7F; font-size: 13px; margin-bottom: 10px; }
</style>
