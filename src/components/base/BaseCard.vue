<template>
  <div class="base-card">
    <slot></slot>
  </div>
</template>

<script>
export default {
  name: 'BaseCard'
}
</script>

<style scoped>
.base-card {
  /* 玻璃拟态效果 */
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);

  /* 圆角和内边距 */
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-6);

  /* 过渡效果 */
  transition: all var(--transition-normal);
}

.base-card:hover {
  /* 悬停效果 */
  transform: translateY(-2px);
  box-shadow: var(--shadow-xl);
}
</style>