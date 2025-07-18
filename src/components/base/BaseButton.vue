<template>
  <component
    :is="tag"
    :class="[
      'base-button',
      variant,
      { 'is-loading': loading, 'is-disabled': disabled }
    ]"
    :disabled="disabled || loading"
    :aria-busy="loading ? 'true' : 'false'"
    :aria-disabled="disabled ? 'true' : 'false'"
    :to="to"
    v-bind="$attrs"
  >
    <span v-if="loading" class="spinner" role="status" aria-label="加载中"></span>
    <slot></slot>
  </component>
</template>

<script>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

export default {
  name: 'BaseButton',
  props: {
    variant: {
      type: String,
      default: 'primary',
      validator: (value) => ['primary', 'secondary', 'text'].includes(value)
    },
    loading: {
      type: Boolean,
      default: false
    },
    disabled: {
      type: Boolean,
      default: false
    },
    to: {
      type: [String, Object],
      default: null
    }
  },
  setup(props) {
    const tag = computed(() => props.to ? RouterLink : 'button')
    
    return {
      tag
    }
  }
}
</script>

<style scoped>
.base-button {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-3) var(--spacing-6);
  border-radius: var(--border-radius-md);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  line-height: 1.4;
  cursor: pointer;
  transition: all var(--transition-fast);
  border: none;
  outline: none;
  white-space: nowrap;
  gap: var(--spacing-2);
}

/* 主按钮样式 */
.primary {
  background: var(--bg-gradient-primary);
  color: var(--text-white);
  box-shadow: var(--shadow-md);
}

.primary:hover:not(.is-disabled):not(.is-loading) {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.primary:active:not(.is-disabled):not(.is-loading) {
  transform: translateY(0);
}

/* 次要按钮样式 */
.secondary {
  background: var(--bg-gradient-muted);
  color: var(--text-white);
  box-shadow: var(--shadow-sm);
}

.secondary:hover:not(.is-disabled):not(.is-loading) {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.secondary:active:not(.is-disabled):not(.is-loading) {
  transform: translateY(0);
}

/* 文本按钮样式 */
.text {
  background: transparent;
  color: var(--color-primary);
  padding: var(--spacing-2) var(--spacing-4);
}

.text:hover:not(.is-disabled):not(.is-loading) {
  color: var(--color-secondary);
  background: rgba(102, 126, 234, 0.1);
}

/* 加载状态 */
.is-loading {
  cursor: not-allowed;
  opacity: 0.7;
}

.spinner {
  display: inline-block;
  width: 1em;
  height: 1em;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: spin 0.5s linear infinite;
  margin-right: 0.5em;
  vertical-align: middle;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 禁用状态 */
.is-disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

/* 焦点状态 */
.base-button:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* 确保按钮在高对比度模式下保持可访问性 */
@media (prefers-contrast: more) {
  .primary,
  .secondary {
    background: var(--button-bg);
    border: 2px solid var(--button-border);
    color: var(--text-color);
  }

  .text {
    color: var(--text-color);
    text-decoration: underline;
  }
}
</style>