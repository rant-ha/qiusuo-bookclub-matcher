<template>
  <main class="profile-container">
    <header class="profile-header">
      <h1 id="profile-title">个人资料</h1>
      <p class="subtitle" id="profile-description">管理您的个人信息和阅读偏好</p>
    </header>

    <BaseCard role="main" aria-labelledby="profile-title" aria-describedby="profile-description">
      <form
        @submit.prevent="handleSubmit"
        class="profile-form"
        aria-label="个人资料编辑表单"
      >
        <!-- 基本信息 -->
        <CollapsibleSection
          title="基本信息"
          :defaultOpen="true"
          aria-label="基本个人信息区域"
        >
          <h2 id="basic-info-heading">基本信息</h2>
          <div class="form-group">
            <label for="name">姓名</label>
            <BaseInput
              id="name"
              v-model="formData.name"
              type="text"
              readonly
              disabled
            />
          </div>
          <div class="form-group">
            <label for="studentId">学号</label>
            <BaseInput
              id="studentId"
              v-model="formData.studentId"
              type="text"
              readonly
              disabled
            />
          </div>
        </CollapsibleSection>

        <!-- 个人偏好 -->
        <CollapsibleSection
          title="个人偏好"
          aria-label="个人偏好设置区域"
        >
          <h2 id="preferences-heading">个人偏好</h2>
          <div class="form-group">
            <label>性别</label>
            <div class="radio-group" role="radiogroup">
              <BaseInput
                type="radio"
                v-model="formData.gender"
                name="gender"
                value="male"
                label="男生"
              />
              <BaseInput
                type="radio"
                v-model="formData.gender"
                name="gender"
                value="female"
                label="女生"
              />
              <BaseInput
                type="radio"
                v-model="formData.gender"
                name="gender"
                value="other"
                label="其他"
              />
              <BaseInput
                type="radio"
                v-model="formData.gender"
                name="gender"
                value="prefer_not_to_say"
                label="不便透露"
              />
            </div>
          </div>

          <div class="form-group">
            <label>匹配性别偏好</label>
            <div class="radio-group" role="radiogroup">
              <BaseInput
                type="radio"
                v-model="formData.matchGenderPreference"
                name="matchGenderPreference"
                value="male"
                label="男生"
              />
              <BaseInput
                type="radio"
                v-model="formData.matchGenderPreference"
                name="matchGenderPreference"
                value="female"
                label="女生"
              />
              <BaseInput
                type="radio"
                v-model="formData.matchGenderPreference"
                name="matchGenderPreference"
                value="no_preference"
                label="无偏好"
              />
            </div>
          </div>

          <div class="form-group">
            <label>匹配类型偏好</label>
            <div class="radio-group" role="radiogroup">
              <BaseInput
                type="radio"
                v-model="formData.matchingTypePreference"
                name="matchingTypePreference"
                value="similar"
                label="相似兴趣"
              />
              <BaseInput
                type="radio"
                v-model="formData.matchingTypePreference"
                name="matchingTypePreference"
                value="complementary"
                label="互补兴趣"
              />
              <BaseInput
                type="radio"
                v-model="formData.matchingTypePreference"
                name="matchingTypePreference"
                value="no_preference"
                label="无偏好"
              />
            </div>
          </div>
        </CollapsibleSection>

        <!-- 阅读偏好 -->
        <CollapsibleSection
          title="阅读偏好"
          aria-label="阅读偏好设置区域"
        >
          <h2 id="reading-preferences-heading">阅读偏好</h2>
          <div class="form-group">
            <label id="book-categories-label">书籍类别 <span class="required" aria-hidden="true">*</span></label>
            <div
              class="checkbox-group"
              role="group"
              aria-labelledby="book-categories-label"
              aria-required="true"
            >
              <BaseInput
                v-for="category in bookCategoryOptions"
                :key="category.value"
                type="checkbox"
                v-model="formData.bookCategories"
                :value="category.value"
                :label="category.label"
              />
            </div>
            <p class="help-text">请选择至少1个，最多7个书籍类别</p>
          </div>

          <div class="form-group">
            <label for="detailedPreferences">详细阅读偏好</label>
            <BaseInput
              id="detailedPreferences"
              v-model="formData.detailedBookPreferences"
              type="textarea"
              placeholder="描述您的详细阅读偏好、喜欢的作者、不喜欢的类型等..."
              :rows="4"
              maxlength="500"
            />
            <p class="help-text">{{ formData.detailedBookPreferences.length }}/500</p>
          </div>

          <div class="form-group">
            <label id="favorite-books-label">最爱的书籍 <span class="required" aria-hidden="true">*</span></label>
            <div
              class="favorite-books"
              role="group"
              aria-labelledby="favorite-books-label"
              aria-required="true"
            >
              <div v-for="(book, index) in formData.favoriteBooks" :key="index" class="book-input-row">
                <BaseInput
                  v-model="formData.favoriteBooks[index]"
                  type="text"
                  :placeholder="`第${index + 1}本书`"
                  maxlength="100"
                />
                <BaseButton
                  type="button"
                  @click="removeFavoriteBook(index)"
                  variant="text"
                  v-if="formData.favoriteBooks.length > 2"
                  :aria-label="`删除第${index + 1}本书`"
                >
                  ×
                </BaseButton>
              </div>
              <BaseButton
                type="button"
                @click="addFavoriteBook"
                variant="secondary"
                v-if="formData.favoriteBooks.length < 10"
                aria-label="添加新的最爱书籍"
              >
                + 添加书籍
              </BaseButton>
            </div>
            <p class="help-text">请填写至少2本，最多10本您最喜欢的书籍</p>
          </div>

          <div class="form-group">
            <label id="reading-intensity-label">阅读强度 <span class="required" aria-hidden="true">*</span></label>
            <div
              class="radio-group"
              role="radiogroup"
              aria-labelledby="reading-intensity-label"
              aria-required="true"
            >
              <BaseInput
                type="radio"
                v-model="formData.readingCommitment"
                name="readingCommitment"
                value="light"
                label="轻松阅读 (每月1-2本)"
              />
              <BaseInput
                type="radio"
                v-model="formData.readingCommitment"
                name="readingCommitment"
                value="medium"
                label="中等阅读 (每月3-4本)"
              />
              <BaseInput
                type="radio"
                v-model="formData.readingCommitment"
                name="readingCommitment"
                value="intensive"
                label="深度阅读 (每月5-6本)"
              />
              <BaseInput
                type="radio"
                v-model="formData.readingCommitment"
                name="readingCommitment"
                value="epic"
                label="疯狂阅读 (每月7本以上)"
              />
            </div>
          </div>
        </CollapsibleSection>

        <!-- 传统字段 -->
        <CollapsibleSection
          title="兴趣爱好"
          aria-label="兴趣爱好设置区域"
        >
          <h2 id="hobbies-heading">兴趣爱好</h2>
          <div class="form-group">
            <label for="hobbies">爱好</label>
            <textarea 
              id="hobbies" 
              v-model="hobbiesText" 
              placeholder="请用逗号分隔您的爱好..."
              rows="3"
            ></textarea>
          </div>

          <div class="form-group">
            <label for="books">感兴趣的书籍</label>
            <textarea 
              id="books" 
              v-model="booksText" 
              placeholder="请用逗号分隔您感兴趣的书籍..."
              rows="3"
            ></textarea>
          </div>
        </CollapsibleSection>

        <!-- 提交按钮 -->
        <div class="form-actions">
          <BaseButton
            type="submit"
            :disabled="isLoading"
            :loading="isLoading"
            variant="primary"
            aria-label="保存个人资料"
          >
            {{ isLoading ? '保存中...' : '保存修改' }}
          </BaseButton>
        </div>

        <!-- 错误提示 -->
        <Transition name="fade-slide">
          <div
            v-if="error"
            class="error-message"
            role="alert"
            aria-live="assertive"
          >
            {{ error }}
          </div>
        </Transition>

        <!-- 成功提示和撤销按钮 -->
        <Transition name="fade-slide">
          <div
            v-if="showSuccess"
            class="success-message"
            role="status"
            aria-live="polite"
          >
            <span>个人资料更新成功！</span>
            <BaseButton
              v-if="showUndoButton"
              @click="handleUndo"
              variant="text"
              :disabled="isLoading"
              :loading="isLoading"
              aria-label="撤销最近的修改"
            >
              {{ isLoading ? '撤销中...' : '撤销' }}
            </BaseButton>
          </div>
        </Transition>
      </form>
    </BaseCard>
  </main>
</template>

<script>
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import CollapsibleSection from '@/components/CollapsibleSection.vue'
import { useAutoSave } from '@/composables/useAutoSave'
import BaseCard from '@/components/base/BaseCard.vue'
import BaseInput from '@/components/base/BaseInput.vue'
import BaseButton from '@/components/base/BaseButton.vue'

// 存储所有区块标题元素的引用
const sectionHeaders = ref([])
let currentFocusIndex = -1

export default {
  name: 'ProfileView',
  components: {
    CollapsibleSection,
    BaseCard,
    BaseInput,
    BaseButton
  },
  setup() {
    const authStore = useAuthStore()
    const router = useRouter()
    
    const isLoading = ref(false)
    const error = ref('')
    const showSuccess = ref(false)
    const showUndoButton = ref(false)
    let undoTimer = null

    // 初始化自动保存
    const { saveToStorage, restoreFromStorage, clearStorage, hasSavedData } = useAutoSave('profile_form_data', {
      onSave: () => console.log('个人资料已自动保存'),
      onRestore: (data) => {
        Object.keys(data).forEach(key => {
          if (formData[key] !== undefined) {
            formData[key] = data[key]
          }
        })
        if (data.hobbies) hobbiesText.value = data.hobbies
        if (data.books) booksText.value = data.books
      }
    })

    // 监听表单数据变化
    watch([
      () => ({...formData}),
      () => hobbiesText.value,
      () => booksText.value
    ], ([newFormData, newHobbies, newBooks]) => {
      saveToStorage({
        ...newFormData,
        hobbies: newHobbies,
        books: newBooks
      })
    }, { deep: true })
    
    // 表单数据
    const formData = reactive({
      name: '',
      studentId: '',
      gender: '',
      matchGenderPreference: '',
      matchingTypePreference: '',
      bookCategories: [],
      detailedBookPreferences: '',
      favoriteBooks: ['', ''], // 默认至少2个输入框
      readingCommitment: ''
    })
    
    const hobbiesText = ref('')
    const booksText = ref('')
    
    // 书籍类别选项
    const bookCategoryOptions = [
      { value: 'literature_fiction', label: '文学小说' },
      { value: 'mystery_detective', label: '悬疑推理' },
      { value: 'sci_fi_fantasy', label: '科幻奇幻' },
      { value: 'history_biography', label: '历史传记' },
      { value: 'social_science_philosophy', label: '社科哲学' },
      { value: 'psychology_self_help', label: '心理自助' },
      { value: 'art_design_lifestyle', label: '艺术设计生活' }
    ]
    
    // 检查用户是否已登录
    const currentUser = computed(() => authStore.user)
    
    // 初始化表单数据
    const initializeForm = () => {
      if (!currentUser.value) {
        router.push('/login')
        return
      }
      
      const user = currentUser.value
      
      // 基本信息
      formData.name = user.name || ''
      formData.studentId = user.studentId || ''
      formData.gender = user.gender || ''
      formData.matchGenderPreference = user.matchGenderPreference || ''
      formData.matchingTypePreference = user.matchingTypePreference || ''
      formData.bookCategories = user.bookCategories || []
      formData.detailedBookPreferences = user.detailedBookPreferences || ''
      formData.readingCommitment = user.readingCommitment || ''
      
      // 最爱书籍
      if (user.favoriteBooks && user.favoriteBooks.length > 0) {
        formData.favoriteBooks = [...user.favoriteBooks]
        // 确保至少有2个输入框
        while (formData.favoriteBooks.length < 2) {
          formData.favoriteBooks.push('')
        }
      }
      
      // 传统字段
      hobbiesText.value = user.hobbies ? user.hobbies.join(', ') : ''
      booksText.value = user.books ? user.books.join(', ') : ''
    }
    
    // 添加收藏书籍输入框
    const addFavoriteBook = () => {
      if (formData.favoriteBooks.length < 10) {
        formData.favoriteBooks.push('')
      }
    }
    
    // 移除收藏书籍输入框
    const removeFavoriteBook = (index) => {
      if (formData.favoriteBooks.length > 2) {
        formData.favoriteBooks.splice(index, 1)
      }
    }
    
    // 表单提交
    const handleSubmit = async () => {
      if (!currentUser.value) return
      
      error.value = ''
      showSuccess.value = false
      isLoading.value = true
      
      try {
        // 准备更新数据
        const updateData = {
          gender: formData.gender,
          matchGenderPreference: formData.matchGenderPreference,
          matchingTypePreference: formData.matchingTypePreference,
          bookCategories: formData.bookCategories,
          detailedBookPreferences: formData.detailedBookPreferences,
          favoriteBooks: formData.favoriteBooks.filter(book => book.trim()),
          readingCommitment: formData.readingCommitment,
          // 传统字段
          hobbies: hobbiesText.value ? hobbiesText.value.split(/[，,]/).map(item => item.trim()).filter(item => item) : [],
          books: booksText.value ? booksText.value.split(/[，,]/).map(item => item.trim()).filter(item => item) : []
        }
        
        const success = await authStore.updateUserProfile(updateData)
        
        if (success) {
          showSuccess.value = true
          showUndoButton.value = true
          clearStorage() // 保存成功后清除暂存数据
          
          // 清除之前的计时器
          if (undoTimer) {
            clearTimeout(undoTimer)
          }
          
          // 7秒后隐藏撤销按钮和成功提示
          undoTimer = setTimeout(() => {
            showSuccess.value = false
            showUndoButton.value = false
          }, 7000)
        }
      } catch (err) {
        error.value = err.message || '更新失败，请重试'
      } finally {
        isLoading.value = false
      }
    }
    
    // 键盘事件处理
    const handleKeyDown = (event) => {
      // 如果当前焦点在输入框或文本域，不处理导航
      if (document.activeElement.tagName === 'INPUT' ||
          document.activeElement.tagName === 'TEXTAREA') {
        return
      }

      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault()
          if (currentFocusIndex > 0) {
            currentFocusIndex--
            sectionHeaders.value[currentFocusIndex]?.focus()
          }
          break
        case 'ArrowDown':
          event.preventDefault()
          if (currentFocusIndex < sectionHeaders.value.length - 1) {
            currentFocusIndex++
            sectionHeaders.value[currentFocusIndex]?.focus()
          }
          break
        case 'Escape':
          if (showSuccess.value) {
            showSuccess.value = false
            showUndoButton.value = false
            if (undoTimer) {
              clearTimeout(undoTimer)
            }
          }
          break
      }
    }

    // 组件挂载时初始化
    onMounted(() => {
      initializeForm()
      
      // 收集所有区块标题元素
      sectionHeaders.value = Array.from(
        document.querySelectorAll('.section-header')
      )
      
      // 添加键盘事件监听
      window.addEventListener('keydown', handleKeyDown)

      // 检查是否有已保存的数据
      if (hasSavedData.value) {
        const shouldRestore = window.confirm('发现未保存的个人资料修改，是否恢复？')
        if (shouldRestore) {
          restoreFromStorage()
        } else {
          clearStorage()
        }
      }
    })

    // 组件卸载时清理
    onUnmounted(() => {
      window.removeEventListener('keydown', handleKeyDown)
      if (undoTimer) {
        clearTimeout(undoTimer)
      }
    })

    // 处理撤销操作
    const handleUndo = async () => {
      isLoading.value = true
      error.value = ''
      showSuccess.value = false
      showUndoButton.value = false

      try {
        const success = await authStore.revertUserProfile()
        if (success) {
          showSuccess.value = true
          setTimeout(() => {
            showSuccess.value = false
          }, 3000)
        }
      } catch (err) {
        error.value = err.message || '撤销失败，请重试'
      } finally {
        isLoading.value = false
      }
    }
    
    return {
      formData,
      hobbiesText,
      booksText,
      bookCategoryOptions,
      isLoading,
      error,
      showSuccess,
      addFavoriteBook,
      removeFavoriteBook,
      handleSubmit,
      handleUndo,
      showUndoButton
    }
  }
}
</script>

<style scoped>
.profile-container {
  max-width: 800px;
  margin: 0 auto;
  padding: var(--spacing-4);
  min-height: 100vh;
}

.profile-header {
  text-align: center;
  margin-bottom: var(--spacing-8);
  padding-bottom: var(--spacing-6);
  border-bottom: 2px solid var(--glass-border);
}

.profile-header h1 {
  margin-bottom: var(--spacing-2);
  font-size: var(--font-size-3xl);
}

.subtitle {
  color: var(--text-muted);
  font-size: var(--font-size-lg);
  margin: 0;
}

.form-group {
  margin-bottom: var(--spacing-6);
}

.form-group label {
  display: block;
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin-bottom: var(--spacing-2);
}

.required {
  color: var(--color-danger);
}

.radio-group,
.checkbox-group {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-3);
}

.favorite-books {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

.book-input-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  margin-bottom: var(--spacing-2);
}

.book-input-row :deep(.base-input) {
  flex: 1;
}

.help-text {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  margin-top: var(--spacing-1);
  margin-bottom: 0;
}

.form-actions {
  text-align: center;
  margin-top: var(--spacing-8);
}

.error-message {
  background: var(--glass-bg);
  color: var(--color-danger);
  padding: var(--spacing-3);
  border-radius: var(--border-radius-md);
  margin-top: var(--spacing-4);
  border: 1px solid var(--color-danger);
}

.success-message {
  background: var(--glass-bg);
  color: var(--color-success);
  padding: var(--spacing-3);
  border-radius: var(--border-radius-md);
  margin-top: var(--spacing-4);
  border: 1px solid var(--color-success);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

@media (max-width: 768px) {
  .profile-container {
    padding: var(--spacing-2);
  }
  
  .radio-group,
  .checkbox-group {
    justify-content: center;
    gap: var(--spacing-2);
  }
}
</style>