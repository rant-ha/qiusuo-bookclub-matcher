import { ref } from 'vue'
import { useErrorStore } from '../stores/errorStore'

const errorStore = useErrorStore()

// GitHub Gist 配置
const GIST_ID = import.meta.env.VITE_GIST_ID
const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN
const GIST_FILENAME = 'bookclub_members.json'

/**
 * 数据迁移：将老用户数据升级到新版本
 * @param {Object} user - 用户数据对象
 * @returns {Object} 迁移后的用户数据
 */
function migrateUserData(user) {
  if (!user.questionnaire || user.questionnaire.version !== '2.0') {
    return {
      ...user,
      // 确保所有现有字段都被保留
      studentId: user.studentId || 'N/A',
      status: user.status || 'approved',
      
      questionnaire: {
        version: '2.0',
        completedAt: user.questionnaire?.completedAt || '',
        lastUpdated: new Date().toISOString(),
        
        // 将旧用户的数据迁移到questionnaire对象内
        hobbies: user.hobbies || [],
        books: user.books || [],
        
        // 新增字段，使用默认值
        gender: user.gender || '',
        matchGenderPreference: user.matchGenderPreference || '',
        matchingTypePreference: user.matchingTypePreference || '',
        bookCategories: user.bookCategories || [],
        detailedBookPreferences: user.detailedBookPreferences || '',
        favoriteBooks: user.favoriteBooks || (user.books ? [...user.books] : []), // 将旧书籍数据迁移到最爱书籍
        readingCommitment: user.readingCommitment || '',
        readingHabits: user.readingHabits || {
          weeklyHours: '',
          preferredTimes: [],
          readingMethods: [],
          preferredLocations: []
        }
      }
    }
  }
  return user
}

/**
 * 从 Gist 加载成员数据
 * @returns {Promise<Array>} 成员列表
 */
export async function loadMembers() {
  if (!GIST_ID) {
    console.warn("GIST_ID is not configured.")
    return []
  }

  // 对于公开Gist，不需要Token
  const headers = GITHUB_TOKEN ? { 'Authorization': `token ${GITHUB_TOKEN}` } : {}
  
  try {
    const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, { headers })
    if (!response.ok) {
      const errorText = response.statusText
      errorStore.logError(
        response.status === 429 ? errorStore.ERROR_TYPES.RATE_LIMIT : errorStore.ERROR_TYPES.API_UNAVAILABLE,
        {
          endpoint: 'loadMembers',
          status: response.status,
          error: errorText
        }
      )
      throw new Error(`加载数据失败: ${errorText}`)
    }
    
    const gist = await response.json()
    const content = gist.files[GIST_FILENAME]?.content
    
    if (content) {
      let needsSave = false
      let members = JSON.parse(content)
      
      // 数据迁移：为老数据添加新字段并保持向下兼容
      members = members.map(member => {
        const needsMigration = typeof member.status === 'undefined' || 
                             !member.questionnaire || 
                             member.questionnaire.version !== '2.0'
        
        if (needsMigration) {
          needsSave = true
          return migrateUserData(member)
        }
        return member
      })
      
      // 如果进行了数据迁移，则自动保存回Gist
      if (needsSave) {
        console.log('检测到旧版本数据，已自动执行数据迁移并保存。')
        await saveMembers(members)
      }
      
      return members
    }
    
    return []
  } catch (error) {
    errorStore.logError(errorStore.ERROR_TYPES.NETWORK_ERROR, {
      endpoint: 'loadMembers',
      error: error.message
    })
    throw new Error('加载数据失败，请联系管理员检查配置。')
  }
}

/**
 * 保存成员数据到 Gist
 * @param {Array} members - 成员列表
 * @returns {Promise<void>}
 */
export async function saveMembers(members) {
  if (!GITHUB_TOKEN || !GIST_ID) {
    throw new Error('请先完成配置')
  }
  
  try {
    const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
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
    
    if (!response.ok) {
      const errorText = await response.text()
      errorStore.logError(
        response.status === 429 ? errorStore.ERROR_TYPES.RATE_LIMIT : errorStore.ERROR_TYPES.API_UNAVAILABLE,
        {
          endpoint: 'saveMembers',
          status: response.status,
          error: errorText
        }
      )
      throw new Error('保存失败')
    }
  } catch (error) {
    errorStore.logError(errorStore.ERROR_TYPES.NETWORK_ERROR, {
      endpoint: 'saveMembers',
      error: error.message
    })
    throw new Error('保存数据失败：' + error.message)
  }
}

// 导出数据迁移函数供其他模块使用
export { migrateUserData }