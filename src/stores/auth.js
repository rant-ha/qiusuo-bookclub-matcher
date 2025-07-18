import { defineStore } from 'pinia'
import { ref, reactive, computed } from 'vue'
import { invalidateUserCaches } from '../services/cache'
import { useOnboarding } from '../composables/useOnboarding'

// Gist API 配置
const GIST_ID = import.meta.env.VITE_GIST_ID
const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN
const GIST_FILENAME = 'bookclub_members.json'

// 表单验证规则
const VALIDATION_RULES = Object.freeze({
  name: {
    required: true,
    minLength: 2,
    maxLength: 50
  },
  studentId: {
    required: true,
    pattern: /^[A-Za-z0-9]+$/
  },
  gender: {
    required: false,
    validValues: ['male', 'female', 'other', 'prefer_not_to_say']
  },
  matchGenderPreference: {
    required: false,
    validValues: ['male', 'female', 'no_preference']
  },
  matchingTypePreference: {
    required: false,
    validValues: ['similar', 'complementary', 'no_preference']
  },
  bookCategories: {
    required: true,
    minItems: 1,
    maxItems: 7,
    allowedValues: [
      'literature_fiction',
      'mystery_detective',
      'sci_fi_fantasy',
      'history_biography',
      'social_science_philosophy',
      'psychology_self_help',
      'art_design_lifestyle'
    ]
  },
  detailedBookPreferences: {
    required: false,
    maxLength: 500
  },
  favoriteBooks: {
    required: true,
    minItems: 2,
    maxItems: 10,
    itemMaxLength: 100
  },
  readingCommitment: {
    required: true,
    validValues: ['light', 'medium', 'intensive', 'epic']
  }
})

// 验证增强表单数据
function validateEnhancedForm(formData) {
  const errors = []
  
  // 性别验证
  if (formData.gender && !VALIDATION_RULES.gender.validValues.includes(formData.gender)) {
    errors.push('请选择有效的性别选项')
  }
  
  // 书籍类别验证
  if (!formData.bookCategories || formData.bookCategories.length === 0) {
    errors.push('请至少选择一个书籍类别')
  }
  if (formData.bookCategories && formData.bookCategories.length > VALIDATION_RULES.bookCategories.maxItems) {
    errors.push('书籍类别选择不能超过7个')
  }
  
  // 详细偏好验证
  if (formData.detailedBookPreferences && formData.detailedBookPreferences.length > VALIDATION_RULES.detailedBookPreferences.maxLength) {
    errors.push('详细偏好描述不能超过500字符')
  }
  
  // 最爱书籍验证
  if (!formData.favoriteBooks || formData.favoriteBooks.length < VALIDATION_RULES.favoriteBooks.minItems) {
    errors.push('请至少输入2本最爱的书籍')
  }
  if (formData.favoriteBooks && formData.favoriteBooks.length > VALIDATION_RULES.favoriteBooks.maxItems) {
    errors.push('最爱书籍不能超过10本')
  }
  
  // 阅读承诺验证
  if (!formData.readingCommitment) {
    errors.push('请选择您的阅读承诺期望')
  }
  if (formData.readingCommitment && !VALIDATION_RULES.readingCommitment.validValues.includes(formData.readingCommitment)) {
    errors.push('请选择有效的阅读承诺选项')
  }
  
  return errors
}

export const useAuthStore = defineStore('auth', () => {
  // 状态
  const user = ref(null)
  const isAuthenticated = ref(false)
  const registrationStep = ref(1)
  const isSubmitting = ref(false)
  const error = ref(null)
  const role = ref(null)
  const permissions = ref([])
  const lastUserProfileBackup = ref(null)

  // 计算属性
  const isAdmin = computed(() => {
    return role.value === ROLES.SUPER_ADMIN ||
           role.value === ROLES.REGULAR_ADMIN ||
           role.value === ROLES.LEGACY_ADMIN
  })

  // 角色和权限定义
  const ROLES = {
    SUPER_ADMIN: 'super_admin',
    REGULAR_ADMIN: 'regular_admin',
    LEGACY_ADMIN: 'legacy_admin'
  }

  const PERMISSIONS = {
    USER_MANAGEMENT: 'user_management',
    SYSTEM_MONITORING: 'system_monitoring',
    API_MANAGEMENT: 'api_management',
    CACHE_MANAGEMENT: 'cache_management',
    MEMBER_MANAGEMENT: 'member_management',
    MATCHING_FUNCTIONS: 'matching_functions',
    DATA_REFRESH: 'data_refresh'
  }

  const ROLE_PERMISSIONS = {
    [ROLES.SUPER_ADMIN]: [
      PERMISSIONS.USER_MANAGEMENT,
      PERMISSIONS.SYSTEM_MONITORING,
      PERMISSIONS.API_MANAGEMENT,
      PERMISSIONS.CACHE_MANAGEMENT,
      PERMISSIONS.MEMBER_MANAGEMENT,
      PERMISSIONS.MATCHING_FUNCTIONS,
      PERMISSIONS.DATA_REFRESH
    ],
    [ROLES.REGULAR_ADMIN]: [
      PERMISSIONS.USER_MANAGEMENT,
      PERMISSIONS.MEMBER_MANAGEMENT,
      PERMISSIONS.MATCHING_FUNCTIONS,
      PERMISSIONS.DATA_REFRESH
    ],
    [ROLES.LEGACY_ADMIN]: [
      PERMISSIONS.USER_MANAGEMENT,
      PERMISSIONS.SYSTEM_MONITORING,
      PERMISSIONS.API_MANAGEMENT,
      PERMISSIONS.MEMBER_MANAGEMENT,
      PERMISSIONS.MATCHING_FUNCTIONS,
      PERMISSIONS.DATA_REFRESH
    ]
  }
  
  // 表单数据
  const formData = reactive({
    // 基本信息 (Step 1)
    name: '',
    studentId: '',
    gender: '',
    
    // 阅读偏好 (Step 2)
    bookCategories: [],
    detailedBookPreferences: '',
    favoriteBooks: [],
    
    // 阅读习惯 (Step 3)
    readingCommitment: '',
    readingHabits: {
      weeklyHours: '',
      preferredTimes: [],
      readingMethods: [],
      preferredLocations: []
    }
  })

  // 验证表单数据
  function validateForm(step) {
    const errors = []
    
    switch (step) {
      case 1:
        if (!formData.name) {
          errors.push('请输入姓名')
        } else if (formData.name.length < VALIDATION_RULES.name.minLength) {
          errors.push(`姓名至少需要 ${VALIDATION_RULES.name.minLength} 个字符`)
        }
        
        if (!formData.studentId) {
          errors.push('请输入学号')
        } else if (!VALIDATION_RULES.studentId.pattern.test(formData.studentId)) {
          errors.push('学号格式不正确')
        }
        break
        
      case 2:
        if (!formData.bookCategories.length) {
          errors.push('请至少选择一个书籍类别')
        } else if (formData.bookCategories.length > VALIDATION_RULES.bookCategories.maxItems) {
          errors.push(`书籍类别不能超过 ${VALIDATION_RULES.bookCategories.maxItems} 个`)
        }
        
        if (!formData.favoriteBooks.length) {
          errors.push('请至少添加两本最爱的书籍')
        } else if (formData.favoriteBooks.length < VALIDATION_RULES.favoriteBooks.minItems) {
          errors.push(`请至少添加 ${VALIDATION_RULES.favoriteBooks.minItems} 本最爱的书籍`)
        }
        break
        
      case 3:
        if (!formData.readingCommitment) {
          errors.push('请选择阅读承诺')
        } else if (!VALIDATION_RULES.readingCommitment.validValues.includes(formData.readingCommitment)) {
          errors.push('请选择有效的阅读承诺选项')
        }
        break
    }
    
    return errors
  }

  // 设置用户
  function setUser(userData, userRole = null, userPermissions = []) {
    user.value = userData
    isAuthenticated.value = true
    role.value = userRole
    permissions.value = userPermissions

    // 保存到会话存储
    sessionStorage.setItem('currentUser', JSON.stringify(userData))
    sessionStorage.setItem('isAdmin', userRole ? 'true' : 'false')
    if (userRole) {
      sessionStorage.setItem('adminRole', userRole)
      sessionStorage.setItem('adminPermissions', JSON.stringify(userPermissions))
      sessionStorage.setItem('adminLoginTime', Date.now().toString())
    }
  }

  // 清除用户
  function clearUser() {
    user.value = null
    isAuthenticated.value = false
    registrationStep.value = 1
    error.value = null
    role.value = null
    permissions.value = []

    // 清除会话存储
    sessionStorage.removeItem('currentUser')
    sessionStorage.removeItem('isAdmin')
    sessionStorage.removeItem('adminRole')
    sessionStorage.removeItem('adminPermissions')
    sessionStorage.removeItem('adminLoginTime')

    // 清除新手引导相关的 localStorage
    const { CURRENT_STEP, COMPLETED } = useOnboarding().getStorageKeys()
    localStorage.removeItem(CURRENT_STEP)
    localStorage.removeItem(COMPLETED)
    Object.keys(formData).forEach(key => {
      if (typeof formData[key] === 'object') {
        Object.keys(formData[key]).forEach(subKey => {
          formData[key][subKey] = Array.isArray(formData[key][subKey]) ? [] : ''
        })
      } else {
        formData[key] = Array.isArray(formData[key]) ? [] : ''
      }
    })
  }

  // 下一步
  function nextStep() {
    const errors = validateForm(registrationStep.value)
    if (errors.length > 0) {
      error.value = errors[0]
      return false
    }
    
    if (registrationStep.value < 3) {
      registrationStep.value++
      error.value = null
      return true
    }
    return false
  }

  // 上一步
  function previousStep() {
    if (registrationStep.value > 1) {
      registrationStep.value--
      error.value = null
      return true
    }
    return false
  }

  // 注册
  async function register() {
    const errors = validateForm(registrationStep.value)
    if (errors.length > 0) {
      error.value = errors[0]
      return false
    }

    if (!GIST_ID || !GITHUB_TOKEN) {
      error.value = '系统配置错误，请联系管理员'
      return false
    }

    isSubmitting.value = true
    error.value = null

    try {
      // 1. 加载现有成员数据
      const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
        headers: GITHUB_TOKEN ? { 'Authorization': `token ${GITHUB_TOKEN}` } : {}
      })
      
      if (!response.ok) {
        throw new Error('加载数据失败')
      }
      
      const gist = await response.json()
      const content = gist.files[GIST_FILENAME]?.content
      const members = content ? JSON.parse(content) : []

      // 2. 检查用户是否已存在
      const userExists = members.some(m =>
        m.name === formData.name || m.studentId === formData.studentId
      )
      
      if (userExists) {
        error.value = '该姓名或学号已被注册'
        return false
      }

      // 3. 创建新用户数据
      const newUser = {
        id: Date.now().toString(),
        name: formData.name,
        studentId: formData.studentId,
        status: 'pending',
        joinDate: new Date().toLocaleDateString('zh-CN'),
        questionnaire: {
          version: '2.0',
          completedAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
          gender: formData.gender,
          bookCategories: formData.bookCategories,
          detailedBookPreferences: formData.detailedBookPreferences,
          favoriteBooks: formData.favoriteBooks,
          readingCommitment: formData.readingCommitment,
          readingHabits: formData.readingHabits
        }
      }

      // 4. 保存到 Gist
      const saveResponse = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          files: {
            [GIST_FILENAME]: {
              content: JSON.stringify([...members, newUser], null, 2)
            }
          }
        })
      })

      if (!saveResponse.ok) {
        throw new Error('保存数据失败')
      }

      // 5. 更新本地状态
      setUser(newUser)
      return true

    } catch (err) {
      console.error('Registration failed:', err)
      error.value = err.message || '注册失败，请重试'
      return false
    } finally {
      isSubmitting.value = false
    }
  }

  // 检查权限
  function hasPermission(requiredPermission) {
    return permissions.value.includes(requiredPermission)
  }

  // 登录
  async function login({ name, studentId, password }) {
    isSubmitting.value = true
    error.value = null

    try {
      // 1. 优先处理超级管理员登录
      if (password === import.meta.env.VITE_SUPER_ADMIN_PASSWORD) {
        setUser(
          { name: 'Super Admin', role: ROLES.SUPER_ADMIN },
          ROLES.SUPER_ADMIN,
          ROLE_PERMISSIONS[ROLES.SUPER_ADMIN]
        )
        return true
      }

      // 2. 处理普通管理员登录
      if (password) {
        let authResult = null
        if (password === import.meta.env.VITE_REGULAR_ADMIN_PASSWORD) {
          authResult = {
            role: ROLES.REGULAR_ADMIN,
            permissions: ROLE_PERMISSIONS[ROLES.REGULAR_ADMIN]
          }
        } else if (password === import.meta.env.VITE_ADMIN_PASSWORD) {
          authResult = {
            role: ROLES.LEGACY_ADMIN,
            permissions: ROLE_PERMISSIONS[ROLES.LEGACY_ADMIN]
          }
        }

        if (authResult) {
          setUser(
            { name: 'Admin', role: authResult.role },
            authResult.role,
            authResult.permissions
          )
          return true
        }

        error.value = '管理员密码错误'
        return false
      }

      // 3. 处理普通用户登录
      if (!name || !studentId) {
        error.value = '请输入姓名和学号'
        return false
      }

      // 加载成员数据
      const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
        headers: GITHUB_TOKEN ? { 'Authorization': `token ${GITHUB_TOKEN}` } : {}
      })

      if (!response.ok) {
        throw new Error('加载数据失败')
      }

      const gist = await response.json()
      const content = gist.files[GIST_FILENAME]?.content
      const members = content ? JSON.parse(content) : []

      // 查找用户
      const foundUser = members.find(m => m.name === name && m.studentId === studentId)

      if (foundUser) {
        if (foundUser.status === 'approved') {
          setUser(foundUser)
          return true
        } else {
          error.value = '您的账号正在审核中，请耐心等待管理员审核'
          return false
        }
      } else {
        error.value = '姓名或学号不正确，请检查或先注册'
        return false
      }

    } catch (err) {
      console.error('Login failed:', err)
      error.value = err.message || '登录失败，请重试'
      return false
    } finally {
      isSubmitting.value = false
    }
  }

  // 更新用户资料
  async function updateUserProfile(profileData) {
    if (!user.value) {
      error.value = '请先登录'
      return false
    }

    isSubmitting.value = true
    error.value = null

    try {
      // 验证表单数据
      const errors = validateEnhancedForm(profileData)
      if (errors.length > 0) {
        error.value = errors[0]
        return false
      }

      // 加载现有成员数据
      const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
        headers: GITHUB_TOKEN ? { 'Authorization': `token ${GITHUB_TOKEN}` } : {}
      })

      if (!response.ok) {
        throw new Error('加载数据失败')
      }

      const gist = await response.json()
      const content = gist.files[GIST_FILENAME]?.content
      const members = content ? JSON.parse(content) : []

      // 查找并更新用户数据
      const userIndex = members.findIndex(m => m.id === user.value.id)
      if (userIndex === -1) {
        throw new Error('用户数据不存在')
      }

      // 备份当前用户数据
      lastUserProfileBackup.value = JSON.parse(JSON.stringify(members[userIndex]))

      // 更新用户数据
      members[userIndex] = {
        ...members[userIndex],
        ...profileData,
        questionnaire: {
          ...members[userIndex].questionnaire,
          ...profileData,
          lastUpdated: new Date().toISOString(),
          version: '2.0'
        }
      }

      // 保存到 Gist
      const saveResponse = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          files: {
            [GIST_FILENAME]: {
              content: JSON.stringify(members, null, 2)
            }
          }
        })
      })

      if (!saveResponse.ok) {
        throw new Error('保存数据失败')
      }

      // 更新本地用户数据
      setUser(members[userIndex])
      
      // 缓存失效处理
      try {
        await invalidateUserCaches(user.value.id)
      } catch (cacheError) {
        console.warn('Cache invalidation failed:', cacheError)
        // 不影响主要功能，只记录警告
      }
      
      return true

    } catch (err) {
      console.error('Update profile failed:', err)
      error.value = err.message || '更新失败，请重试'
      return false
    } finally {
      isSubmitting.value = false
    }
  }

  // 撤销用户资料更新
  async function revertUserProfile() {
    if (!lastUserProfileBackup.value) {
      error.value = '没有可撤销的更改'
      return false
    }

    isSubmitting.value = true
    error.value = null

    try {
      // 加载现有成员数据
      const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
        headers: GITHUB_TOKEN ? { 'Authorization': `token ${GITHUB_TOKEN}` } : {}
      })

      if (!response.ok) {
        throw new Error('加载数据失败')
      }

      const gist = await response.json()
      const content = gist.files[GIST_FILENAME]?.content
      const members = content ? JSON.parse(content) : []

      // 查找并恢复用户数据
      const userIndex = members.findIndex(m => m.id === user.value.id)
      if (userIndex === -1) {
        throw new Error('用户数据不存在')
      }

      // 恢复备份的数据
      members[userIndex] = lastUserProfileBackup.value

      // 保存到 Gist
      const saveResponse = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          files: {
            [GIST_FILENAME]: {
              content: JSON.stringify(members, null, 2)
            }
          }
        })
      })

      if (!saveResponse.ok) {
        throw new Error('保存数据失败')
      }

      // 更新本地用户数据
      setUser(members[userIndex])
      
      // 清除备份
      lastUserProfileBackup.value = null

      // 缓存失效处理
      try {
        await invalidateUserCaches(user.value.id)
      } catch (cacheError) {
        console.warn('Cache invalidation failed:', cacheError)
      }

      return true

    } catch (err) {
      console.error('Revert profile failed:', err)
      error.value = err.message || '撤销失败，请重试'
      return false
    } finally {
      isSubmitting.value = false
    }
  }

  return {
    // 状态
    user,
    isAuthenticated,
    registrationStep,
    isSubmitting,
    error,
    formData,
    role,
    permissions,
    lastUserProfileBackup,
    
    // 常量
    ROLES,
    PERMISSIONS,
    
    // 方法
    setUser,
    clearUser,
    register,
    login,
    nextStep,
    previousStep,
    validateForm,
    hasPermission,
    updateUserProfile,
    revertUserProfile
  }
})
