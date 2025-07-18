import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import vLazy from './directives/v-lazy'

import './assets/main.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.directive('lazy', vLazy)

app.mount('#app')