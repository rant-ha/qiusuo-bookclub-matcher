// 中央状态管理系统 - 发布订阅模式
// 解决全局状态混乱和UI更新不及时的问题

// 私有状态对象，外部无法直接访问
let _state = {
    // 用户数据
    members: [],
    currentUser: null,
    
    // 管理员状态
    isAdmin: false,
    currentAdminRole: null,
    currentAdminPermissions: [],
    
    // 系统状态
    auditLogs: [],
    systemConfig: {},
    aiAnalysisEnabled: true,
    
    // UI 状态
    isLoading: false,
    currentView: 'login',
    errorMessage: null
};

// 订阅者列表 - 使用 WeakSet 防止内存泄漏
const subscribers = [];
const subscriberCleanupMap = new WeakMap();

// 状态管理 Store
export const store = {
    // 获取状态快照（只读）
    getState() {
        return { ..._state };
    },

    // === 用户状态管理 ===
    setMembers(members) {
        if (Array.isArray(members)) {
            _state.members = members;
            this.notify('members');
        }
    },

    setCurrentUser(user) {
        _state.currentUser = user;
        if (user) {
            sessionStorage.setItem('currentUser', JSON.stringify(user));
        } else {
            sessionStorage.removeItem('currentUser');
        }
        this.notify('currentUser');
    },

    // === 管理员状态管理 ===
    setAdminStatus(isAdmin, role = null, permissions = []) {
        _state.isAdmin = isAdmin;
        _state.currentAdminRole = role;
        _state.currentAdminPermissions = permissions;
        
        // 持久化到 sessionStorage
        sessionStorage.setItem('isAdmin', isAdmin.toString());
        if (role) sessionStorage.setItem('adminRole', role);
        if (permissions.length > 0) {
            sessionStorage.setItem('adminPermissions', JSON.stringify(permissions));
        }
        
        this.notify('admin');
    },

    // === 系统状态管理 ===
    setAuditLogs(logs) {
        if (Array.isArray(logs)) {
            _state.auditLogs = logs;
            this.notify('auditLogs');
        }
    },

    setSystemConfig(config) {
        _state.systemConfig = { ..._state.systemConfig, ...config };
        this.notify('systemConfig');
    },

    setAiAnalysisEnabled(enabled) {
        _state.aiAnalysisEnabled = Boolean(enabled);
        this.notify('aiAnalysis');
    },

    // === UI 状态管理 ===
    setLoading(isLoading) {
        _state.isLoading = Boolean(isLoading);
        this.notify('loading');
    },

    setCurrentView(view) {
        _state.currentView = view;
        this.notify('view');
    },

    setError(errorMessage) {
        _state.errorMessage = errorMessage;
        this.notify('error');
        
        // 自动清除错误消息（5秒后）
        if (errorMessage) {
            setTimeout(() => {
                _state.errorMessage = null;
                this.notify('error');
            }, 5000);
        }
    },

    // === 状态访问器（Getters）===
    getMembers() { return _state.members; },
    getCurrentUser() { return _state.currentUser; },
    getIsAdmin() { return _state.isAdmin; },
    getCurrentAdminRole() { return _state.currentAdminRole; },
    getCurrentAdminPermissions() { return _state.currentAdminPermissions; },
    getAuditLogs() { return _state.auditLogs; },
    getSystemConfig() { return _state.systemConfig; },
    isAiAnalysisEnabled() { return _state.aiAnalysisEnabled; },
    isLoading() { return _state.isLoading; },
    getCurrentView() { return _state.currentView; },
    getError() { return _state.errorMessage; },

    // === 订阅管理 ===
    subscribe(callback, filter = null) {
        const subscriber = { callback, filter, id: Symbol('subscriber') };
        subscribers.push(subscriber);
        
        // 设置清理函数
        const unsubscribe = () => {
            const index = subscribers.indexOf(subscriber);
            if (index > -1) {
                subscribers.splice(index, 1);
            }
        };
        
        // 存储清理函数，防止内存泄漏
        subscriberCleanupMap.set(subscriber, unsubscribe);
        
        return unsubscribe;
    },

    // 批量取消订阅（用于组件卸载）
    unsubscribeAll() {
        subscribers.length = 0;
        console.log('已清理所有订阅者');
    },

    // 通知所有订阅者
    notify(changeType = null) {
        // 使用副本避免在通知过程中修改原数组
        const currentSubscribers = [...subscribers];
        
        currentSubscribers.forEach(subscriber => {
            // 检查订阅者是否仍然有效
            if (!subscribers.includes(subscriber)) {
                return; // 订阅者已被移除，跳过
            }
            
            // 如果订阅者指定了过滤器，检查是否匹配
            if (!subscriber.filter || subscriber.filter === changeType) {
                try {
                    subscriber.callback(_state, changeType);
                } catch (error) {
                    console.error('订阅者回调执行错误:', error);
                    // 移除有问题的订阅者
                    const index = subscribers.indexOf(subscriber);
                    if (index > -1) {
                        subscribers.splice(index, 1);
                    }
                }
            }
        });
    },

    // === 会话恢复 ===
    restoreSession() {
        try {
            // 恢复用户状态
            const currentUser = sessionStorage.getItem('currentUser');
            if (currentUser) {
                _state.currentUser = JSON.parse(currentUser);
            }

            // 恢复管理员状态
            const isAdmin = sessionStorage.getItem('isAdmin') === 'true';
            const adminRole = sessionStorage.getItem('adminRole');
            const adminPermissions = sessionStorage.getItem('adminPermissions');
            
            if (isAdmin) {
                _state.isAdmin = true;
                _state.currentAdminRole = adminRole;
                _state.currentAdminPermissions = adminPermissions ? 
                    JSON.parse(adminPermissions) : [];
            }

            this.notify('session-restored');
        } catch (error) {
            console.error('会话恢复失败:', error);
            this.clearSession();
        }
    },

    // 清除会话
    clearSession() {
        _state.currentUser = null;
        _state.isAdmin = false;
        _state.currentAdminRole = null;
        _state.currentAdminPermissions = [];
        
        // 清除 sessionStorage
        ['currentUser', 'isAdmin', 'adminRole', 'adminPermissions'].forEach(key => {
            sessionStorage.removeItem(key);
        });
        
        this.notify('session-cleared');
    },

    // === 调试辅助 ===
    debug() {
        if (import.meta.env.DEV) {
            console.group('🔍 Store Debug Info');
            console.log('当前状态:', _state);
            console.log('订阅者数量:', subscribers.length);
            console.groupEnd();
        }
    }
};

// 开发模式下暴露到全局，便于调试
if (import.meta.env.DEV) {
    window.__store = store;
}