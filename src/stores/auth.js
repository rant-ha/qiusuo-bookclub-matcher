import { defineStore } from 'pinia'
import { ref, reactive, computed } from 'vue'
import { useOnboarding } from '../composables/useOnboarding'
import { useMemberStore } from './memberStore'

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

    isSubmitting.value = true
    error.value = null

    try {
      const memberStore = useMemberStore()
      await memberStore.fetchMembers()

      // 检查用户是否已存在
      const existingUser = memberStore.findMember(formData.name, formData.studentId)
      if (existingUser) {
        error.value = '该姓名或学号已被注册'
        return false
      }

      // 创建新用户数据
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

      // 使用 memberStore 添加新用户
      await memberStore.addMember(newUser)

      // 更新本地状态
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
      // 1. 如果提供了密码，优先处理管理员登录
      if (password) {
        // 1.1 检查超级管理员密码
        if (password === import.meta.env.VITE_SUPER_ADMIN_PASSWORD) {
          setUser(
            { name: 'Super Admin', role: ROLES.SUPER_ADMIN },
            ROLES.SUPER_ADMIN,
            ROLE_PERMISSIONS[ROLES.SUPER_ADMIN]
          )
          return true
        }

        // 1.2 检查普通管理员密码
        if (password === import.meta.env.VITE_REGULAR_ADMIN_PASSWORD) {
          setUser(
            { name: 'Admin', role: ROLES.REGULAR_ADMIN },
            ROLES.REGULAR_ADMIN,
            ROLE_PERMISSIONS[ROLES.REGULAR_ADMIN]
          )
          return true
        }

        // 1.3 检查旧版管理员密码
        if (password === import.meta.env.VITE_ADMIN_PASSWORD) {
          setUser(
            { name: 'Admin', role: ROLES.LEGACY_ADMIN },
            ROLES.LEGACY_ADMIN,
            ROLE_PERMISSIONS[ROLES.LEGACY_ADMIN]
          )
          return true
        }

        // 1.4 如果密码不匹配任何管理员密码，立即返回错误
        error.value = '管理员密码错误'
        return false
      }

      // 2. 处理普通用户登录
      // 2.1 验证必填字段
      if (!name || !studentId) {
        error.value = '请输入姓名和学号'
        return false
      }

      // 2.2 使用 memberStore 查找用户
      const memberStore = useMemberStore()
      await memberStore.fetchMembers()
      const foundUser = memberStore.findMember(name, studentId)

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

      const memberStore = useMemberStore()
      const currentUser = memberStore.getMemberById(user.value.id)
      
      if (!currentUser) {
        throw new Error('用户数据不存在')
      }

      // 备份当前用户数据
      lastUserProfileBackup.value = JSON.parse(JSON.stringify(currentUser))

      // 更新用户数据
      const updatedUser = {
        ...currentUser,
        ...profileData,
        questionnaire: {
          ...currentUser.questionnaire,
          ...profileData,
          lastUpdated: new Date().toISOString(),
          version: '2.0'
        }
      }

      // 使用 memberStore 更新数据
      await memberStore.updateMember(updatedUser)

      // 更新本地用户数据
      setUser(updatedUser)
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
      const memberStore = useMemberStore()
      
      // 使用 memberStore 恢复数据
      await memberStore.updateMember(lastUserProfileBackup.value)

      // 更新本地用户数据
      setUser(lastUserProfileBackup.value)
      
      // 清除备份
      lastUserProfileBackup.value = null

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
