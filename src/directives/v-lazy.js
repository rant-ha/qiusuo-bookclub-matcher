export default {
  mounted(el, binding) {
    const options = {
      root: null, // 使用视口作为根
      rootMargin: '0px',
      threshold: 0.1 // 当元素10%进入视口时触发
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          // 当元素进入视口时
          el.src = binding.value
          // 图片开始加载后，停止观察
          observer.unobserve(el)
        }
      })
    }, options)

    // 开始观察元素
    observer.observe(el)

    // 在元素销毁时清理observer
    el._observer = observer
  },
  
  unmounted(el) {
    // 清理observer
    if (el._observer) {
      el._observer.disconnect()
      delete el._observer
    }
  }
}