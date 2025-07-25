// 数据导出管理系统
// 支持多种格式的数据导出，适配Netlify环境

import { Logger } from '../utils.js';
import { loadMembers } from '../api.js';

/**
 * 数据导出管理器
 * 负责各种数据的导出功能，支持JSON、CSV、Excel等格式
 */
class DataExportManager {
    constructor() {
        this.supportedFormats = {
            json: {
                name: 'JSON',
                extension: 'json',
                mimeType: 'application/json',
                description: '结构化数据格式，保留完整信息'
            },
            csv: {
                name: 'CSV',
                extension: 'csv',
                mimeType: 'text/csv',
                description: '表格数据格式，兼容Excel'
            },
            txt: {
                name: 'TXT',
                extension: 'txt',
                mimeType: 'text/plain',
                description: '纯文本格式，易于阅读'
            }
        };
        
        this.exportHistory = [];
        this.maxHistorySize = 10;
        
        Logger.info('数据导出管理器初始化');
    }

    /**
     * 导出用户数据
     * @param {string} format - 导出格式 ('json', 'csv', 'txt')
     * @param {Object} options - 导出选项
     */
    async exportUserData(format = 'json', options = {}) {
        try {
            Logger.info('开始导出用户数据', { format, options });
            
            // 加载用户数据
            const members = await loadMembers();
            if (!members || members.length === 0) {
                throw new Error('没有可导出的用户数据');
            }

            // 过滤和处理数据
            const filteredData = this.filterUserData(members, options);
            
            // 根据格式导出
            let exportData, filename;
            
            switch (format.toLowerCase()) {
                case 'json':
                    exportData = this.exportToJSON(filteredData, options);
                    filename = `bookclub_users_${this.getTimestamp()}.json`;
                    break;
                    
                case 'csv':
                    exportData = this.exportToCSV(filteredData, options);
                    filename = `bookclub_users_${this.getTimestamp()}.csv`;
                    break;
                    
                case 'txt':
                    exportData = this.exportToTXT(filteredData, options);
                    filename = `bookclub_users_${this.getTimestamp()}.txt`;
                    break;
                    
                default:
                    throw new Error(`不支持的导出格式: ${format}`);
            }

            // 下载文件
            await this.downloadFile(exportData, filename, this.supportedFormats[format].mimeType);
            
            // 记录导出历史
            this.recordExport(format, filename, filteredData.length);
            
            Logger.info('用户数据导出完成', { 
                format, 
                filename, 
                recordCount: filteredData.length 
            });
            
            return {
                success: true,
                filename,
                recordCount: filteredData.length,
                format
            };
            
        } catch (error) {
            Logger.error('用户数据导出失败', error);
            throw error;
        }
    }

    /**
     * 导出系统设置
     * @param {string} format - 导出格式
     */
    async exportSystemSettings(format = 'json') {
        try {
            const settings = {
                userSettings: JSON.parse(localStorage.getItem('userSettings') || '{}'),
                systemConfig: JSON.parse(localStorage.getItem('systemConfig') || '{}'),
                appVersion: localStorage.getItem('appVersion') || '1.0.0',
                exportTimestamp: new Date().toISOString()
            };

            let exportData, filename;
            
            if (format === 'json') {
                exportData = JSON.stringify(settings, null, 2);
                filename = `bookclub_settings_${this.getTimestamp()}.json`;
            } else {
                throw new Error('系统设置只支持JSON格式导出');
            }

            await this.downloadFile(exportData, filename, 'application/json');
            this.recordExport('settings', filename, 1);
            
            Logger.info('系统设置导出完成', { filename });
            
            return { success: true, filename };
            
        } catch (error) {
            Logger.error('系统设置导出失败', error);
            throw error;
        }
    }

    /**
     * 导出匹配历史
     * @param {string} format - 导出格式
     * @param {Object} options - 导出选项
     */
    async exportMatchingHistory(format = 'json', options = {}) {
        try {
            const members = await loadMembers();
            if (!members) {
                throw new Error('无法加载用户数据');
            }

            // 提取匹配历史数据
            const matchingHistory = [];
            
            members.forEach(member => {
                if (member.matchingHistory && Array.isArray(member.matchingHistory)) {
                    member.matchingHistory.forEach(match => {
                        matchingHistory.push({
                            userId: member.id,
                            userName: member.name,
                            partnerId: match.partnerId,
                            matchDate: match.matchDate,
                            matchType: match.matchType,
                            score: match.score,
                            feedback: match.feedback
                        });
                    });
                }
            });

            if (matchingHistory.length === 0) {
                throw new Error('没有匹配历史数据');
            }

            let exportData, filename;
            
            switch (format.toLowerCase()) {
                case 'json':
                    exportData = JSON.stringify(matchingHistory, null, 2);
                    filename = `bookclub_matches_${this.getTimestamp()}.json`;
                    break;
                    
                case 'csv':
                    exportData = this.convertMatchHistoryToCSV(matchingHistory);
                    filename = `bookclub_matches_${this.getTimestamp()}.csv`;
                    break;
                    
                default:
                    throw new Error(`匹配历史不支持 ${format} 格式`);
            }

            await this.downloadFile(exportData, filename, this.supportedFormats[format].mimeType);
            this.recordExport('matches', filename, matchingHistory.length);
            
            Logger.info('匹配历史导出完成', { 
                format, 
                filename, 
                recordCount: matchingHistory.length 
            });
            
            return {
                success: true,
                filename,
                recordCount: matchingHistory.length,
                format
            };
            
        } catch (error) {
            Logger.error('匹配历史导出失败', error);
            throw error;
        }
    }

    /**
     * 过滤用户数据
     * @param {Array} members - 用户数据
     * @param {Object} options - 过滤选项
     */
    filterUserData(members, options) {
        let filtered = [...members];
        
        // 按状态过滤
        if (options.status && options.status !== 'all') {
            filtered = filtered.filter(member => member.status === options.status);
        }
        
        // 按时间范围过滤
        if (options.dateRange) {
            const { start, end } = options.dateRange;
            filtered = filtered.filter(member => {
                const joinDate = new Date(member.joinDate);
                return (!start || joinDate >= new Date(start)) && 
                       (!end || joinDate <= new Date(end));
            });
        }
        
        // 隐私数据处理
        if (options.excludeSensitive) {
            filtered = filtered.map(member => {
                const clean = { ...member };
                delete clean.studentId;
                delete clean.email;
                return clean;
            });
        }
        
        return filtered;
    }

    /**
     * 导出为JSON格式
     * @param {Array} data - 数据
     * @param {Object} options - 选项
     */
    exportToJSON(data, options) {
        const exportObject = {
            metadata: {
                exportDate: new Date().toISOString(),
                recordCount: data.length,
                version: '1.0.0'
            },
            data: data
        };
        
        return JSON.stringify(exportObject, null, options.formatted ? 2 : 0);
    }

    /**
     * 导出为CSV格式
     * @param {Array} data - 数据
     * @param {Object} options - 选项
     */
    exportToCSV(data, options) {
        if (!data || data.length === 0) {
            return '没有数据可导出';
        }
        
        // CSV标题行
        const headers = [
            'ID', '姓名', '学号', '邮箱', '状态', '加入日期',
            '阅读偏好流派', '喜爱书籍', '阅读习惯'
        ];
        
        // 数据行
        const rows = data.map(member => [
            this.escapeCsvValue(member.id || ''),
            this.escapeCsvValue(member.name || ''),
            this.escapeCsvValue(member.studentId || ''),
            this.escapeCsvValue(member.email || ''),
            this.escapeCsvValue(member.status || ''),
            this.escapeCsvValue(member.joinDate || ''),
            this.escapeCsvValue(this.formatArray(member.readingPreferences?.genres)),
            this.escapeCsvValue(this.formatArray(member.readingPreferences?.favoriteBooks)),
            this.escapeCsvValue(this.formatReadingHabits(member.readingPreferences?.readingHabits))
        ]);
        
        // 合并标题和数据
        const csvContent = [headers, ...rows]
            .map(row => row.join(','))
            .join('\n');
            
        return '\uFEFF' + csvContent; // 添加BOM以支持中文
    }

    /**
     * 导出为TXT格式
     * @param {Array} data - 数据
     * @param {Object} options - 选项
     */
    exportToTXT(data, options) {
        let content = `求索书社用户数据导出\n`;
        content += `导出时间: ${new Date().toLocaleString('zh-CN')}\n`;
        content += `用户数量: ${data.length}\n`;
        content += `${'='.repeat(50)}\n\n`;
        
        data.forEach((member, index) => {
            content += `${index + 1}. ${member.name || '未知用户'}\n`;
            content += `   学号: ${member.studentId || 'N/A'}\n`;
            content += `   邮箱: ${member.email || 'N/A'}\n`;
            content += `   状态: ${member.status || 'N/A'}\n`;
            content += `   加入日期: ${member.joinDate ? new Date(member.joinDate).toLocaleDateString('zh-CN') : 'N/A'}\n`;
            
            if (member.readingPreferences) {
                content += `   阅读偏好:\n`;
                if (member.readingPreferences.genres) {
                    content += `     流派: ${member.readingPreferences.genres.join(', ')}\n`;
                }
                if (member.readingPreferences.favoriteBooks) {
                    content += `     喜爱书籍: ${member.readingPreferences.favoriteBooks.join(', ')}\n`;
                }
            }
            
            content += `\n`;
        });
        
        return content;
    }

    /**
     * 转换匹配历史为CSV
     * @param {Array} matchHistory - 匹配历史数据
     */
    convertMatchHistoryToCSV(matchHistory) {
        const headers = ['用户ID', '用户姓名', '匹配对象ID', '匹配日期', '匹配类型', '匹配分数', '反馈'];
        
        const rows = matchHistory.map(match => [
            this.escapeCsvValue(match.userId || ''),
            this.escapeCsvValue(match.userName || ''),
            this.escapeCsvValue(match.partnerId || ''),
            this.escapeCsvValue(match.matchDate || ''),
            this.escapeCsvValue(match.matchType || ''),
            this.escapeCsvValue(match.score?.toString() || ''),
            this.escapeCsvValue(match.feedback || '')
        ]);
        
        const csvContent = [headers, ...rows]
            .map(row => row.join(','))
            .join('\n');
            
        return '\uFEFF' + csvContent;
    }

    /**
     * 转义CSV值
     * @param {string} value - 值
     */
    escapeCsvValue(value) {
        if (value == null) return '';
        
        const str = String(value);
        
        // 如果包含逗号、引号或换行符，需要用引号包围
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return '"' + str.replace(/"/g, '""') + '"';
        }
        
        return str;
    }

    /**
     * 格式化数组为字符串
     * @param {Array} arr - 数组
     */
    formatArray(arr) {
        if (!Array.isArray(arr)) return '';
        return arr.join('; ');
    }

    /**
     * 格式化阅读习惯
     * @param {Object} habits - 阅读习惯对象
     */
    formatReadingHabits(habits) {
        if (!habits || typeof habits !== 'object') return '';
        
        const parts = [];
        if (habits.dailyTime) parts.push(`每日${habits.dailyTime}分钟`);
        if (habits.preferredFormat) parts.push(`偏好${habits.preferredFormat}`);
        if (habits.readingSpeed) parts.push(`速度${habits.readingSpeed}`);
        
        return parts.join(', ');
    }

    /**
     * 下载文件
     * @param {string} content - 文件内容
     * @param {string} filename - 文件名
     * @param {string} mimeType - MIME类型
     */
    async downloadFile(content, filename, mimeType) {
        try {
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.style.display = 'none';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // 清理URL对象
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            
            Logger.debug('文件下载已触发', { filename, mimeType });
            
        } catch (error) {
            Logger.error('文件下载失败', error);
            throw new Error('无法下载文件');
        }
    }

    /**
     * 获取时间戳字符串
     * @returns {string} 时间戳
     */
    getTimestamp() {
        return new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    }

    /**
     * 记录导出历史
     * @param {string} type - 导出类型
     * @param {string} filename - 文件名
     * @param {number} recordCount - 记录数量
     */
    recordExport(type, filename, recordCount) {
        const exportRecord = {
            id: Date.now().toString(),
            type,
            filename,
            recordCount,
            timestamp: new Date().toISOString()
        };
        
        this.exportHistory.unshift(exportRecord);
        
        // 限制历史记录数量
        if (this.exportHistory.length > this.maxHistorySize) {
            this.exportHistory = this.exportHistory.slice(0, this.maxHistorySize);
        }
        
        // 保存到localStorage
        try {
            localStorage.setItem('exportHistory', JSON.stringify(this.exportHistory));
        } catch (error) {
            Logger.warn('无法保存导出历史', error);
        }
    }

    /**
     * 获取导出历史
     * @returns {Array} 导出历史记录
     */
    getExportHistory() {
        if (this.exportHistory.length === 0) {
            try {
                const saved = localStorage.getItem('exportHistory');
                if (saved) {
                    this.exportHistory = JSON.parse(saved);
                }
            } catch (error) {
                Logger.warn('无法加载导出历史', error);
            }
        }
        
        return this.exportHistory;
    }

    /**
     * 清理导出历史
     */
    clearExportHistory() {
        this.exportHistory = [];
        localStorage.removeItem('exportHistory');
        Logger.info('导出历史已清理');
    }

    /**
     * 获取支持的导出格式
     * @returns {Object} 支持的格式列表
     */
    getSupportedFormats() {
        return Object.keys(this.supportedFormats).map(key => ({
            key,
            ...this.supportedFormats[key]
        }));
    }

    /**
     * 批量导出
     * @param {Array} exports - 导出任务列表
     */
    async batchExport(exports) {
        const results = [];
        
        for (const exportTask of exports) {
            try {
                let result;
                
                switch (exportTask.type) {
                    case 'users':
                        result = await this.exportUserData(exportTask.format, exportTask.options);
                        break;
                    case 'settings':
                        result = await this.exportSystemSettings(exportTask.format);
                        break;
                    case 'matches':
                        result = await this.exportMatchingHistory(exportTask.format, exportTask.options);
                        break;
                    default:
                        throw new Error(`不支持的导出类型: ${exportTask.type}`);
                }
                
                results.push({ ...result, type: exportTask.type });
                
                // 添加延迟以避免浏览器阻止多个下载
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (error) {
                Logger.error(`批量导出失败: ${exportTask.type}`, error);
                results.push({
                    success: false,
                    type: exportTask.type,
                    error: error.message
                });
            }
        }
        
        Logger.info('批量导出完成', { 
            total: exports.length, 
            successful: results.filter(r => r.success).length 
        });
        
        return results;
    }
}

// 创建全局导出管理器实例
export const dataExportManager = new DataExportManager();

Logger.info('数据导出管理模块已加载');