<template>
  <div class="input-wrapper">
    <input
      :value="modelValue"
      :class="['base-input', { 'has-error': error }]"
      :aria-invalid="error ? 'true' : 'false'"
      :disabled="disabled"
      :aria-disabled="disabled ? 'true' : 'false'"
      v-bind="$attrs"
      @input="$emit('update:modelValue', $event.target.value)"
    />
    <span v-if="error" class="error-message" role="alert">{{ error }}</span>
  </div>
</template>

<script>
export default {
  name: 'BaseInput',
  props: {
    modelValue: {
      type: [String, Number],
      default: ''
    },
    error: {
      type: String,
      default: ''
    },
    disabled: {
      type: Boolean,
      default: false
    }
  },
  emits: ['update:modelValue']
}
</script>

<style scoped>
.input-wrapper {
  position: relative;
  width: 100%;
}

.base-input {
  width: 100%;
  padding: var(--spacing-3) var(--spacing-4);
  border: 2px solid #e1e8ed;
  border-radius: var(--border-radius-md);
  font-size: var(--font-size-base);
  font-family: var(--font-family);
  color: var(--text-primary);
  background: rgba(255, 255, 255, 0.9);
  transition: all var(--transition-fast);
}

.base-input:hover:not(:disabled) {
  border-color: var(--color-primary);
}

.base-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  transform: translateY(-1px);
}

.base-input:disabled {
  background-color: #f5f5f5;
  cursor: not-allowed;
  opacity: 0.7;
}

.base-input.has-error {
  border-color: var(--color-danger);
}

.base-input.has-error:focus {
  box-shadow: 0 0 0 3px rgba(255, 107, 107, 0.1);
}

.error-message {
  position: absolute;
  left: 0;
  bottom: -20px;
  font-size: var(--font-size-xs);
  color: var(--color-danger);
  margin-top: var(--spacing-1);
}

/* 高对比度模式适配 */
@media (prefers-contrast: more) {
  .base-input {
    border: 2px solid var(--text-color);
    background: var(--bg-color);
    color: var(--text-color);
  }

  .base-input:focus {
    outline: 2px solid var(--text-color);
    outline-offset: 2px;
  }

  .error-message {
    color: var(--text-color);
    text-decoration: underline;
  }
}
</style>