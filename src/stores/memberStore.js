import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { loadMembers, saveMembers } from '../services/gistService'
import { useAdvancedCache } from '../composables/useAdvancedCache'

export const useMemberStore = defineStore('member', () => {
  // 状态
  const members = ref([])
  const isLoading = ref(false)
  const error = ref(null)
  const advancedCache = useAdvancedCache()

  // 计算属性
  const approvedMembers = computed(() => 
    members.value.filter(m => m.status === 'approved')
  )

  const pendingMembers = computed(() => 
    members.value.filter(m => m.status === 'pending')
  )

  // Actions
  /**
   * 加载所有成员数据
   */
  async function fetchMembers() {
    isLoading.value = true
    error.value = null
    
    try {
      members.value = await loadMembers()
    } catch (err) {
      console.error('加载成员数据失败:', err)
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 批准成员
   * @param {string} memberId - 成员ID
   */
  async function approveMember(memberId) {
    const memberIndex = members.value.findIndex(m => m.id === memberId)
    if (memberIndex === -1) {
      throw new Error('成员不存在')
    }

    try {
      // 更新状态
      members.value[memberIndex] = {
        ...members.value[memberIndex],
        status: 'approved'
      }

      // 保存到 Gist
      await saveMembers(members.value)

      // 使相关缓存失效
      await advancedCache.invalidateUserCaches(memberId)
    } catch (err) {
      console.error('批准成员失败:', err)
      // 回滚状态
      members.value[memberIndex].status = 'pending'
      throw err
    }
  }

  /**
   * 删除成员
   * @param {string} memberId - 成员ID
   */
  async function deleteMember(memberId) {
    const memberIndex = members.value.findIndex(m => m.id === memberId)
    if (memberIndex === -1) {
      throw new Error('成员不存在')
    }

    const deletedMember = members.value[memberIndex]
    
    try {
      // 从列表中移除
      members.value = members.value.filter(m => m.id !== memberId)
      
      // 保存到 Gist
      await saveMembers(members.value)
      
      // 使相关缓存失效
      await advancedCache.invalidateUserCaches(memberId)
    } catch (err) {
      console.error('删除成员失败:', err)
      // 回滚状态
      members.value.splice(memberIndex, 0, deletedMember)
      throw err
    }
  }

  /**
   * 更新成员信息
   * @param {Object} updatedMember - 更新后的成员数据
   */
  async function updateMember(updatedMember) {
    const memberIndex = members.value.findIndex(m => m.id === updatedMember.id)
    if (memberIndex === -1) {
      throw new Error('成员不存在')
    }

    const originalMember = { ...members.value[memberIndex] }
    
    try {
      // 更新成员数据
      members.value[memberIndex] = {
        ...originalMember,
        ...updatedMember,
        questionnaire: {
          ...originalMember.questionnaire,
          ...updatedMember.questionnaire,
          lastUpdated: new Date().toISOString()
        }
      }

      // 保存到 Gist
      await saveMembers(members.value)
      
      // 使相关缓存失效
      await advancedCache.invalidateUserCaches(updatedMember.id)
    } catch (err) {
      console.error('更新成员失败:', err)
      // 回滚状态
      members.value[memberIndex] = originalMember
      throw err
    }
  }

  /**
   * 添加新成员
   * @param {Object} newMember - 新成员数据
   */
  async function addMember(newMember) {
    // 检查是否已存在
    const exists = members.value.some(m => 
      m.name === newMember.name || m.studentId === newMember.studentId
    )
    
    if (exists) {
      throw new Error('该姓名或学号已被注册')
    }

    try {
      // 添加到列表
      members.value.push(newMember)
      
      // 保存到 Gist
      await saveMembers(members.value)
    } catch (err) {
      console.error('添加成员失败:', err)
      // 回滚状态
      members.value = members.value.filter(m => m.id !== newMember.id)
      throw err
    }
  }

  /**
   * 根据ID查找成员
   * @param {string} memberId - 成员ID
   * @returns {Object|null} 成员数据或null
   */
  function getMemberById(memberId) {
    return members.value.find(m => m.id === memberId) || null
  }

  /**
   * 根据姓名和学号查找成员
   * @param {string} name - 姓名
   * @param {string} studentId - 学号
   * @returns {Object|null} 成员数据或null
   */
  function findMember(name, studentId) {
    return members.value.find(m => 
      m.name === name && m.studentId === studentId
    ) || null
  }

  return {
    // 状态
    members,
    isLoading,
    error,
    
    // 计算属性
    approvedMembers,
    pendingMembers,
    
    // Actions
    fetchMembers,
    approveMember,
    deleteMember,
    updateMember,
    addMember,
    getMemberById,
    findMember
  }
})