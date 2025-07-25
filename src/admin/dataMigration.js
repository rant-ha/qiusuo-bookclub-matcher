// 数据迁移管理模块
// 确保老用户数据平滑过渡到新系统架构

import { Logger } from '../utils.js';
import { store } from '../state.js';
import { auditLogManager } from '../admin/auditLog.js';
import { loadMembers, saveMembers } from '../api.js';
import { DEFAULT_MATCHING_WEIGHTS } from '../config.js';

/**
 * 数据迁移管理器类
 */
class DataMigrationManager {
    constructor() {
        this.currentVersion = '2.0.0';
        this.compatibleVersions = ['1.0.0', '1.1.0', '1.2.0'];
        this.migrationInProgress = false;
        Logger.info('数据迁移管理器初始化');
    }

    /**
     * 检查是否需要数据迁移
     * @returns {Promise<Object>} 迁移检查结果
     */
    async checkMigrationNeeded() {
        try {
            Logger.info('检查数据迁移需求...');
            
            // 检查本地存储的版本信息
            const storedVersion = localStorage.getItem('appVersion');
            const migrationStatus = localStorage.getItem('migrationStatus');
            
            // 加载现有用户数据
            const members = await loadMembers();
            
            const migrationInfo = {
                needsMigration: false,
                fromVersion: storedVersion || '1.0.0',
                toVersion: this.currentVersion,
                membersCount: members ? members.length : 0,
                migrationStatus: migrationStatus || 'not_started',
                dataIssues: [],
                compatibilityIssues: []
            };

            // 检查版本兼容性
            if (!storedVersion || storedVersion !== this.currentVersion) {
                migrationInfo.needsMigration = true;
                
                // 检查是否为不兼容的版本跳跃
                if (storedVersion && !this.compatibleVersions.includes(storedVersion)) {
                    migrationInfo.compatibilityIssues.push({
                        type: 'version_jump',
                        message: `版本跳跃过大：从 ${storedVersion} 到 ${this.currentVersion}`
                    });
                }
            }

            // 检查数据结构问题
            if (members && members.length > 0) {
                const dataIssues = await this.analyzeDataStructure(members);
                migrationInfo.dataIssues = dataIssues;
                
                if (dataIssues.length > 0) {
                    migrationInfo.needsMigration = true;
                }
            }

            Logger.info('迁移检查完成', migrationInfo);
            return migrationInfo;

        } catch (error) {
            Logger.error('检查数据迁移需求失败', error);
            throw new Error(`迁移检查失败: ${error.message}`);
        }
    }

    /**
     * 分析数据结构问题
     * @param {Array} members - 用户数据数组
     * @returns {Array} 数据问题列表
     */
    async analyzeDataStructure(members) {
        const issues = [];
        
        members.forEach((member, index) => {
            // 检查必需字段
            const requiredFields = ['username', 'email', 'status'];
            requiredFields.forEach(field => {
                if (!member[field]) {
                    issues.push({
                        type: 'missing_field',
                        memberIndex: index,
                        field: field,
                        message: `用户 ${member.username || index} 缺少必需字段: ${field}`
                    });
                }
            });

            // 检查新增字段（需要设置默认值）
            const newFields = ['grade', 'major', 'contact', 'profileVersion'];
            newFields.forEach(field => {
                if (member[field] === undefined) {
                    issues.push({
                        type: 'missing_new_field',
                        memberIndex: index,
                        field: field,
                        message: `用户 ${member.username || index} 需要添加新字段: ${field}`
                    });
                }
            });

            // 检查数据格式问题
            if (member.favoriteBooks && !Array.isArray(member.favoriteBooks)) {
                issues.push({
                    type: 'format_issue',
                    memberIndex: index,
                    field: 'favoriteBooks',
                    message: `用户 ${member.username || index} 的喜欢书籍格式不正确`
                });
            }

            // 检查状态值
            const validStatuses = ['pending', 'approved', 'rejected'];
            if (member.status && !validStatuses.includes(member.status)) {
                issues.push({
                    type: 'invalid_value',
                    memberIndex: index,
                    field: 'status',
                    currentValue: member.status,
                    message: `用户 ${member.username || index} 的状态值无效: ${member.status}`
                });
            }

            // 检查时间戳格式
            if (member.registrationTime && !this.isValidTimestamp(member.registrationTime)) {
                issues.push({
                    type: 'timestamp_issue',
                    memberIndex: index,
                    field: 'registrationTime',
                    message: `用户 ${member.username || index} 的注册时间格式无效`
                });
            }
        });

        return issues;
    }

    /**
     * 执行数据迁移
     * @param {Object} migrationOptions - 迁移选项
     * @returns {Promise<Object>} 迁移结果
     */
    async performMigration(migrationOptions = {}) {
        if (this.migrationInProgress) {
            throw new Error('数据迁移正在进行中，请勿重复执行');
        }

        this.migrationInProgress = true;
        
        try {
            Logger.info('开始执行数据迁移...');
            
            // 记录迁移开始
            await auditLogManager.logAction(
                'DATA_MIGRATION_START',
                `开始数据迁移，从版本 ${migrationOptions.fromVersion || 'unknown'} 到 ${this.currentVersion}`,
                'DataMigrationManager'
            );

            const migrationResult = {
                success: false,
                startTime: new Date().toISOString(),
                endTime: null,
                migratedCount: 0,
                errorCount: 0,
                warnings: [],
                errors: [],
                backupCreated: false
            };

            // 创建数据备份
            const backupResult = await this.createBackup();
            migrationResult.backupCreated = backupResult.success;
            
            if (!backupResult.success) {
                migrationResult.warnings.push('备份创建失败，但继续迁移');
            }

            // 加载现有数据
            const originalMembers = await loadMembers() || [];
            Logger.info(`加载了 ${originalMembers.length} 个用户数据`);

            // 执行数据转换
            const migratedMembers = [];
            
            for (let i = 0; i < originalMembers.length; i++) {
                try {
                    const migratedMember = await this.migrateMemberData(originalMembers[i], i);
                    migratedMembers.push(migratedMember);
                    migrationResult.migratedCount++;
                } catch (error) {
                    Logger.error(`迁移用户 ${i} 失败`, error);
                    migrationResult.errors.push({
                        memberIndex: i,
                        username: originalMembers[i].username,
                        error: error.message
                    });
                    migrationResult.errorCount++;
                    
                    // 决定是否继续迁移
                    if (migrationOptions.stopOnError) {
                        break;
                    }
                }
            }

            // 验证迁移后的数据
            const validationResult = await this.validateMigratedData(migratedMembers);
            if (!validationResult.isValid) {
                migrationResult.warnings.push('迁移数据验证发现问题');
                migrationResult.warnings.push(...validationResult.issues);
            }

            // 保存迁移后的数据
            if (migratedMembers.length > 0) {
                await saveMembers(migratedMembers);
                Logger.info(`成功保存 ${migratedMembers.length} 个迁移后的用户数据`);
            }

            // 更新版本信息
            localStorage.setItem('appVersion', this.currentVersion);
            localStorage.setItem('migrationStatus', 'completed');
            localStorage.setItem('migrationDate', new Date().toISOString());

            migrationResult.success = true;
            migrationResult.endTime = new Date().toISOString();

            // 记录迁移完成
            await auditLogManager.logAction(
                'DATA_MIGRATION_COMPLETE',
                `数据迁移完成，成功迁移 ${migrationResult.migratedCount} 个用户，${migrationResult.errorCount} 个错误`,
                'DataMigrationManager',
                { migrationResult }
            );

            Logger.info('数据迁移完成', migrationResult);
            return migrationResult;

        } catch (error) {
            Logger.error('数据迁移失败', error);
            
            // 记录迁移失败
            await auditLogManager.logAction(
                'DATA_MIGRATION_FAILED',
                `数据迁移失败: ${error.message}`,
                'DataMigrationManager',
                { error: error.message }
            );

            throw error;
        } finally {
            this.migrationInProgress = false;
        }
    }

    /**
     * 迁移单个用户数据
     * @param {Object} member - 原始用户数据
     * @param {number} index - 用户索引
     * @returns {Object} 迁移后的用户数据
     */
    async migrateMemberData(member, index) {
        const migratedMember = { ...member };
        
        // 添加新字段的默认值
        if (migratedMember.grade === undefined) {
            migratedMember.grade = '';
        }
        
        if (migratedMember.major === undefined) {
            migratedMember.major = '';
        }
        
        if (migratedMember.contact === undefined) {
            migratedMember.contact = '';
        }

        // 添加数据版本标识
        migratedMember.profileVersion = this.currentVersion;

        // 确保必需字段有有效值
        if (!migratedMember.status) {
            migratedMember.status = 'pending';
        }

        // 修复数据格式问题
        if (migratedMember.favoriteBooks && !Array.isArray(migratedMember.favoriteBooks)) {
            if (typeof migratedMember.favoriteBooks === 'string') {
                // 尝试解析字符串格式的书籍列表
                try {
                    migratedMember.favoriteBooks = migratedMember.favoriteBooks
                        .split(',')
                        .map(book => book.trim())
                        .filter(book => book.length > 0);
                } catch {
                    migratedMember.favoriteBooks = [];
                }
            } else {
                migratedMember.favoriteBooks = [];
            }
        }

        // 确保favoriteBooks是数组
        if (!migratedMember.favoriteBooks) {
            migratedMember.favoriteBooks = [];
        }

        // 修复时间戳格式
        if (migratedMember.registrationTime && !this.isValidTimestamp(migratedMember.registrationTime)) {
            // 尝试转换为ISO格式
            try {
                const date = new Date(migratedMember.registrationTime);
                if (!isNaN(date.getTime())) {
                    migratedMember.registrationTime = date.toISOString();
                } else {
                    migratedMember.registrationTime = new Date().toISOString();
                }
            } catch {
                migratedMember.registrationTime = new Date().toISOString();
            }
        }

        // 清理和标准化数据
        migratedMember.username = this.sanitizeString(migratedMember.username);
        migratedMember.email = this.sanitizeString(migratedMember.email);
        
        if (migratedMember.realName) {
            migratedMember.realName = this.sanitizeString(migratedMember.realName);
        }

        // 添加迁移元数据
        migratedMember._migrationInfo = {
            migratedAt: new Date().toISOString(),
            fromVersion: localStorage.getItem('appVersion') || '1.0.0',
            toVersion: this.currentVersion,
            originalIndex: index
        };

        return migratedMember;
    }

    /**
     * 创建数据备份
     * @returns {Promise<Object>} 备份结果
     */
    async createBackup() {
        try {
            const members = await loadMembers();
            const backupData = {
                version: localStorage.getItem('appVersion') || '1.0.0',
                backupDate: new Date().toISOString(),
                members: members || [],
                systemConfig: JSON.parse(localStorage.getItem('systemConfig') || '{}')
            };

            // 检查数据大小
            const dataSize = new Blob([JSON.stringify(backupData)]).size;
            const sizeMB = (dataSize / 1024 / 1024).toFixed(2);
            
            if (dataSize > 4 * 1024 * 1024) { // 4MB警告阈值
                Logger.warn(`备份数据较大: ${sizeMB}MB，可能接近localStorage限制`);
                if (!confirm(`备份数据大小为${sizeMB}MB，可能接近浏览器存储限制。是否继续？`)) {
                    return { success: false, error: '用户取消备份' };
                }
            }

            const backupKey = `backup_${Date.now()}`;
            
            try {
                localStorage.setItem(backupKey, JSON.stringify(backupData));
            } catch (e) {
                if (e.name === 'QuotaExceededError') {
                    Logger.error('localStorage容量不足');
                    // 尝试清理旧备份后重试
                    this.cleanupOldBackups(1);
                    try {
                        localStorage.setItem(backupKey, JSON.stringify(backupData));
                    } catch (retryError) {
                        throw new Error('存储空间不足，请清理浏览器数据');
                    }
                } else {
                    throw e;
                }
            }
            
            // 记录备份信息
            const backupInfo = JSON.parse(localStorage.getItem('backupHistory') || '[]');
            backupInfo.push({
                key: backupKey,
                date: backupData.backupDate,
                version: backupData.version,
                memberCount: backupData.members.length
            });
            
            // 只保留最近5个备份的记录
            if (backupInfo.length > 5) {
                const oldBackups = backupInfo.splice(0, backupInfo.length - 5);
                oldBackups.forEach(backup => {
                    localStorage.removeItem(backup.key);
                });
            }
            
            localStorage.setItem('backupHistory', JSON.stringify(backupInfo));

            Logger.info('数据备份创建成功', { backupKey, memberCount: backupData.members.length });
            return { success: true, backupKey };

        } catch (error) {
            Logger.error('创建数据备份失败', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 验证迁移后的数据
     * @param {Array} migratedMembers - 迁移后的用户数据
     * @returns {Object} 验证结果
     */
    async validateMigratedData(migratedMembers) {
        const validationResult = {
            isValid: true,
            issues: [],
            statistics: {
                totalMembers: migratedMembers.length,
                validMembers: 0,
                invalidMembers: 0
            }
        };

        migratedMembers.forEach((member, index) => {
            let memberValid = true;

            // 验证必需字段
            const requiredFields = ['username', 'email', 'status'];
            requiredFields.forEach(field => {
                if (!member[field] || member[field].trim() === '') {
                    validationResult.issues.push(`用户 ${index}: 缺少必需字段 ${field}`);
                    memberValid = false;
                }
            });

            // 验证邮箱格式
            if (member.email && !this.isValidEmail(member.email)) {
                validationResult.issues.push(`用户 ${index}: 邮箱格式无效 ${member.email}`);
                memberValid = false;
            }

            // 验证状态值
            const validStatuses = ['pending', 'approved', 'rejected'];
            if (!validStatuses.includes(member.status)) {
                validationResult.issues.push(`用户 ${index}: 状态值无效 ${member.status}`);
                memberValid = false;
            }

            if (memberValid) {
                validationResult.statistics.validMembers++;
            } else {
                validationResult.statistics.invalidMembers++;
                validationResult.isValid = false;
            }
        });

        return validationResult;
    }

    /**
     * 回滚到指定备份
     * @param {string} backupKey - 备份键名
     * @returns {Promise<Object>} 回滚结果
     */
    async rollbackToBackup(backupKey) {
        try {
            Logger.info(`开始回滚到备份: ${backupKey}`);

            const backupData = localStorage.getItem(backupKey);
            if (!backupData) {
                throw new Error(`备份 ${backupKey} 不存在`);
            }

            const backup = JSON.parse(backupData);
            
            // 恢复用户数据
            if (backup.members) {
                await saveMembers(backup.members);
            }

            // 恢复版本信息
            if (backup.version) {
                localStorage.setItem('appVersion', backup.version);
            }

            // 恢复系统配置
            if (backup.systemConfig) {
                localStorage.setItem('systemConfig', JSON.stringify(backup.systemConfig));
            }

            // 记录回滚操作
            await auditLogManager.logAction(
                'DATA_ROLLBACK',
                `数据回滚到备份 ${backupKey}，版本 ${backup.version}`,
                'DataMigrationManager',
                { backupKey, backupVersion: backup.version }
            );

            Logger.info('数据回滚完成');
            return { success: true, restoredVersion: backup.version };

        } catch (error) {
            Logger.error('数据回滚失败', error);
            throw error;
        }
    }

    /**
     * 获取备份历史
     * @returns {Array} 备份历史列表
     */
    getBackupHistory() {
        try {
            return JSON.parse(localStorage.getItem('backupHistory') || '[]');
        } catch {
            return [];
        }
    }

    /**
     * 清理旧备份
     * @param {number} keepCount - 保留的备份数量
     */
    cleanupOldBackups(keepCount = 3) {
        try {
            const backupHistory = this.getBackupHistory();
            if (backupHistory.length <= keepCount) return;

            const toDelete = backupHistory.splice(0, backupHistory.length - keepCount);
            toDelete.forEach(backup => {
                localStorage.removeItem(backup.key);
            });

            localStorage.setItem('backupHistory', JSON.stringify(backupHistory));
            Logger.info(`清理了 ${toDelete.length} 个旧备份`);

        } catch (error) {
            Logger.error('清理旧备份失败', error);
        }
    }

    // 工具方法

    /**
     * 验证时间戳格式
     * @param {string} timestamp - 时间戳
     * @returns {boolean} 是否有效
     */
    isValidTimestamp(timestamp) {
        if (!timestamp) return false;
        const date = new Date(timestamp);
        return !isNaN(date.getTime()) && timestamp.includes('T');
    }

    /**
     * 验证邮箱格式
     * @param {string} email - 邮箱地址
     * @returns {boolean} 是否有效
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * 清理字符串
     * @param {string} str - 输入字符串
     * @returns {string} 清理后的字符串
     */
    sanitizeString(str) {
        if (typeof str !== 'string') return '';
        return str.trim()
                  .replace(/<script[^>]*>.*?<\/script>/gi, '')
                  .replace(/javascript:/gi, '')
                  .substring(0, 255); // 增加到255字符，适应更长的用户输入
    }

    /**
     * 导出备份数据到文件
     * @param {string} backupKey - 备份键名
     */
    async exportBackupToFile(backupKey) {
        try {
            const backupData = localStorage.getItem(backupKey);
            if (!backupData) {
                throw new Error('备份不存在');
            }

            const blob = new Blob([backupData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `bookclub-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            Logger.info('备份已导出到文件');
        } catch (error) {
            Logger.error('导出备份失败', error);
            throw error;
        }
    }

    /**
     * 从文件导入备份数据
     * @param {File} file - 备份文件
     * @returns {Promise<Object>} 导入结果
     */
    async importBackupFromFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = async (e) => {
                try {
                    const backupData = JSON.parse(e.target.result);
                    
                    // 验证备份数据格式
                    if (!backupData.version || !backupData.members || !backupData.backupDate) {
                        throw new Error('无效的备份文件格式');
                    }

                    // 恢复数据
                    await saveMembers(backupData.members);
                    
                    if (backupData.systemConfig) {
                        localStorage.setItem('systemConfig', JSON.stringify(backupData.systemConfig));
                    }

                    Logger.info('从文件导入备份成功');
                    resolve({ success: true, memberCount: backupData.members.length });
                    
                } catch (error) {
                    Logger.error('导入备份失败', error);
                    reject(error);
                }
            };

            reader.onerror = () => {
                reject(new Error('读取文件失败'));
            };

            reader.readAsText(file);
        });
    }
}

// 创建全局实例
export const dataMigrationManager = new DataMigrationManager();

Logger.info('数据迁移管理模块已加载');