<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-card">
      <h3 class="modal-title">📅 发起活动</h3>
      <div class="form-group">
        <label class="form-label">活动类型</label>
        <select v-model="form.type" class="input">
          <option value="tentative">时间待定（征集空闲时间）</option>
          <option value="fixed">时间已定（报名参加）</option>
          <option value="vote">投票活动</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label">活动标题</label><input v-model="form.title" class="input" placeholder="如：小组读书分享会" /></div>
      <div class="form-group"><label class="form-label">活动内容</label><textarea v-model="form.description" class="textarea" placeholder="活动说明、地点、注意事项等"></textarea></div>

      <template v-if="form.type==='vote'">
        <div class="form-group">
          <label class="form-label">投票选项</label>
          <div v-for="(opt, idx) in form.options" :key="idx" class="option-input-row">
            <input v-model="opt.text" class="input" placeholder="选项文字" />
            <button type="button" class="btn btn-sm btn-secondary" :disabled="form.options.length <= 2" @click="removeOption(idx)">删除</button>
          </div>
          <button type="button" class="btn btn-sm btn-primary" style="margin-top:8px" @click="addOption">+ 添加选项</button>
          <p v-if="optionError" class="error-text">{{ optionError }}</p>
        </div>
        <div class="form-group toggle-row">
          <label class="form-label">是否多选</label>
          <input type="checkbox" v-model="form.allowMultiple" />
        </div>
        <div class="form-group toggle-row">
          <label class="form-label">是否匿名</label>
          <input type="checkbox" v-model="form.anonymous" />
        </div>
      </template>

      <template v-if="form.type==='tentative'">
        <div class="form-group"><label class="form-label">统计时间段 开始</label><input type="datetime-local" v-model="form.rangeStart" class="input" /></div>
        <div class="form-group"><label class="form-label">统计时间段 结束</label><input type="datetime-local" v-model="form.rangeEnd" class="input" /></div>
      </template>
      <template v-if="form.type==='fixed'">
        <div class="form-group"><label class="form-label">确定的活动时间 开始</label><input type="datetime-local" v-model="form.fixedStart" class="input" /></div>
        <div class="form-group"><label class="form-label">确定的活动时间 结束</label><input type="datetime-local" v-model="form.fixedEnd" class="input" /></div>
      </template>

      <div class="form-group"><label class="form-label">回复截止时间（可选）</label><input type="datetime-local" v-model="form.deadline" class="input" /></div>

      <button class="btn btn-primary" style="width:100%;margin-top:8px" @click="submit" :disabled="loading">发起活动</button>
      <button class="btn btn-secondary" style="width:100%;margin-top:10px" @click="$emit('close')">取消</button>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue';
import api from '../api.js';
import { useToast } from '../composables.js';
import { toISO, nowLocalInput } from '../utils.js';

const emit = defineEmits(['close', 'saved']);
const { show } = useToast();
const loading = ref(false);
const form = reactive({
  type: 'tentative',
  title: '',
  description: '',
  rangeStart: nowLocalInput(),
  rangeEnd: nowLocalInput(),
  fixedStart: nowLocalInput(),
  fixedEnd: nowLocalInput(),
  deadline: '',
  options: [{ text: '' }, { text: '' }, { text: '' }],
  allowMultiple: false,
  anonymous: false
});
const optionError = ref('');

function addOption() {
  form.options.push({ text: '' });
}
function removeOption(idx) {
  if (form.options.length > 2) form.options.splice(idx, 1);
}

async function submit() {
  optionError.value = '';
  if (!form.title) { show('请填写标题', 'error'); return; }
  const payload = {
    type: form.type,
    title: form.title,
    description: form.description,
    deadline: toISO(form.deadline)
  };
  if (form.type === 'tentative') {
    payload.rangeStart = toISO(form.rangeStart);
    payload.rangeEnd = toISO(form.rangeEnd);
  } else if (form.type === 'fixed') {
    payload.fixedStart = toISO(form.fixedStart);
    payload.fixedEnd = toISO(form.fixedEnd);
  } else if (form.type === 'vote') {
    const opts = form.options.map(o => o.text.trim()).filter(Boolean);
    if (opts.length < 2) { show('至少需要 2 个非空选项', 'error'); return; }
    if (new Set(opts).size !== opts.length) { show('选项文字不能重复', 'error'); return; }
    payload.options = form.options.map(o => ({ text: o.text.trim() }));
    payload.allowMultiple = form.allowMultiple;
    payload.anonymous = form.anonymous;
  }
  if (form.type === 'tentative' && (!payload.rangeStart || !payload.rangeEnd)) {
    show('请填写完整的统计时间段', 'error'); return;
  }
  if (form.type === 'fixed' && (!payload.fixedStart || !payload.fixedEnd)) {
    show('请填写完整活动时间', 'error'); return;
  }
  loading.value = true;
  try {
    await api.post('/activities', payload);
    show('发起成功', 'success');
    emit('saved');
    emit('close');
  } catch (e) {
    show(e.response?.data?.error || '发起失败', 'error');
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.modal-overlay { position: fixed; inset: 0; background: rgba(90,74,66,0.35); z-index: 100; display: flex; align-items: flex-end; justify-content: center; }
.modal-card { background: #fff; width: 100%; max-width: 640px; border-radius: 28px 28px 0 0; max-height: 90vh; overflow: auto; padding: 24px; }
.modal-title { font-family: var(--font-serif); text-align: center; margin-bottom: 16px; }
.option-input-row { display: flex; gap: 8px; margin-bottom: 8px; align-items: center; }
.option-input-row .input { flex: 1; }
.toggle-row { display: flex; align-items: center; justify-content: space-between; }
.toggle-row input { width: 18px; height: 18px; accent-color: #F0937E; }
.error-text { color: #c45b4a; font-size: 12px; margin-top: 6px; }
</style>
