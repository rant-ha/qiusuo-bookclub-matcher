<template>
  <main class="home">
    <section class="hero-section" aria-labelledby="welcome-heading">
      <div class="card">
        <h1 id="welcome-heading">欢迎来到 KindredMinds</h1>
        <p>这是一个帮助人们建立联系的平台。</p>
        <div class="actions">
          <router-link
            to="/register"
            class="btn btn-primary"
            role="button"
            aria-label="开始注册新账号"
          >
            立即注册
          </router-link>
        </div>
      </div>
    </section>
    
    <section class="image-showcase" aria-label="平台功能展示">
      <LazyImageDemo />
    </section>
  </main>
</template>

<script setup>
import { onMounted } from 'vue'
import LazyImageDemo from '@/components/LazyImageDemo.vue'
</script>

<style scoped>
.home {
  text-align: center;
  padding: 2rem 1rem;
}

h1 {
  margin-bottom: 1rem;
  color: var(--dark-color);
}

p {
  color: var(--secondary-color);
  margin-bottom: 2rem;
}

.actions {
  margin-top: 2rem;
  margin-bottom: 3rem;
}

.btn {
  min-width: 120px;
}
</style>