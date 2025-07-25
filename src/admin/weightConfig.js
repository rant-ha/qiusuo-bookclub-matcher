// 权重配置管理模块
// 提供匹配算法权重的动态配置功能

import { Logger } from '../utils.js';
import { configManager } from './configManager.js';
import { matchingEngine } from '../matching/algorithms.js';
import { hasPermission } from '../auth.js';
import { PERMISSIONS, DEFAULT_MATCHING_WEIGHTS, MATCHING_WEIGHT_METADATA } from '../config.js';
import { createWeightConfigForm, showWeightConfigStatus } from './components.js';

/**
 * 权重配置管理器类
 */
class WeightConfigManager {
    constructor() {
        this.currentWeights = null;
        this.hasUnsavedChanges = false;
        this.activeTab = 'traditional';
        Logger.info('权重配置管理器初始化');
    }

    /**
     * 初始化权重配置界面
     */
    async initialize() {
        try {
            Logger.debug('初始化权重配置界面');
            
            // 检查权限
            if (!await hasPermission(PERMISSIONS.SYSTEM_CONFIG)) {
                Logger.warn('用户无权限访问权重配置');
                showWeightConfigStatus('权限不足：无法访问权重配置功能', 'error');
                return;
            }

            // 加载当前权重配置
            await this.loadCurrentWeights();
            
            // 渲染界面
            this.renderWeightConfigInterface();
            
            // 绑定事件
            this.bindEvents();
            
            // 显示默认标签页
            this.showWeightConfigTab(this.activeTab);
            
            Logger.info('权重配置界面初始化完成');
            
        } catch (error) {
            Logger.error('权重配置界面初始化失败', error);
            showWeightConfigStatus('初始化失败：' + error.message, 'error');
        }
    }

    /**
     * 加载当前权重配置
     */
    async loadCurrentWeights() {
        try {
            const config = configManager.getConfig();
            this.currentWeights = {
                ...DEFAULT_MATCHING_WEIGHTS,
                ...config.matchingWeights
            };
            
            Logger.debug('当前权重配置已加载', this.currentWeights);
            
        } catch (error) {
            Logger.error('加载权重配置失败', error);
            this.currentWeights = { ...DEFAULT_MATCHING_WEIGHTS };
        }
    }

    /**
     * 渲染权重配置界面
     */
    renderWeightConfigInterface() {
        const contentContainer = document.getElementById('weightConfigContent');
        if (!contentContainer) {
            Logger.error('权重配置内容容器未找到');
            return;
        }

        contentContainer.innerHTML = '';

        // 为每个算法类型创建配置表单
        Object.keys(this.currentWeights).forEach(algorithm => {
            const weights = this.currentWeights[algorithm];
            const metadata = MATCHING_WEIGHT_METADATA[algorithm];
            
            if (!metadata) {
                Logger.warn(`算法 ${algorithm} 缺少元数据定义`);
                return;
            }

            const form = createWeightConfigForm(algorithm, weights, metadata);
            form.style.display = algorithm === this.activeTab ? 'block' : 'none';
            contentContainer.appendChild(form);
        });

        Logger.debug('权重配置界面渲染完成');
    }

    /**
     * 绑定事件监听器
     */
    bindEvents() {
        // 保存配置按钮
        const saveBtn = document.getElementById('saveWeightsBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveWeightConfig());
        }

        // 重置按钮
        const resetBtn = document.getElementById('resetWeightsBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetToDefaults());
        }

        // 验证按钮
        const validateBtn = document.getElementById('validateWeightsBtn');
        if (validateBtn) {
            validateBtn.addEventListener('click', () => this.validateAllWeights());
        }

        // 监听权重输入变化
        document.addEventListener('input', (e) => {
            if (e.target.classList.contains('weight-input')) {
                this.hasUnsavedChanges = true;
                this.updateSaveButtonState();
            }
        });

        // 页面离开前提醒
        window.addEventListener('beforeunload', (e) => {
            if (this.hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = '您有未保存的权重配置更改，确定要离开吗？';
            }
        });

        Logger.debug('权重配置事件绑定完成');
    }

    /**
     * 显示指定的权重配置标签页
     * @param {string} algorithm - 算法类型
     */
    showWeightConfigTab(algorithm) {
        this.activeTab = algorithm;
        
        // 隐藏所有表单
        document.querySelectorAll('.weight-config-form').forEach(form => {
            form.style.display = 'none';
        });
        
        // 显示选中的表单
        const activeForm = document.getElementById(`weightForm_${algorithm}`);
        if (activeForm) {
            activeForm.style.display = 'block';
            
            // 更新权重总和显示
            this.updateWeightSum(algorithm);
        }
        
        Logger.debug(`切换到权重配置标签页: ${algorithm}`);
    }

    /**
     * 更新权重总和显示
     * @param {string} algorithm - 算法类型
     */
    updateWeightSum(algorithm) {
        setTimeout(() => {
            const inputs = document.querySelectorAll(`input[id^="${algorithm}_"]:not([type="range"])`);
            let sum = 0;
            
            inputs.forEach(input => {
                const value = parseFloat(input.value) || 0;
                sum += value;
            });
            
            const sumElement = document.getElementById(`weightSum_${algorithm}`);
            const iconElement = document.getElementById(`validationIcon_${algorithm}`);
            
            if (sumElement) {
                sumElement.textContent = sum.toFixed(2);
                sumElement.classList.toggle('invalid', Math.abs(sum - 1.0) > 0.01);
            }
            
            if (iconElement) {
                const isValid = Math.abs(sum - 1.0) <= 0.01;
                iconElement.textContent = isValid ? '✓' : '⚠';
                iconElement.className = `validation-icon ${isValid ? 'valid' : 'invalid'}`;
            }
        }, 100);
    }

    /**
     * 收集当前表单中的权重配置
     * @returns {Object} 权重配置对象
     */
    collectCurrentWeights() {
        const weights = {};
        
        Object.keys(this.currentWeights).forEach(algorithm => {
            weights[algorithm] = {};
            
            const inputs = document.querySelectorAll(`input[id^="${algorithm}_"]:not([type="range"])`);
            inputs.forEach(input => {
                const key = input.id.split('_')[1];
                weights[algorithm][key] = parseFloat(input.value) || 0;
            });
        });
        
        return weights;
    }

    /**
     * 验证所有权重配置
     * @returns {Object} 验证结果
     */
    validateAllWeights() {
        const weights = this.collectCurrentWeights();
        const errors = [];
        const warnings = [];
        
        Object.entries(weights).forEach(([algorithm, algorithmWeights]) => {
            const sum = Object.values(algorithmWeights).reduce((acc, val) => acc + val, 0);
            
            // 检查权重总和
            if (Math.abs(sum - 1.0) > 0.01) {
                errors.push(`${MATCHING_WEIGHT_METADATA[algorithm]?.name || algorithm}的权重总和为${sum.toFixed(2)}，应为1.00`);
            }
            
            // 检查权重范围
            Object.entries(algorithmWeights).forEach(([key, value]) => {
                if (value < 0 || value > 1) {
                    errors.push(`${algorithm}.${key}的权重值${value}超出范围[0,1]`);
                }
                
                if (value === 0) {
                    warnings.push(`${algorithm}.${key}的权重为0，该因子将被完全忽略`);
                }
            });
        });
        
        const result = {
            isValid: errors.length === 0,
            errors,
            warnings,
            weights
        };
        
        // 显示验证结果
        if (result.isValid) {
            const message = warnings.length > 0 
                ? `验证通过，但有${warnings.length}个警告` 
                : '所有权重配置验证通过';
            showWeightConfigStatus(message, warnings.length > 0 ? 'warning' : 'success');
        } else {
            showWeightConfigStatus(`验证失败：${errors[0]}`, 'error');
        }
        
        Logger.debug('权重配置验证完成', result);
        return result;
    }

    /**
     * 保存权重配置
     */
    async saveWeightConfig() {
        try {
            Logger.info('开始保存权重配置');
            
            // 验证配置
            const validationResult = this.validateAllWeights();
            if (!validationResult.isValid) {
                showWeightConfigStatus('保存失败：配置验证不通过', 'error');
                return;
            }
            
            showWeightConfigStatus('正在保存权重配置...', 'info');
            
            // 保存到配置管理器
            const newConfig = {
                matchingWeights: validationResult.weights
            };
            
            const adminName = document.querySelector('.admin-role-badge')?.textContent || 'Unknown Admin';
            await configManager.updateConfig(newConfig, adminName);
            
            // 更新本地缓存
            this.currentWeights = validationResult.weights;
            this.hasUnsavedChanges = false;
            this.updateSaveButtonState();
            
            // 更新匹配引擎
            matchingEngine.updateWeights(validationResult.weights);
            
            showWeightConfigStatus('权重配置保存成功！配置已实时生效', 'success');
            Logger.info('权重配置保存成功', validationResult.weights);
            
        } catch (error) {
            Logger.error('保存权重配置失败', error);
            showWeightConfigStatus('保存失败：' + error.message, 'error');
        }
    }

    /**
     * 重置为默认权重
     */
    resetToDefaults() {
        if (this.hasUnsavedChanges) {
            if (!confirm('重置将丢失所有未保存的更改，确定继续吗？')) {
                return;
            }
        }
        
        Logger.info('重置权重配置为默认值');
        
        // 重置表单值
        Object.entries(DEFAULT_MATCHING_WEIGHTS).forEach(([algorithm, weights]) => {
            Object.entries(weights).forEach(([key, value]) => {
                const input = document.getElementById(`${algorithm}_${key}`);
                const slider = document.querySelector(`input[type="range"][id="${algorithm}_${key}"]`);
                
                if (input) {
                    input.value = value.toFixed(2);
                }
                if (slider) {
                    slider.value = value.toFixed(2);
                }
            });
            
            // 更新总和显示
            this.updateWeightSum(algorithm);
        });
        
        this.hasUnsavedChanges = true;
        this.updateSaveButtonState();
        
        showWeightConfigStatus('已重置为默认权重配置，请保存以生效', 'warning');
    }

    /**
     * 更新保存按钮状态
     */
    updateSaveButtonState() {
        const saveBtn = document.getElementById('saveWeightsBtn');
        if (saveBtn) {
            saveBtn.disabled = !this.hasUnsavedChanges;
            saveBtn.textContent = this.hasUnsavedChanges ? '保存配置 *' : '保存配置';
        }
    }

    /**
     * 获取当前权重配置
     * @returns {Object} 当前权重配置
     */
    getCurrentWeights() {
        return { ...this.currentWeights };
    }

    /**
     * 检查是否有未保存的更改
     * @returns {boolean} 是否有未保存的更改
     */
    hasUnsavedChanges() {
        return this.hasUnsavedChanges;
    }
}

// 创建全局实例
export const weightConfigManager = new WeightConfigManager();

// 导出显示标签页的函数供全局使用
window.showWeightConfigTab = (algorithm) => {
    weightConfigManager.showWeightConfigTab(algorithm);
};

Logger.info('权重配置管理模块已加载');