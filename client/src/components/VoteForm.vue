<template>
  <div>
    <div v-if="!isClosed">
      <p class="hint">{{ activity.allowMultiple ? '可多选' : '请选择一个选项' }}</p>
      <label v-for="opt in activity.options" :key="opt.id" class="option-row">
        <input
          :type="activity.allowMultiple ? 'checkbox' : 'radio'"
          :name="inputName"
          :value="opt.id"
          v-model="selected"
        />
        <span class="option-text">{{ opt.text }}</span>
      </label>
      <button class="btn btn-primary" style="width:100%;margin-top:12px" @click="submit" :disabled="loading || selected.length === 0">
        {{ hasSubmitted ? '更新投票' : '提交投票' }}
      </button>
    </div>
    <div v-else class="closed-hint">该投票已截止，不可再投票。</div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import api from '../api.js';
import { useToast } from '../composables.js';

const props = defineProps({ activity: Object, submissions: Array });
const emit = defineEmits(['saved']);
const { show } = useToast();
const loading = ref(false);

const mySubmission = computed(() => props.submissions?.find(s => s.userId === props.activity.myUserId));
const hasSubmitted = computed(() => !!mySubmission.value && Array.isArray(mySubmission.value.data?.selected) && mySubmission.value.data.selected.length > 0);
const isClosed = computed(() => props.activity.closed || props.activity.ended || (props.activity.deadline && new Date() > new Date(props.activity.deadline)));

const initialSelected = computed(() => hasSubmitted.value ? [...mySubmission.value.data.selected] : []);
const selected = ref([]);
watch(initialSelected, (v) => { selected.value = [...v]; }, { immediate: true });
const inputName = computed(() => `vote-${props.activity.id}`);

async function submit() {
  if (selected.value.length === 0) { show('请至少选择一个选项', 'error'); return; }
  loading.value = true;
  try {
    await api.post(`/activities/${props.activity.id}/submit`, {
      type: 'vote',
      data: { selected: [...selected.value] },
      note: ''
    });
    show('投票成功', 'success');
    emit('saved');
  } catch (e) {
    show(e.response?.data?.error || '投票失败', 'error');
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.hint { font-size: 13px; color: var(--text-light); margin: 0 0 12px; }
.option-row {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #FFFCF7;
  border-radius: 14px;
  padding: 12px 14px;
  margin-bottom: 10px;
  cursor: pointer;
  transition: background .12s;
}
.option-row:active { background: #F5EFE6; }
.option-text { font-size: 14px; color: var(--text); }
input[type=radio], input[type=checkbox] { width: 18px; height: 18px; accent-color: #F0937E; }
.closed-hint { text-align: center; font-size: 13px; color: #9C8570; background: #FDF6E8; padding: 12px; border-radius: 12px; }
</style>
