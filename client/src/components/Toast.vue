<template>
  <div class="toast-stack">
    <TransitionGroup name="toast">
      <div v-for="t in toasts" :key="t.id" class="toast" :class="t.type">
        <span>{{ t.message }}</span>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup>
defineProps({ toasts: Array });
</script>

<style scoped>
.toast-stack {
  position: fixed;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: max-content;
  max-width: 86vw;
}
.toast {
  background: rgba(255,255,255,0.95);
  border-radius: 999px;
  padding: 10px 18px;
  box-shadow: 0 4px 14px rgba(0,0,0,0.1);
  font-size: 14px;
  color: #5a4a42;
  text-align: center;
}
.toast.error { background: #fff0ee; color: #c45b4a; }
.toast.success { background: #f0f9f2; color: #4a7c55; }
.toast-enter-active, .toast-leave-active { transition: all .25s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(-12px); }
</style>
