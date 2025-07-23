// 通用工具函数模块
// 包含日志、数据迁移、验证等与业务无关的纯函数

// === 日志系统 ===
export const Logger = {
    info(message, ...args) {
        console.log(`[INFO] ${new Date().toISOString()}: ${message}`, ...args);
    },
    
    warn(message, ...args) {
        console.warn(`[WARN] ${new Date().toISOString()}: ${message}`, ...args);
    },
    
    error(message, ...args) {
        console.error(`[ERROR] ${new Date().toISOString()}: ${message}`, ...args);
    },
    
    debug(message, ...args) {
        if (import.meta.env.DEV) {
            console.debug(`[DEBUG] ${new Date().toISOString()}: ${message}`, ...args);
        }
    },
    
    // 记录审计日志
    audit(action, details, userId = null) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            action,
            details,
            userId,
            userAgent: navigator.userAgent
        };
        
        console.log(`[AUDIT] ${logEntry.timestamp}: ${action}`, details);
        return logEntry;
    }
};

// === 数据迁移函数 ===
export function migrateUserData(user) {
    if (!user) return null;
    
    try {
        // 确保用户对象有基本结构
        const migratedUser = {
            name: user.name || '',
            studentId: user.studentId || '',
            status: user.status || 'pending',
            joinDate: user.joinDate || new Date().toISOString(),
            questionnaire: user.questionnaire || {},
            ...user // 保留其他现有字段
        };

        // 迁移问卷数据结构
        if (migratedUser.questionnaire) {
            migratedUser.questionnaire = {
                basicInfo: migratedUser.questionnaire.basicInfo || {},
                readingPreferences: migratedUser.questionnaire.readingPreferences || {},
                interests: migratedUser.questionnaire.interests || {},
                personality: migratedUser.questionnaire.personality || {},
                expectations: migratedUser.questionnaire.expectations || {},
                ...migratedUser.questionnaire
            };
        }

        Logger.debug('用户数据迁移完成', { 
            original: user, 
            migrated: migratedUser 
        });
        
        return migratedUser;
    } catch (error) {
        Logger.error('用户数据迁移失败', error);
        return user; // 返回原始数据作为后备
    }
}

// === 表单验证函数 ===
export function validateEnhancedForm(formData) {
    const errors = [];
    
    // 基本信息验证
    if (!formData.name || formData.name.trim().length < 2) {
        errors.push('姓名至少需要2个字符');
    }
    
    if (!formData.studentId || !/^\d{8,12}$/.test(formData.studentId)) {
        errors.push('学号格式不正确（应为8-12位数字）');
    }
    
    // 邮箱验证
    if (formData.email && !isValidEmail(formData.email)) {
        errors.push('邮箱格式不正确');
    }
    
    // 书籍类别验证（新增）
    if (formData.bookCategories) {
        if (formData.bookCategories.length === 0) {
            errors.push('请至少选择一个感兴趣的书籍类别');
        } else if (formData.bookCategories.length > 7) {
            errors.push('最多只能选择7个书籍类别');
        }
    }
    
    // 最喜欢的书籍验证（新增）
    if (formData.favoriteBooks) {
        if (formData.favoriteBooks.length < 2) {
            errors.push('请至少填写2本最喜欢的书籍');
        } else if (formData.favoriteBooks.length > 10) {
            errors.push('最多只能填写10本最喜欢的书籍');
        }
        
        // 检查每本书的长度
        formData.favoriteBooks.forEach((book, index) => {
            if (book.length > 100) {
                errors.push(`第${index + 1}本书的书名不能超过100字符`);
            }
        });
    }
    
    // 阅读投入程度验证（新增）
    if (formData.readingCommitment && !['light', 'medium', 'intensive', 'epic'].includes(formData.readingCommitment)) {
        errors.push('请选择有效的阅读投入程度');
    }
    
    // 性别验证（新增）
    if (formData.gender && !['male', 'female', 'other', 'prefer_not_to_say'].includes(formData.gender)) {
        errors.push('请选择有效的性别选项');
    }
    
    // 个人简介长度验证（新增）
    if (formData.personalBio && formData.personalBio.length > 300) {
        errors.push('个人简介不能超过300字');
    }
    
    // 详细偏好长度验证（新增）
    if (formData.detailedBookPreferences && formData.detailedBookPreferences.length > 500) {
        errors.push('详细阅读偏好不能超过500字');
    }
    
    // 必填字段验证
    const requiredFields = ['grade', 'major', 'readingFrequency'];
    requiredFields.forEach(field => {
        if (formData[field] && !formData[field].trim()) {
            errors.push(`${getFieldDisplayName(field)}为必填项`);
        }
    });
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

// 邮箱格式验证
export function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// 获取字段显示名称
function getFieldDisplayName(fieldName) {
    const fieldNames = {
        grade: '年级',
        major: '专业',
        readingFrequency: '阅读频率',
        contact: '联系方式'
    };
    return fieldNames[fieldName] || fieldName;
}

// === 数据处理函数 ===
export function sanitizeText(text) {
    if (typeof text !== 'string') return '';
    
    return text
        .trim()
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}

// 深度克隆对象
export function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => deepClone(item));
    if (typeof obj === 'object') {
        const clonedObj = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                clonedObj[key] = deepClone(obj[key]);
            }
        }
        return clonedObj;
    }
}

// === 时间处理函数 ===
export function formatDate(dateString) {
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch (error) {
        Logger.warn('日期格式化失败', error);
        return dateString;
    }
}

export function getTimeAgo(dateString) {
    try {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return '今天';
        if (diffDays === 1) return '昨天';
        if (diffDays < 7) return `${diffDays}天前`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)}周前`;
        if (diffDays < 365) return `${Math.floor(diffDays / 30)}个月前`;
        return `${Math.floor(diffDays / 365)}年前`;
    } catch (error) {
        Logger.warn('时间计算失败', error);
        return '未知时间';
    }
}

// === 数组处理函数 ===
export function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

export function removeDuplicates(array, keyFn = item => item) {
    const seen = new Set();
    return array.filter(item => {
        const key = keyFn(item);
        if (seen.has(key)) {
            return false;
        }
        seen.add(key);
        return true;
    });
}

// === 错误处理函数 ===
export function handleAsyncError(error, context = '') {
    Logger.error(`异步操作失败 ${context}:`, error);
    
    // 根据错误类型返回用户友好的消息
    if (error.name === 'NetworkError' || error.message.includes('fetch')) {
        return '网络连接异常，请检查网络后重试';
    }
    
    if (error.status === 401) {
        return '认证失败，请重新登录';
    }
    
    if (error.status === 403) {
        return '权限不足，无法执行此操作';
    }
    
    if (error.status >= 500) {
        return '服务器暂时不可用，请稍后重试';
    }
    
    return error.message || '操作失败，请重试';
}

// === 性能监控函数 ===
export function measurePerformance(name, fn) {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    
    Logger.debug(`性能测量 [${name}]: ${(end - start).toFixed(2)}ms`);
    
    return result;
}

// 异步版本
export async function measureAsyncPerformance(name, fn) {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    
    Logger.debug(`异步性能测量 [${name}]: ${(end - start).toFixed(2)}ms`);
    
    return result;
}