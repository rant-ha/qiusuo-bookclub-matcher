<template>
  <span :class="['base-tag', colorClass]">
    <slot></slot>
  </span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  // 标签颜色类型
  type: {
    type: String,
    default: 'primary',
    validator: value => [
      'primary',
      'success',
      'warning',
      'danger',
      'info',
      'muted'
    ].includes(value)
  }
})

const colorClass = computed(() => `base-tag--${props.type}`)
</script>

<style scoped>
.base-tag {
  display: inline-block;
  padding: var(--spacing-1) var(--spacing-3);
  border-radius: var(--border-radius-full);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--text-white);
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-fast);
}

.base-tag:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

/* 颜色变体 */
.base-tag--primary {
  background: var(--bg-gradient-primary);
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

.base-tag--success {
  background: var(--bg-gradient-success);
  box-shadow: 0 2px 8px rgba(0, 184, 148, 0.3);
}

.base-tag--warning {
  background: var(--bg-gradient-warning);
  box-shadow: 0 2px 8px rgba(253, 203, 110, 0.3);
}

.base-tag--danger {
  background: var(--bg-gradient-danger);
  box-shadow: 0 2px 8px rgba(255, 107, 107, 0.3);
}

.base-tag--info {
  background: var(--bg-gradient-info);
  box-shadow: 0 2px 8px rgba(116, 185, 255, 0.3);
}

.base-tag--muted {
  background: var(--bg-gradient-muted);
  box-shadow: 0 2px 8px rgba(149, 165, 166, 0.3);
}

/* hover 效果 */
.base-tag--primary:hover { box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4); }
.base-tag--success:hover { box-shadow: 0 4px 12px rgba(0, 184, 148, 0.4); }
.base-tag--warning:hover { box-shadow: 0 4px 12px rgba(253, 203, 110, 0.4); }
.base-tag--danger:hover { box-shadow: 0 4px 12px rgba(255, 107, 107, 0.4); }
.base-tag--info:hover { box-shadow: 0 4px 12px rgba(116, 185, 255, 0.4); }
.base-tag--muted:hover { box-shadow: 0 4px 12px rgba(149, 165, 166, 0.4); }
</style>