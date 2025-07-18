<template>
  <div class="image-gallery">
    <h2>图片展示区域</h2>
    <div class="image-grid">
      <div v-for="i in 13" :key="i" class="image-container">
        <img 
          v-lazy="`/image${i}.png`"
          :alt="`示例图片 ${i}`"
          class="lazy-image"
        >
        <div class="image-placeholder">
          加载中...
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
// 使用全局注册的 v-lazy 指令
</script>

<style scoped>
.image-gallery {
  padding: 20px;
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
  padding: 20px;
}

.image-container {
  position: relative;
  aspect-ratio: 1;
  background: #f5f5f5;
  border-radius: 8px;
  overflow: hidden;
}

.lazy-image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.lazy-image[src] {
  opacity: 1;
}

.image-placeholder {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #666;
  font-size: 14px;
}
</style>