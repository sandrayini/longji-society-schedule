<template>
  <nav class="bottom-nav">
    <RouterLink to="/" class="nav-item" active-class="active">
      <span class="icon">🏠</span>
      <span class="label">首页</span>
    </RouterLink>
    <RouterLink to="/members" class="nav-item" active-class="active">
      <span class="icon">👥</span>
      <span class="label">成员</span>
    </RouterLink>
    <RouterLink to="/profile" class="nav-item" active-class="active">
      <span class="icon">✏️</span>
      <span class="label">我的</span>
    </RouterLink>
  </nav>
</template>

<style scoped>
.bottom-nav {
  position: fixed;
  left: 16px;
  right: 16px;
  bottom: 16px;
  height: 62px;
  background: #fff;
  border-radius: 28px;
  box-shadow: 0 8px 24px rgba(156,133,112,0.14);
  display: flex;
  justify-content: space-around;
  align-items: center;
  z-index: 50;
}
.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  color: #b8a99a;
  text-decoration: none;
  font-size: 12px;
  transition: color .2s;
  flex: 1;
}
.nav-item .icon { font-size: 22px; }
.nav-item.active { color: #f0937e; }
</style>
