// 认证和权限管理模块
// 处理用户登录、登出、角色验证和权限检查

import { CONFIG, ROLES, ROLE_PERMISSIONS } from './config.js';
import { store } from './state.js';
import { Logger, migrateUserData } from './utils.js';
import { loadMembers } from './api.js';

/**
 * 处理用户登录
 */
export async function handleLogin(name, studentId, password = '') {
    try {
        Logger.info('尝试登录', { name, studentId, hasPassword: !!password });
        
        // 输入验证
        if (!name || !studentId) {
            throw new Error('姓名和学号不能为空');
        }

        // 清理输入
        const cleanName = name.trim();
        const cleanStudentId = studentId.trim();

        // 检查是否为管理员登录
        if (password) {
            const adminResult = await handleAdminLogin(cleanName, cleanStudentId, password);
            if (adminResult.success) {
                return adminResult;
            }
            // 如果管理员登录失败，继续尝试普通用户登录
        }

        // 普通用户登录
        return await handleUserLogin(cleanName, cleanStudentId);
        
    } catch (error) {
        Logger.error('登录失败', error);
        return {
            success: false,
            message: error.message || '登录失败，请重试'
        };
    }
}

/**
 * 处理管理员登录
 */
async function handleAdminLogin(name, studentId, password) {
    // 验证管理员密码
    let adminRole = null;
    let adminPermissions = [];

    if (password === CONFIG.SUPER_ADMIN_PASSWORD) {
        adminRole = ROLES.SUPER_ADMIN;
        adminPermissions = ROLE_PERMISSIONS[ROLES.SUPER_ADMIN];
    } else if (password === CONFIG.REGULAR_ADMIN_PASSWORD) {
        adminRole = ROLES.REGULAR_ADMIN;
        adminPermissions = ROLE_PERMISSIONS[ROLES.REGULAR_ADMIN];
    } else if (password === CONFIG.ADMIN_PASSWORD) {
        adminRole = ROLES.LEGACY_ADMIN;
        adminPermissions = ROLE_PERMISSIONS[ROLES.LEGACY_ADMIN];
    }

    if (!adminRole) {
        Logger.warn('管理员密码验证失败', { name, studentId });
        return {
            success: false,
            message: '管理员密码错误'
        };
    }

    // 设置管理员状态
    const adminUser = {
        name,
        studentId,
        role: adminRole,
        permissions: adminPermissions,
        loginTime: new Date().toISOString(),
        isAdmin: true
    };

    // 更新状态
    store.setCurrentUser(adminUser);
    store.setAdminStatus(true, adminRole, adminPermissions);

    Logger.info('管理员登录成功', { 
        name, 
        studentId, 
        role: adminRole,
        permissions: adminPermissions.length 
    });

    return {
        success: true,
        message: '管理员登录成功',
        user: adminUser,
        isAdmin: true,
        role: adminRole,
        permissions: adminPermissions
    };
}

/**
 * 处理普通用户登录
 */
async function handleUserLogin(name, studentId) {
    try {
        // 加载成员数据
        const members = await loadMembers();
        store.setMembers(members);

        // 查找用户
        const user = members.find(member => 
            member.name === name && member.studentId === studentId
        );

        if (!user) {
            Logger.warn('用户不存在', { name, studentId });
            return {
                success: false,
                message: '用户不存在，请检查姓名和学号是否正确'
            };
        }

        // 检查用户状态
        if (user.status === 'pending') {
            Logger.info('用户待审核', { name, studentId });
            return {
                success: false,
                message: '您的申请正在审核中，请耐心等待'
            };
        }

        if (user.status === 'rejected') {
            Logger.info('用户被拒绝', { name, studentId });
            return {
                success: false,
                message: '很抱歉，您的申请未通过审核'
            };
        }

        // 数据迁移
        const migratedUser = migrateUserData(user);
        
        // 设置用户状态
        store.setCurrentUser(migratedUser);
        store.setAdminStatus(false, null, []);

        Logger.info('用户登录成功', { name, studentId, status: user.status });

        return {
            success: true,
            message: '登录成功',
            user: migratedUser,
            isAdmin: false
        };
        
    } catch (error) {
        Logger.error('普通用户登录失败', error);
        throw new Error('登录过程中发生错误，请重试');
    }
}

/**
 * 用户登出
 */
export function logout() {
    try {
        const currentUser = store.getCurrentUser();
        const isAdmin = store.getIsAdmin();
        
        Logger.info('用户登出', { 
            user: currentUser?.name, 
            isAdmin 
        });

        // 清除状态
        store.clearSession();
        
        return {
            success: true,
            message: '已成功登出'
        };
        
    } catch (error) {
        Logger.error('登出失败', error);
        return {
            success: false,
            message: '登出过程中发生错误'
        };
    }
}

/**
 * 管理员专用登出
 */
export function adminLogout() {
    try {
        const currentRole = store.getCurrentAdminRole();
        Logger.info('管理员登出', { role: currentRole });
        
        // 清除状态
        store.clearSession();
        
        return {
            success: true,
            message: '管理员已成功登出'
        };
        
    } catch (error) {
        Logger.error('管理员登出失败', error);
        return {
            success: false,
            message: '登出过程中发生错误'
        };
    }
}

/**
 * 检查角色权限
 */
export function checkRolePermission(role, requiredPermission) {
    if (!role) return false;
    
    const permissions = ROLE_PERMISSIONS[role] || [];
    return permissions.includes(requiredPermission);
}

/**
 * 检查当前用户权限（异步，从状态获取）
 */
export function hasPermission(requiredPermission) {
    const isAdmin = store.getIsAdmin();
    const currentRole = store.getCurrentAdminRole();
    const currentPermissions = store.getCurrentAdminPermissions();
    
    if (!isAdmin || !currentRole) {
        return false;
    }
    
    return currentPermissions.includes(requiredPermission);
}

/**
 * 检查当前用户权限（同步版本，用于UI渲染）
 */
export function hasPermissionSync(requiredPermission) {
    return hasPermission(requiredPermission);
}

/**
 * 获取当前用户信息
 */
export function getCurrentUserInfo() {
    const currentUser = store.getCurrentUser();
    const isAdmin = store.getIsAdmin();
    const adminRole = store.getCurrentAdminRole();
    const adminPermissions = store.getCurrentAdminPermissions();
    
    return {
        user: currentUser,
        isAdmin,
        role: adminRole,
        permissions: adminPermissions,
        isLoggedIn: !!currentUser
    };
}

/**
 * 验证会话有效性
 */
export function validateSession() {
    try {
        const currentUser = store.getCurrentUser();
        const isAdmin = store.getIsAdmin();
        
        if (!currentUser) {
            return {
                valid: false,
                reason: 'no_user'
            };
        }
        
        // 对于管理员，验证角色信息
        if (isAdmin) {
            const adminRole = store.getCurrentAdminRole();
            const adminPermissions = store.getCurrentAdminPermissions();
            
            if (!adminRole || !adminPermissions) {
                Logger.warn('管理员会话信息不完整');
                return {
                    valid: false,
                    reason: 'invalid_admin_session'
                };
            }
        }
        
        return {
            valid: true,
            user: currentUser,
            isAdmin,
            role: store.getCurrentAdminRole()
        };
        
    } catch (error) {
        Logger.error('会话验证失败', error);
        return {
            valid: false,
            reason: 'validation_error'
        };
    }
}

/**
 * 刷新用户数据（重新从服务器加载）
 */
export async function refreshUserData() {
    try {
        const currentUser = store.getCurrentUser();
        if (!currentUser || store.getIsAdmin()) {
            // 管理员或未登录用户不需要刷新
            return { success: true };
        }
        
        const members = await loadMembers();
        store.setMembers(members);
        
        // 重新查找当前用户
        const updatedUser = members.find(member => 
            member.name === currentUser.name && 
            member.studentId === currentUser.studentId
        );
        
        if (!updatedUser) {
            Logger.warn('用户数据刷新后未找到用户，可能被删除');
            store.clearSession();
            return {
                success: false,
                message: '用户账户不存在，请重新登录'
            };
        }
        
        // 更新用户数据
        const migratedUser = migrateUserData(updatedUser);
        store.setCurrentUser(migratedUser);
        
        Logger.info('用户数据刷新成功');
        return {
            success: true,
            user: migratedUser
        };
        
    } catch (error) {
        Logger.error('用户数据刷新失败', error);
        return {
            success: false,
            message: '数据刷新失败，请稍后重试'
        };
    }
}

/**
 * 权限检查中间件（用于UI组件）
 */
export function requirePermission(requiredPermission, callback) {
    return function(...args) {
        if (!hasPermission(requiredPermission)) {
            Logger.warn('权限不足', { 
                required: requiredPermission,
                current: store.getCurrentAdminPermissions()
            });
            alert('您没有执行此操作的权限');
            return;
        }
        
        return callback.apply(this, args);
    };
}

/**
 * 管理员身份检查中间件
 */
export function requireAdmin(callback) {
    return function(...args) {
        if (!store.getIsAdmin()) {
            Logger.warn('非管理员尝试执行管理员操作');
            alert('此操作需要管理员权限');
            return;
        }
        
        return callback.apply(this, args);
    };
}