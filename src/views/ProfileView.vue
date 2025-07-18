<template>
  <div class="profile-container">
    <div class="profile-header">
      <h1>个人资料</h1>
      <p class="subtitle">管理您的个人信息和阅读偏好</p>
    </div>

    <div class="profile-content">
      <form @submit.prevent="handleSubmit" class="profile-form">
        <!-- 基本信息 -->
        <CollapsibleSection title="基本信息" :defaultOpen="true">
          <h2>基本信息</h2>
          <div class="form-group">
            <label for="name">姓名</label>
            <input 
              id="name" 
              v-model="formData.name" 
              type="text" 
              readonly 
              class="readonly-field"
            >
          </div>
          <div class="form-group">
            <label for="studentId">学号</label>
            <input 
              id="studentId" 
              v-model="formData.studentId" 
              type="text" 
              readonly 
              class="readonly-field"
            >
          </div>
        </CollapsibleSection>

        <!-- 个人偏好 -->
        <CollapsibleSection title="个人偏好">
          <h2>个人偏好</h2>
          <div class="form-group">
            <label>性别</label>
            <div class="radio-group">
              <label class="radio-option">
                <input 
                  v-model="formData.gender" 
                  type="radio" 
                  value="male"
                >
                <span>男</span>
              </label>
              <label class="radio-option">
                <input 
                  v-model="formData.gender" 
                  type="radio" 
                  value="female"
                >
                <span>女</span>
              </label>
              <label class="radio-option">
                <input 
                  v-model="formData.gender" 
                  type="radio" 
                  value="other"
                >
                <span>其他</span>
              </label>
              <label class="radio-option">
                <input 
                  v-model="formData.gender" 
                  type="radio" 
                  value="prefer_not_to_say"
                >
                <span>不便透露</span>
              </label>
            </div>
          </div>

          <div class="form-group">
            <label>匹配性别偏好</label>
            <div class="radio-group">
              <label class="radio-option">
                <input 
                  v-model="formData.matchGenderPreference" 
                  type="radio" 
                  value="male"
                >
                <span>男性</span>
              </label>
              <label class="radio-option">
                <input 
                  v-model="formData.matchGenderPreference" 
                  type="radio" 
                  value="female"
                >
                <span>女性</span>
              </label>
              <label class="radio-option">
                <input 
                  v-model="formData.matchGenderPreference" 
                  type="radio" 
                  value="no_preference"
                >
                <span>无偏好</span>
              </label>
            </div>
          </div>

          <div class="form-group">
            <label>匹配类型偏好</label>
            <div class="radio-group">
              <label class="radio-option">
                <input 
                  v-model="formData.matchingTypePreference" 
                  type="radio" 
                  value="similar"
                >
                <span>相似兴趣</span>
              </label>
              <label class="radio-option">
                <input 
                  v-model="formData.matchingTypePreference" 
                  type="radio" 
                  value="complementary"
                >
                <span>互补兴趣</span>
              </label>
              <label class="radio-option">
                <input 
                  v-model="formData.matchingTypePreference" 
                  type="radio" 
                  value="no_preference"
                >
                <span>无偏好</span>
              </label>
            </div>
          </div>
        </CollapsibleSection>

        <!-- 阅读偏好 -->
        <CollapsibleSection title="阅读偏好">
          <h2>阅读偏好</h2>
          <div class="form-group">
            <label>书籍类别 <span class="required">*</span></label>
            <div class="checkbox-group">
              <label class="checkbox-option" v-for="category in bookCategoryOptions" :key="category.value">
                <input 
                  v-model="formData.bookCategories" 
                  type="checkbox" 
                  :value="category.value"
                >
                <span>{{ category.label }}</span>
              </label>
            </div>
            <p class="help-text">请选择至少1个，最多7个书籍类别</p>
          </div>

          <div class="form-group">
            <label for="detailedPreferences">详细阅读偏好</label>
            <textarea 
              id="detailedPreferences" 
              v-model="formData.detailedBookPreferences" 
              placeholder="描述您的详细阅读偏好、喜欢的作者、不喜欢的类型等..."
              rows="4"
              maxlength="500"
            ></textarea>
            <p class="help-text">{{ formData.detailedBookPreferences.length }}/500</p>
          </div>

          <div class="form-group">
            <label>最爱的书籍 <span class="required">*</span></label>
            <div class="favorite-books">
              <div v-for="(book, index) in formData.favoriteBooks" :key="index" class="book-input-row">
                <input 
                  v-model="formData.favoriteBooks[index]" 
                  type="text" 
                  :placeholder="`第${index + 1}本书`"
                  maxlength="100"
                >
                <button 
                  type="button" 
                  @click="removeFavoriteBook(index)" 
                  class="remove-btn"
                  v-if="formData.favoriteBooks.length > 2"
                >
                  ×
                </button>
              </div>
              <button 
                type="button" 
                @click="addFavoriteBook" 
                class="add-btn"
                v-if="formData.favoriteBooks.length < 10"
              >
                + 添加书籍
              </button>
            </div>
            <p class="help-text">请填写至少2本，最多10本您最喜欢的书籍</p>
          </div>

          <div class="form-group">
            <label>阅读强度 <span class="required">*</span></label>
            <div class="radio-group">
              <label class="radio-option">
                <input 
                  v-model="formData.readingCommitment" 
                  type="radio" 
                  value="light"
                >
                <span>轻松阅读 (每月1-2本)</span>
              </label>
              <label class="radio-option">
                <input 
                  v-model="formData.readingCommitment" 
                  type="radio" 
                  value="medium"
                >
                <span>中等阅读 (每月3-4本)</span>
              </label>
              <label class="radio-option">
                <input 
                  v-model="formData.readingCommitment" 
                  type="radio" 
                  value="intensive"
                >
                <span>深度阅读 (每月5-6本)</span>
              </label>
              <label class="radio-option">
                <input 
                  v-model="formData.readingCommitment" 
                  type="radio" 
                  value="epic"
                >
                <span>疯狂阅读 (每月7本以上)</span>
              </label>
            </div>
          </div>
        </CollapsibleSection>

        <!-- 传统字段 -->
        <CollapsibleSection title="兴趣爱好">
          <h2>兴趣爱好</h2>
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
          <button
            type="submit"
            :disabled="isLoading"
            :class="{ 'btn-loading': isLoading }"
            class="submit-btn"
          >
            <span v-if="isLoading">
              <i class="spinner"></i>
              保存中...
            </span>
            <span v-else>保存修改</span>
          </button>
        </div>

        <!-- 错误提示 -->
        <Transition name="fade-slide">
          <div v-if="error" class="error-message">
            {{ error }}
          </div>
        </Transition>

        <!-- 成功提示和撤销按钮 -->
        <Transition name="fade-slide">
          <div v-if="showSuccess" class="success-message">
            <span>个人资料更新成功！</span>
            <button
              v-if="showUndoButton"
              @click="handleUndo"
              class="undo-btn"
            >
              撤销
            </button>
          </div>
        </Transition>
      </form>
    </div>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import CollapsibleSection from '@/components/CollapsibleSection.vue'

export default {
  name: 'ProfileView',
  components: {
    CollapsibleSection
  },
  setup() {
    const authStore = useAuthStore()
    const router = useRouter()
    
    const isLoading = ref(false)
    const error = ref('')
    const showSuccess = ref(false)
    const showUndoButton = ref(false)
    let undoTimer = null
    
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
    
    // 组件挂载时初始化
    onMounted(() => {
      initializeForm()
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
  padding: 20px;
  background: #f8f9fa;
  min-height: 100vh;
}

.profile-header {
  text-align: center;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 2px solid #e9ecef;
}

.profile-header h1 {
  color: #2c3e50;
  margin-bottom: 8px;
  font-size: 2rem;
}

.subtitle {
  color: #6c757d;
  font-size: 1.1rem;
  margin: 0;
}

.profile-content {
  background: white;
  border-radius: 10px;
  padding: 30px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}


.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-weight: 600;
  color: #495057;
  margin-bottom: 8px;
}

.required {
  color: #dc3545;
}

.form-group input[type="text"],
.form-group textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #ced4da;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.3s ease;
}

.form-group input[type="text"]:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}

.readonly-field {
  background-color: #f8f9fa;
  color: #6c757d;
  cursor: not-allowed;
}

.radio-group,
.checkbox-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.radio-option,
.checkbox-option {
  position: relative;
  cursor: pointer;
  user-select: none;
}

.radio-option input,
.checkbox-option input {
  position: absolute;
  opacity: 0;
  cursor: pointer;
  height: 0;
  width: 0;
}

.radio-option span,
.checkbox-option span {
  display: inline-block;
  padding: 8px 16px;
  border: 2px solid #e0e0e0;
  border-radius: 20px;
  background-color: white;
  color: #666;
  font-size: 14px;
  transition: all 0.3s ease;
}

.radio-option:hover span,
.checkbox-option:hover span {
  border-color: #007bff;
  color: #007bff;
}

.radio-option input:checked + span,
.checkbox-option input:checked + span {
  background-color: #007bff;
  border-color: #007bff;
  color: white;
}

.radio-option input:focus + span,
.checkbox-option input:focus + span {
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.25);
}

.favorite-books {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.book-input-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.book-input-row input {
  flex: 1;
}

.remove-btn {
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
}

.remove-btn:hover {
  background: #c82333;
}

.add-btn {
  background: #28a745;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  margin-top: 10px;
}

.add-btn:hover {
  background: #218838;
}

.help-text {
  font-size: 12px;
  color: #6c757d;
  margin-top: 5px;
  margin-bottom: 0;
}

.form-actions {
  text-align: center;
  margin-top: 30px;
}

.submit-btn {
  background: #007bff;
  color: white;
  border: none;
  padding: 15px 40px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.submit-btn:hover:not(:disabled) {
  background: #0056b3;
}

.submit-btn:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.error-message {
  background: #f8d7da;
  color: #721c24;
  padding: 12px;
  border-radius: 6px;
  margin-top: 20px;
  border: 1px solid #f5c6cb;
}

.success-message {
  background: #d4edda;
  color: #155724;
  padding: 12px;
  border-radius: 6px;
  margin-top: 20px;
  border: 1px solid #c3e6cb;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.undo-btn {
  background: #155724;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s ease;
}

.undo-btn:hover {
  background: #0f3d19;
}

@media (max-width: 768px) {
  .profile-container {
    padding: 10px;
  }
  
  .profile-content {
    padding: 20px;
  }
  
  .radio-group,
  .checkbox-group {
    justify-content: center;
    gap: 8px;
  }

  .radio-option span,
  .checkbox-option span {
    padding: 6px 12px;
    font-size: 13px;
  }
}
</style>