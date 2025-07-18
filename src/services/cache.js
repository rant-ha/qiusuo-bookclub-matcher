/**
 * 缓存服务模块
 * 提供与 Netlify Function 缓存交互的核心功能
 */

/**
 * 设置 AI 分析结果到缓存
 * @param {Object} profile1 - 第一个用户的画像
 * @param {Object} profile2 - 第二个用户的画像
 * @param {Object} result - 分析结果
 * @returns {Promise<void>}
 */
export async function setAnalysisInCache(profile1, profile2, result) {
  const cacheKey = generateCacheKey(profile1, profile2);
  console.log(`[Cache] 生成缓存键: ${cacheKey}`);

  try {
    const authToken = sessionStorage.getItem('adminLoginTime') || '';
    console.log(`[Cache] 写入缓存 - Authorization Token 存在: ${Boolean(authToken)}`);

    const response = await fetch('/.netlify/functions/cache', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authToken
      },
      body: JSON.stringify({
        key: cacheKey,
        value: result
      })
    });

    console.log(`[Cache] 写入响应状态: ${response.status}`);
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Cache] 写入错误: ${errorText}`);
      throw new Error(`缓存写入失败: ${errorText}`);
    }
  } catch (error) {
    console.error('写入服务端缓存失败:', error);
    throw error;
  }
}

/**
 * 从缓存获取 AI 分析结果
 * @param {Object} profile1 - 第一个用户的画像
 * @param {Object} profile2 - 第二个用户的画像
 * @returns {Promise<Object|null>}
 */
export async function getAnalysisFromCache(profile1, profile2) {
  const key = generateCacheKey(profile1, profile2);
  
  try {
    console.log(`[Cache] 尝试获取缓存，键: ${key}`);
    const authToken = sessionStorage.getItem('adminLoginTime') || '';
    console.log(`[Cache] Authorization Token 存在: ${Boolean(authToken)}`);

    const response = await fetch(`/.netlify/functions/cache?key=${encodeURIComponent(key)}`, {
      method: 'GET',
      headers: {
        'Authorization': authToken
      }
    });

    console.log(`[Cache] 响应状态: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`[Cache] 获取到数据: ${Boolean(data)}, 数据大小: ${Object.keys(data || {}).length}`);
      if (data && Object.keys(data).length > 0) {
        return data;
      }
    } else {
      const errorText = await response.text();
      console.error(`[Cache] 响应错误: ${errorText}`);
    }
    
    return null;
  } catch (error) {
    console.error('从服务端获取缓存失败:', error);
    return null;
  }
}

/**
 * 使指定用户的所有相关缓存失效
 * @param {string} userId - 用户ID
 * @returns {Promise<void>}
 */
export async function invalidateUserCaches(userId) {
  try {
    console.log(`[Cache] 开始清理用户 ${userId} 的缓存...`);
    
    const response = await fetch('/.netlify/functions/cache', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': sessionStorage.getItem('adminLoginTime') || ''
      },
      body: JSON.stringify({ key: `user_${userId}` })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`清理缓存失败: ${errorText}`);
    }

    console.log(`[Cache] 用户 ${userId} 的缓存已清理`);
  } catch (error) {
    console.error('清理用户缓存失败:', error);
    throw error;
  }
}

/**
 * 生成缓存键
 * @private
 * @param {Object} profile1 - 第一个用户的画像
 * @param {Object} profile2 - 第二个用户的画像
 * @returns {string} 缓存键
 */
function generateCacheKey(profile1, profile2) {
  // 创建用户画像的核心组件
  const createKeyComponent = (profile) => {
    // 对数组进行排序，确保顺序一致性
    const sortedHobbies = [...(profile.interests?.hobbies || [])].sort();
    const sortedBookCategories = [...(profile.reading_preferences?.book_categories || [])].sort();
    const sortedFavoriteBooks = [...(profile.reading_preferences?.favorite_books || [])].sort();

    // 构建只包含核心信息的对象
    const coreProfile = {
      hobbies: sortedHobbies,
      reading: {
        categories: sortedBookCategories,
        favorites: sortedFavoriteBooks,
        commitment: profile.reading_preferences?.reading_commitment || ''
      },
      matching: profile.matching_preferences || {}
    };
    return JSON.stringify(coreProfile);
  };

  const content1 = createKeyComponent(profile1);
  const content2 = createKeyComponent(profile2);
  
  // 确保键的一致性
  const sortedContents = [content1, content2].sort();
  const finalKey = `ai_v2_${simpleHash(sortedContents.join('|'))}`;

  return finalKey;
}

/**
 * 简单的哈希函数
 * @private
 * @param {string} str - 要哈希的字符串
 * @returns {string} 哈希结果
 */
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 转为32位整数
  }
  return Math.abs(hash).toString(36);
}