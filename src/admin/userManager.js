// src/admin/userManager.js

import { Logger } from '../utils.js';
import { store } from '../state.js';
import { hasPermission } from '../auth.js';
import { PERMISSIONS } from '../config.js';
import { saveMembers } from '../api.js';

/**
 * 用户管理系统
 * 提供批量操作、高级筛选和数据导出功能
 */
class UserManager {
    constructor() {
        Logger.info('用户管理系统初始化');
    }

    /**
     * 批量更新用户状态
     * @param {string[]} userIds - 要更新的用户ID数组
     * @param {string} status - 新的状态 ('approved', 'rejected', 'deleted')
     */
    async batchUpdateUserStatus(userIds, status) {
        if (!await hasPermission(PERMISSIONS.USER_MANAGEMENT)) {
            alert('权限不足');
            return { success: false, message: '权限不足' };
        }

        Logger.info(`批量更新 ${userIds.length} 个用户状态为 ${status}`);

        try {
            let members = store.getMembers();
            let updatedCount = 0;

            if (status === 'deleted') {
                members = members.filter(member => !userIds.includes(member.id));
                updatedCount = userIds.length;
            } else {
                members.forEach(member => {
                    if (userIds.includes(member.id)) {
                        member.status = status;
                        updatedCount++;
                    }
                });
            }

            // 更新Gist中的数据
            await saveMembers(members);
            
            // 更新本地store
            store.setMembers(members);

            Logger.info(`成功更新 ${updatedCount} 个用户`);
            return { success: true, count: updatedCount };

        } catch (error) {
            Logger.error('批量更新用户状态失败', error);
            return { success: false, message: error.message };
        }
    }

    /**
     * 根据条件筛选用户
     * @param {object} filters - 筛选条件 { status, name, studentId }
     * @returns {object[]} 筛选后的用户列表
     */
    filterUsers(filters = {}) {
        let members = store.getMembers();

        if (filters.status) {
            members = members.filter(m => m.status === filters.status);
        }
        if (filters.name) {
            const nameLower = filters.name.toLowerCase();
            members = members.filter(m => m.name.toLowerCase().includes(nameLower));
        }
        if (filters.studentId) {
            members = members.filter(m => m.studentId.includes(filters.studentId));
        }

        return members;
    }

    /**
     * 导出用户数据为CSV格式
     * @param {string[]} userIds - 要导出的用户ID数组
     */
    exportUsersToCSV(userIds) {
        if (!hasPermission(PERMISSIONS.USER_MANAGEMENT)) {
            alert('权限不足');
            return;
        }

        const usersToExport = store.getMembers().filter(m => userIds.includes(m.id));
        if (usersToExport.length === 0) {
            alert('没有可导出的用户');
            return;
        }

        const headers = ['ID', '姓名', '学号', '状态', '加入日期', '邮箱'];
        const rows = usersToExport.map(user => [
            user.id,
            user.name,
            user.studentId,
            user.status,
            user.joinDate,
            user.email || ''
        ].join(','));

        const csvContent = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', 'members_export.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        Logger.info(`导出了 ${usersToExport.length} 个用户的数据`);
    }
}

export const userManager = new UserManager();