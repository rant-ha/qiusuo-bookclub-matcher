<template>
  <div class="image-gallery" role="region" aria-labelledby="gallery-heading">
    <h2 id="gallery-heading">平台功能展示</h2>
    <div
      class="image-grid"
      role="list"
      aria-label="功能展示图片列表"
    >
      <div
        v-for="i in 13"
        :key="i"
        class="image-container"
        role="listitem"
      >
        <img
          v-lazy="`/image${i}.png`"
          :alt="getImageDescription(i)"
          class="lazy-image"
          :aria-hidden="!isImageLoaded(i)"
        >
        <div
          class="image-placeholder"
          role="status"
          aria-live="polite"
          v-if="!isImageLoaded(i)"
        >
          <span class="visually-hidden">正在加载图片 {{ i }}</span>
          <span aria-hidden="true">加载中...</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

// 跟踪图片加载状态
const loadedImages = ref(new Set())

// 检查图片是否已加载
const isImageLoaded = (index) => {
  return loadedImages.value.has(index)
}

// 获取图片描述
const getImageDescription = (index) => {
  const descriptions = {
    1: '用户注册界面展示',
    2: '个人资料设置页面',
    3: '阅读偏好配置界面',
    4: '智能匹配功能展示',
    5: '用户互动界面',
    6: '阅读计划设置',
    7: '阅读进度追踪',
    8: '读书笔记功能',
    9: '社区讨论区',
    10: '图书推荐系统',
    11: '阅读统计分析',
    12: '移动端适配展示',
    13: '深色模式界面'
  }
  return descriptions[index] || `平台功能展示图片 ${index}`
}

// 监听图片加载完成
const handleImageLoad = (index) => {
  loadedImages.value.add(index)
}

// 在组件挂载时添加图片加载事件监听
onMounted(() => {
  const images = document.querySelectorAll('.lazy-image')
  images.forEach((img, index) => {
    img.addEventListener('load', () => handleImageLoad(index + 1))
  })
})
</script>

<style scoped>
.image-gallery {
  padding: 20px;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
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
