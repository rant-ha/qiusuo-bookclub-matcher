<template>
  <div class="collapsible-section">
    <div 
      class="section-header" 
      @click="toggleSection"
      :class="{ 'is-open': isOpen }"
    >
      <h2>{{ title }}</h2>
      <span class="toggle-icon">{{ isOpen ? '▼' : '▶' }}</span>
    </div>
    <transition name="slide">
      <div
        v-show="isOpen"
        class="section-content"
        ref="content"
      >
        <slot></slot>
      </div>
    </transition>
  </div>
</template>

<script>
export default {
  name: 'CollapsibleSection',
  props: {
    title: {
      type: String,
      required: true
    },
    defaultOpen: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      isOpen: this.defaultOpen,
      contentHeight: 0
    }
  },
  mounted() {
    // 获取内容实际高度
    this.$nextTick(() => {
      this.contentHeight = this.$refs.content?.scrollHeight || 0
    })
  },
  methods: {
    toggleSection() {
      this.isOpen = !this.isOpen
    }
  }
}
</script>

<style scoped>
.collapsible-section {
  margin-bottom: 20px;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  overflow: hidden;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background: #f8f9fa;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.section-header:hover {
  background: #e9ecef;
}

.section-header h2 {
  margin: 0;
  font-size: 1.4rem;
  color: #495057;
}

.toggle-icon {
  font-size: 1rem;
  color: #6c757d;
  transition: transform 0.3s ease;
}

.section-header.is-open .toggle-icon {
  transform: rotate(0deg);
}

.section-content {
  padding: 20px;
  background: white;
}

/* 过渡动画 */
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease-out, opacity 0.3s ease-out;
  transform-origin: top;
  will-change: transform, opacity;
}

.slide-enter-from,
.slide-leave-to {
  transform: scaleY(0);
  opacity: 0;
}

@media (max-width: 768px) {
  .section-header {
    padding: 12px 15px;
  }
  
  .section-header h2 {
    font-size: 1.2rem;
  }
  
  .section-content {
    padding: 15px;
  }
}
</style>