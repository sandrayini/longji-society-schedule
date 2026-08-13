<template>
  <div class="confirm-overlay" @click.self="$emit('cancel')">
    <div class="confirm-card">
      <h4 class="confirm-title">{{ title }}</h4>
      <div class="confirm-body"><slot /></div>
      <div class="confirm-actions">
        <button class="btn btn-secondary" @click="$emit('cancel')">取消</button>
        <button class="btn btn-danger" @click="$emit('confirm')">确认删除</button>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({ title: { type: String, default: '确认' } });
const emit = defineEmits(['confirm', 'cancel']);
</script>

<style scoped>
.confirm-overlay { position: fixed; inset: 0; background: rgba(90,74,66,0.35); z-index: 110; display: flex; align-items: center; justify-content: center; padding: 20px; }
.confirm-card { background: #fff; border-radius: 24px; padding: 24px; width: 100%; max-width: 360px; text-align: center; }
.confirm-title { font-family: var(--font-serif); margin-bottom: 12px; }
.confirm-body { font-size: 14px; color: var(--text-light); line-height: 1.6; margin-bottom: 20px; }
.confirm-actions { display: flex; gap: 10px; }
.confirm-actions .btn { flex: 1; }
</style>
