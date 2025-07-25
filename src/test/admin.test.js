// src/test/admin.test.js

import { configManager } from '../admin/configManager.js';
import { userManager } from '../admin/userManager.js';
import { store } from '../state.js';
import { ROLES, PERMISSIONS } from '../config.js';
import { runDataMigrationTests } from './dataMigration.test.js';

// 模拟API环境 - 替换不存在的函数  
import * as api from '../api.js';
import * as auth from '../auth.js';

// 原始函数备份
const originalLoadSystemConfig = api.loadSystemConfig;
const originalSaveSystemConfig = api.saveSystemConfig;
const originalSaveMembers = api.saveMembers;
const originalHasPermission = auth.hasPermission;

// 模拟函数
api.loadSystemConfig = async () => {
    console.log('Mock loadSystemConfig called');
    return { aiConfig: { enabled: false } };
};

api.saveSystemConfig = async (data) => {
    console.log('Mock saveSystemConfig called', data);
    return true;
};

api.saveMembers = async (members) => {
    console.log('Mock saveMembers called', members);
    return true;
};

auth.hasPermission = async (permission) => {
    console.log(`Mock permission check for: ${permission}`);
    return true; // 测试中假设有所有权限
};

// --- 测试套件 ---

async function runAdminTests() {
    console.group("🚀 Running Admin Feature Tests...");

    await testConfigManager();
    await testUserManager(); 
    await testIntegrationScenarios();
    await testFailureScenarios();
    await testComponentSecurity();
    await testWeightConfigManager();
    await testWeightConfigComponents();
    await testAuditLogManager();
    await testAuditLogComponents();
    
    // 【P0紧急】数据迁移测试
    console.group("🔥 P0 Critical: Data Migration Tests");
    const migrationTestsPassed = await runDataMigrationTests();
    if (!migrationTestsPassed) {
        console.error("⚠️  数据迁移测试失败！这是P0级别的问题，必须修复后才能部署！");
    }
    console.groupEnd();

    console.groupEnd();
}

// --- ConfigManager Tests ---

async function testConfigManager() {
    console.group("1. ConfigManager Tests");

    // Test 1: Initial load
    await configManager.loadConfig();
    let config = configManager.getConfig();
    console.assert(config.aiConfig.enabled === false, "Test 1.1 FAILED: Should load mock config.");

    // Test 2: Update and check listeners
    let listenerCalled = false;
    const unsubscribe = configManager.onUpdate(newConfig => {
        if (newConfig.systemParams.logLevel === 'DEBUG') {
            listenerCalled = true;
        }
    });
    
    await configManager.updateConfig({ systemParams: { logLevel: 'DEBUG' } }, 'TestAdmin');
    console.assert(listenerCalled, "Test 1.2 FAILED: Listener was not called on update.");
    
    config = configManager.getConfig();
    console.assert(config.systemParams.logLevel === 'DEBUG', "Test 1.3 FAILED: Config did not update.");

    unsubscribe();
    console.log("✅ ConfigManager tests passed.");
    console.groupEnd();
}

// --- UserManager Tests ---

function testUserManager() {
    console.group("2. UserManager Tests");

    // Setup mock data and permissions
    const mockMembers = [
        { id: '1', name: 'Alice', status: 'pending' },
        { id: '2', name: 'Bob', status: 'pending' },
        { id: '3', name: 'Charlie', status: 'approved' },
    ];
    store.setMembers(mockMembers);
    store.setAdmin(true, ROLES.SUPER_ADMIN, PERMISSIONS.USER_MANAGEMENT);

    // Test 1: Batch update status
    userManager.batchUpdateUserStatus(['1', '2'], 'approved');
    let members = store.getMembers();
    console.assert(members.find(m => m.id === '1').status === 'approved', "Test 2.1 FAILED: User '1' should be approved.");
    console.assert(members.find(m => m.id === '2').status === 'approved', "Test 2.2 FAILED: User '2' should be approved.");

    // Test 2: Filtering
    const pendingUsers = userManager.filterUsers({ status: 'pending' });
    console.assert(pendingUsers.length === 0, "Test 2.3 FAILED: There should be no pending users.");
    
    const approvedUsers = userManager.filterUsers({ status: 'approved' });
    console.assert(approvedUsers.length === 3, "Test 2.4 FAILED: There should be 3 approved users.");

    console.log("✅ UserManager tests passed.");
    console.groupEnd();
}

// --- 集成测试 ---

async function testIntegrationScenarios() {
    console.group("3. Integration Tests");

    // Test 1: ConfigManager配置更新是否能被监听器正确接收
    let configUpdateReceived = false;
    const testConfig = { systemParams: { logLevel: 'INFO' } };
    
    const unsubscribe = configManager.onUpdate(newConfig => {
        if (newConfig.systemParams.logLevel === 'INFO') {
            configUpdateReceived = true;
        }
    });
    
    await configManager.updateConfig(testConfig, 'IntegrationTest');
    console.assert(configUpdateReceived, "Test 3.1 FAILED: Configuration update not propagated to listeners");
    
    unsubscribe();

    // Test 2: 权限和UI组件渲染的集成
    // 模拟不同权限级别
    const originalHasPermission = auth.hasPermission;
    
    // 测试有权限的情况
    auth.hasPermission = async (permission) => permission === PERMISSIONS.USER_MANAGEMENT;
    
    const mockMembers = [
        { id: '1', name: 'Alice', status: 'pending' },
        { id: '2', name: 'Bob', status: 'approved' }
    ];
    store.setMembers(mockMembers);
    
    const result = await userManager.batchUpdateUserStatus(['1'], 'approved');
    console.assert(result.success === true, "Test 3.2 FAILED: Should succeed with proper permissions");
    
    // 测试无权限的情况
    auth.hasPermission = async () => false;
    const resultNoPermission = await userManager.batchUpdateUserStatus(['2'], 'rejected');
    console.assert(resultNoPermission.success === false, "Test 3.3 FAILED: Should fail without permissions");
    
    // 恢复原始函数
    auth.hasPermission = originalHasPermission;

    console.log("✅ Integration tests passed.");
    console.groupEnd();
}

// --- 失败场景测试 ---

async function testFailureScenarios() {
    console.group("4. Failure Scenario Tests");

    // Test 1: ConfigManager loadConfig失败时的回退机制
    const originalLoadSystemConfig = api.loadSystemConfig;
    api.loadSystemConfig = async () => {
        throw new Error('Simulated API failure');
    };
    
    await configManager.loadConfig();
    const fallbackConfig = configManager.getConfig();
    console.assert(fallbackConfig !== null, "Test 4.1 FAILED: Should fallback to default config on load failure");
    console.assert(fallbackConfig.aiConfig !== undefined, "Test 4.2 FAILED: Fallback config should have default structure");
    
    // 恢复原始函数
    api.loadSystemConfig = originalLoadSystemConfig;

    // Test 2: UserManager API调用失败的处理
    const originalSaveMembers = api.saveMembers;
    api.saveMembers = async () => {
        throw new Error('Simulated save failure');
    };
    
    const mockMembers = [{ id: '1', name: 'Alice', status: 'pending' }];
    store.setMembers(mockMembers);
    
    const failureResult = await userManager.batchUpdateUserStatus(['1'], 'approved');
    console.assert(failureResult.success === false, "Test 4.3 FAILED: Should return failure on API error");
    console.assert(failureResult.message.includes('Simulated save failure'), "Test 4.4 FAILED: Should include error message");
    
    // 恢复原始函数
    api.saveMembers = originalSaveMembers;

    // Test 3: 权限检查函数异常的处理
    const originalHasPermission = auth.hasPermission;
    auth.hasPermission = async () => {
        throw new Error('Permission check failed');
    };
    
    // ConfigManager应该能处理权限检查异常
    try {
        await configManager.updateConfig({ systemParams: { logLevel: 'ERROR' } }, 'TestAdmin');
        console.log("Test 4.5 PASSED: ConfigManager handled permission check exception");
    } catch (error) {
        console.assert(false, "Test 4.5 FAILED: ConfigManager should handle permission check exceptions gracefully");
    }
    
    // 恢复原始函数
    auth.hasPermission = originalHasPermission;

    // Test 4: 无效数据的处理
    const invalidUpdateResult = await userManager.batchUpdateUserStatus([], 'approved');
    console.assert(invalidUpdateResult.count === 0, "Test 4.6 FAILED: Should handle empty user list gracefully");

    console.log("✅ Failure scenario tests passed.");
    console.groupEnd();
}

// --- 组件安全性测试 ---

async function testComponentSecurity() {
    console.group("5. Component Security Tests");

    // 导入组件函数进行测试
    const { createAdminButton, createMetricCard, createSafeTextElement, setSafeContent } = await import('../admin/components.js');

    // Test 1: XSS防护测试
    const maliciousText = '<script>alert("XSS")</script>';
    const safeButton = createAdminButton('testBtn', maliciousText);
    console.assert(!safeButton.textContent.includes('<script>'), "Test 5.1 FAILED: Button should sanitize malicious content");
    console.assert(safeButton.textContent.includes('alert'), "Test 5.2 FAILED: Button should preserve safe parts of content");

    // Test 2: 指标卡片XSS防护
    const maliciousLabel = '<img src=x onerror=alert(1)>';
    const metricCard = createMetricCard(maliciousLabel, 'testMetric');
    const labelElement = metricCard.querySelector('.metric-label');
    console.assert(!labelElement.innerHTML.includes('<img'), "Test 5.3 FAILED: Metric card should sanitize HTML tags");

    // Test 3: 安全文本元素
    const safeText = createSafeTextElement(maliciousText, 'div');
    console.assert(safeText.textContent === '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;', "Test 5.4 FAILED: Safe text element should encode HTML entities");

    // Test 4: setSafeContent函数测试
    const testDiv = document.createElement('div');
    setSafeContent(testDiv, maliciousText);
    console.assert(!testDiv.innerHTML.includes('<script>'), "Test 5.5 FAILED: setSafeContent should prevent XSS");

    // Test 5: ID和属性的安全性
    const buttonWithMaliciousId = createAdminButton('<script>evil</script>', 'Safe Text');
    console.assert(!buttonWithMaliciousId.id.includes('<script>'), "Test 5.6 FAILED: Component IDs should be sanitized");

    console.log("✅ Component security tests passed.");
    console.groupEnd();
}

// --- 权重配置管理器测试 ---

async function testWeightConfigManager() {
    console.group("6. Weight Configuration Manager Tests");

    try {
        // 导入权重配置管理器
        const { weightConfigManager } = await import('../admin/weightConfig.js');
        const { DEFAULT_MATCHING_WEIGHTS, MATCHING_WEIGHT_METADATA } = await import('../config.js');

        // Test 1: 初始化测试
        console.log("Test 6.1: Weight config manager initialization");
        await weightConfigManager.loadCurrentWeights();
        const currentWeights = weightConfigManager.getCurrentWeights();
        console.assert(currentWeights !== null, "Test 6.1a FAILED: Current weights should be loaded");
        console.assert(typeof currentWeights === 'object', "Test 6.1b FAILED: Current weights should be an object");

        // Test 2: 权重默认值测试
        console.log("Test 6.2: Default weights loading");
        Object.keys(DEFAULT_MATCHING_WEIGHTS).forEach(algorithm => {
            console.assert(currentWeights[algorithm], `Test 6.2a FAILED: Algorithm ${algorithm} should exist in current weights`);
            
            const defaultWeights = DEFAULT_MATCHING_WEIGHTS[algorithm];
            const sum = Object.values(defaultWeights).reduce((acc, val) => acc + val, 0);
            console.assert(Math.abs(sum - 1.0) <= 0.01, `Test 6.2b FAILED: Default weights for ${algorithm} should sum to 1.0, got ${sum}`);
        });

        // Test 3: 权重验证测试
        console.log("Test 6.3: Weight validation logic");
        
        // 创建测试权重配置
        const testWeights = {
            traditional: {
                personalityMatch: 0.5,
                interestOverlap: 0.3,
                readingStyleCompatibility: 0.2
            },
            ai: {
                semanticAnalysis: 0.4,
                personalityInsight: 0.3,
                deepCompatibility: 0.3
            }
        };

        const validationResult = weightConfigManager.validateAllWeights();
        console.assert(typeof validationResult === 'object', "Test 6.3a FAILED: Validation should return an object");
        console.assert(typeof validationResult.isValid === 'boolean', "Test 6.3b FAILED: Validation result should have isValid property");
        console.assert(Array.isArray(validationResult.errors), "Test 6.3c FAILED: Validation result should have errors array");
        console.assert(Array.isArray(validationResult.warnings), "Test 6.3d FAILED: Validation result should have warnings array");

        // Test 4: 无效权重测试
        console.log("Test 6.4: Invalid weight handling");
        
        // 模拟创建无效权重输入
        const testContainer = document.createElement('div');
        testContainer.innerHTML = `
            <input id="traditional_personalityMatch" type="number" value="0.8">
            <input id="traditional_interestOverlap" type="number" value="0.5">
            <input id="traditional_readingStyleCompatibility" type="number" value="0.1">
        `;
        document.body.appendChild(testContainer);

        // 更新权重总和显示 - 应该显示无效（总和>1）
        weightConfigManager.updateWeightSum('traditional');
        
        // 等待DOM更新
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // 清理测试DOM
        document.body.removeChild(testContainer);

        // Test 5: 权重收集测试
        console.log("Test 6.5: Weight collection from form");
        
        // 创建完整的测试表单
        const formContainer = document.createElement('div');
        formContainer.innerHTML = `
            <div id="weightConfigContent">
                <input id="traditional_personalityMatch" type="number" value="0.4">
                <input id="traditional_interestOverlap" type="number" value="0.3">
                <input id="traditional_readingStyleCompatibility" type="number" value="0.3">
                <input id="ai_semanticAnalysis" type="number" value="0.5">
                <input id="ai_personalityInsight" type="number" value="0.3">
                <input id="ai_deepCompatibility" type="number" value="0.2">
            </div>
        `;
        document.body.appendChild(formContainer);

        const collectedWeights = weightConfigManager.collectCurrentWeights();
        console.assert(collectedWeights.traditional, "Test 6.5a FAILED: Should collect traditional weights");
        console.assert(collectedWeights.ai, "Test 6.5b FAILED: Should collect AI weights");
        console.assert(collectedWeights.traditional.personalityMatch === 0.4, "Test 6.5c FAILED: Should collect correct weight values");

        // 清理测试DOM
        document.body.removeChild(formContainer);

        // Test 6: 权限检查测试
        console.log("Test 6.6: Permission checking");
        
        // 模拟无权限情况
        const originalHasPermission = auth.hasPermission;
        auth.hasPermission = async () => false;
        
        await weightConfigManager.initialize();
        // 应该显示权限不足的消息，但不应该抛出错误
        
        // 恢复权限检查函数
        auth.hasPermission = originalHasPermission;

    } catch (error) {
        console.error("Weight configuration manager test failed:", error);
        console.assert(false, `Test 6 FAILED with error: ${error.message}`);
    }

    console.log("✅ Weight configuration manager tests completed.");
    console.groupEnd();
}

// --- 权重配置组件测试 ---

async function testWeightConfigComponents() {
    console.group("7. Weight Configuration Components Tests");

    try {
        // 导入权重配置组件
        const { createWeightConfigForm, showWeightConfigStatus } = await import('../admin/components.js');
        const { DEFAULT_MATCHING_WEIGHTS, MATCHING_WEIGHT_METADATA } = await import('../config.js');

        // Test 1: 权重配置表单创建
        console.log("Test 7.1: Weight config form creation");
        
        const algorithm = 'traditional';
        const weights = DEFAULT_MATCHING_WEIGHTS[algorithm];
        const metadata = MATCHING_WEIGHT_METADATA[algorithm];
        
        const form = createWeightConfigForm(algorithm, weights, metadata);
        console.assert(form instanceof HTMLElement, "Test 7.1a FAILED: Should create HTML element");
        console.assert(form.id === `weightForm_${algorithm}`, "Test 7.1b FAILED: Should have correct form ID");
        console.assert(form.querySelector('.algorithm-description'), "Test 7.1c FAILED: Should contain algorithm description");
        console.assert(form.querySelector('.weights-group'), "Test 7.1d FAILED: Should contain weights group");
        console.assert(form.querySelector('.weight-summary'), "Test 7.1e FAILED: Should contain weight summary");

        // Test 2: 权重输入组测试
        console.log("Test 7.2: Weight input groups");
        
        const inputGroups = form.querySelectorAll('.weight-input-group');
        console.assert(inputGroups.length > 0, "Test 7.2a FAILED: Should create weight input groups");
        
        const firstGroup = inputGroups[0];
        console.assert(firstGroup.querySelector('.weight-label'), "Test 7.2b FAILED: Should contain weight label");
        console.assert(firstGroup.querySelector('.weight-input'), "Test 7.2c FAILED: Should contain weight input");
        console.assert(firstGroup.querySelector('.weight-slider'), "Test 7.2d FAILED: Should contain weight slider");
        console.assert(firstGroup.querySelector('.weight-description'), "Test 7.2e FAILED: Should contain weight description");

        // Test 3: 状态消息测试
        console.log("Test 7.3: Weight config status messages");
        
        // 创建状态容器用于测试
        const statusContainer = document.createElement('div');
        statusContainer.id = 'weightConfigStatus';
        statusContainer.style.display = 'none';
        document.body.appendChild(statusContainer);

        showWeightConfigStatus('测试消息', 'success');
        console.assert(statusContainer.style.display === 'block', "Test 7.3a FAILED: Status should be visible after showing message");
        console.assert(statusContainer.classList.contains('success'), "Test 7.3b FAILED: Status should have success class");
        console.assert(statusContainer.textContent.includes('测试消息'), "Test 7.3c FAILED: Status should contain message text");

        // 测试不同类型的状态消息
        showWeightConfigStatus('错误消息', 'error');
        console.assert(statusContainer.classList.contains('error'), "Test 7.3d FAILED: Status should update to error class");

        showWeightConfigStatus('警告消息', 'warning');
        console.assert(statusContainer.classList.contains('warning'), "Test 7.3e FAILED: Status should update to warning class");

        // 清理测试DOM
        document.body.removeChild(statusContainer);

        // Test 4: XSS防护测试
        console.log("Test 7.4: Weight config XSS protection");
        
        const maliciousWeights = {
            'malicious<script>alert("xss")</script>': 0.5,
            'safe_weight': 0.5
        };
        
        const maliciousMetadata = {
            description: '<script>alert("xss")</script>描述',
            factors: {
                'malicious<script>alert("xss")</script>': {
                    name: '<img src=x onerror=alert(1)>恶意名称',
                    description: '<script>evil()</script>恶意描述'
                },
                'safe_weight': {
                    name: '安全权重',
                    description: '安全描述'
                }
            }
        };
        
        const maliciousForm = createWeightConfigForm('test', maliciousWeights, maliciousMetadata);
        const formHTML = maliciousForm.innerHTML;
        console.assert(!formHTML.includes('<script>'), "Test 7.4a FAILED: Form should sanitize script tags");
        console.assert(!formHTML.includes('onerror='), "Test 7.4b FAILED: Form should sanitize event handlers");

    } catch (error) {
        console.error("Weight configuration components test failed:", error);
        console.assert(false, `Test 7 FAILED with error: ${error.message}`);
    }

    console.log("✅ Weight configuration components tests completed.");
    console.groupEnd();
}

// --- 审计日志系统测试 ---

async function testAuditLogManager() {
    console.group("8. Audit Log Manager Tests");

    try {
        // 导入审计日志管理器
        const { auditLogManager } = await import('../admin/auditLog.js');

        // Test 1: 记录审计日志测试
        console.log("Test 8.1: Audit log recording");
        
        const testAction = 'USER_LOGIN';
        const testDetails = '管理员登录系统';
        const testAdmin = 'TestAdmin';
        const testMetadata = { ip: '192.168.1.1', userAgent: 'TestAgent' };
        
        const logEntry = await auditLogManager.logAction(testAction, testDetails, testAdmin, testMetadata);
        console.assert(logEntry !== null, "Test 8.1a FAILED: Should create log entry");
        console.assert(logEntry.action === testAction, "Test 8.1b FAILED: Should record correct action");
        console.assert(logEntry.details === testDetails, "Test 8.1c FAILED: Should record correct details");
        console.assert(logEntry.adminName === testAdmin, "Test 8.1d FAILED: Should record correct admin name");
        console.assert(logEntry.id && logEntry.id.startsWith('audit_'), "Test 8.1e FAILED: Should generate valid log ID");
        console.assert(logEntry.timestamp, "Test 8.1f FAILED: Should include timestamp");

        // Test 2: 日志过滤测试
        console.log("Test 8.2: Log filtering");
        
        // 添加更多测试日志
        await auditLogManager.logAction('USER_MANAGEMENT', '批准用户申请', 'TestAdmin2');
        await auditLogManager.logAction('SYSTEM_CONFIG', '更新系统配置', 'TestAdmin');
        
        const allLogs = auditLogManager.getLogs();
        console.assert(allLogs.logs.length >= 3, "Test 8.2a FAILED: Should have at least 3 log entries");
        
        const filteredByAction = auditLogManager.getLogs({ action: 'USER_LOGIN' });
        console.assert(filteredByAction.logs.length >= 1, "Test 8.2b FAILED: Should filter by action");
        
        const filteredByAdmin = auditLogManager.getLogs({ adminName: 'TestAdmin' });
        console.assert(filteredByAdmin.logs.length >= 2, "Test 8.2c FAILED: Should filter by admin name");
        
        // Test 3: 分页测试
        console.log("Test 8.3: Pagination");
        
        const paginatedLogs = auditLogManager.getLogs({ page: 1, pageSize: 2 });
        console.assert(paginatedLogs.logs.length <= 2, "Test 8.3a FAILED: Should respect page size");
        console.assert(paginatedLogs.page === 1, "Test 8.3b FAILED: Should return correct page number");
        console.assert(paginatedLogs.pageSize === 2, "Test 8.3c FAILED: Should return correct page size");
        console.assert(typeof paginatedLogs.totalPages === 'number', "Test 8.3d FAILED: Should calculate total pages");

        // Test 4: 统计信息测试
        console.log("Test 8.4: Statistics");
        
        const stats = auditLogManager.getStatistics();
        console.assert(typeof stats.totalLogs === 'number', "Test 8.4a FAILED: Should return total logs count");
        console.assert(typeof stats.last24Hours === 'number', "Test 8.4b FAILED: Should return 24h logs count");
        console.assert(typeof stats.last7Days === 'number', "Test 8.4c FAILED: Should return 7d logs count");
        console.assert(Array.isArray(stats.topActions), "Test 8.4d FAILED: Should return top actions array");
        console.assert(Array.isArray(stats.topAdmins), "Test 8.4e FAILED: Should return top admins array");

        // Test 5: 输入清理测试
        console.log("Test 8.5: Input sanitization");
        
        const maliciousAction = '<script>alert("xss")</script>MALICIOUS_ACTION';
        const maliciousDetails = 'Details with <img src=x onerror=alert(1)> attack';
        const maliciousAdmin = '<script>evil()</script>Admin';
        
        const sanitizedLog = await auditLogManager.logAction(maliciousAction, maliciousDetails, maliciousAdmin);
        console.assert(!sanitizedLog.action.includes('<script>'), "Test 8.5a FAILED: Should sanitize action field");
        console.assert(!sanitizedLog.details.includes('<img'), "Test 8.5b FAILED: Should sanitize details field");
        console.assert(!sanitizedLog.adminName.includes('<script>'), "Test 8.5c FAILED: Should sanitize admin name field");

        // Test 6: 日志ID唯一性测试
        console.log("Test 8.6: Log ID uniqueness");
        
        const log1 = await auditLogManager.logAction('TEST_ACTION_1', 'Test 1', 'Admin1');
        const log2 = await auditLogManager.logAction('TEST_ACTION_2', 'Test 2', 'Admin2');
        
        console.assert(log1.id !== log2.id, "Test 8.6a FAILED: Log IDs should be unique");

    } catch (error) {
        console.error("Audit log manager test failed:", error);
        console.assert(false, `Test 8 FAILED with error: ${error.message}`);
    }

    console.log("✅ Audit log manager tests completed.");
    console.groupEnd();
}

// --- 审计日志UI组件测试 ---

async function testAuditLogComponents() {
    console.group("9. Audit Log Components Tests");

    try {
        // 导入审计日志组件
        const { createAuditLogEntry, showAuditLogStatus } = await import('../admin/components.js');

        // Test 1: 审计日志条目创建测试
        console.log("Test 9.1: Audit log entry creation");
        
        const testLogEntry = {
            id: 'test_log_123',
            timestamp: new Date().toISOString(),
            action: 'USER_LOGIN',
            details: '管理员登录系统',
            adminName: 'TestAdmin',
            metadata: {
                ip: '192.168.1.1',
                userAgent: 'Mozilla/5.0'
            }
        };
        
        const logElement = createAuditLogEntry(testLogEntry);
        console.assert(logElement instanceof HTMLElement, "Test 9.1a FAILED: Should create HTML element");
        console.assert(logElement.dataset.logId === testLogEntry.id, "Test 9.1b FAILED: Should set correct log ID");
        console.assert(logElement.querySelector('.audit-log-header'), "Test 9.1c FAILED: Should contain header");
        console.assert(logElement.querySelector('.audit-log-details'), "Test 9.1d FAILED: Should contain details");
        console.assert(logElement.querySelector('.audit-action-badge'), "Test 9.1e FAILED: Should contain action badge");
        console.assert(logElement.querySelector('.audit-timestamp'), "Test 9.1f FAILED: Should contain timestamp");
        console.assert(logElement.querySelector('.audit-admin-name'), "Test 9.1g FAILED: Should contain admin name");

        // Test 2: 元数据展开功能测试
        console.log("Test 9.2: Metadata toggle functionality");
        
        const toggleButton = logElement.querySelector('.audit-toggle-button');
        const metadataDiv = logElement.querySelector('.audit-log-metadata');
        
        console.assert(toggleButton, "Test 9.2a FAILED: Should have toggle button for metadata");
        console.assert(metadataDiv, "Test 9.2b FAILED: Should have metadata container");
        console.assert(metadataDiv.style.display === 'none', "Test 9.2c FAILED: Metadata should be hidden initially");

        // Test 3: 无元数据日志条目测试
        console.log("Test 9.3: Log entry without metadata");
        
        const simpleLogEntry = {
            id: 'simple_log_456',
            timestamp: new Date().toISOString(),
            action: 'SIMPLE_ACTION',
            details: '简单操作',
            adminName: 'SimpleAdmin'
        };
        
        const simpleElement = createAuditLogEntry(simpleLogEntry);
        const simpleToggleButton = simpleElement.querySelector('.audit-toggle-button');
        console.assert(!simpleToggleButton, "Test 9.3a FAILED: Should not have toggle button without metadata");

        // Test 4: 状态消息测试
        console.log("Test 9.4: Status messages");
        
        // 创建测试容器
        const testContainer = document.createElement('div');
        testContainer.id = 'auditLogPanel';
        testContainer.innerHTML = '<div class="audit-log-filters"></div>';
        document.body.appendChild(testContainer);

        showAuditLogStatus('测试成功消息', 'success');
        
        const statusContainer = document.getElementById('auditLogStatus');
        console.assert(statusContainer, "Test 9.4a FAILED: Should create status container");
        console.assert(statusContainer.style.display === 'block', "Test 9.4b FAILED: Status should be visible");
        console.assert(statusContainer.classList.contains('success'), "Test 9.4c FAILED: Should have success class");
        console.assert(statusContainer.textContent.includes('测试成功消息'), "Test 9.4d FAILED: Should display correct message");

        // 测试不同类型的状态消息
        showAuditLogStatus('错误消息', 'error');
        console.assert(statusContainer.classList.contains('error'), "Test 9.4e FAILED: Should update to error class");

        showAuditLogStatus('警告消息', 'warning');
        console.assert(statusContainer.classList.contains('warning'), "Test 9.4f FAILED: Should update to warning class");

        // 清理测试DOM
        document.body.removeChild(testContainer);

        // Test 5: XSS防护测试
        console.log("Test 9.5: XSS protection in components");
        
        const maliciousLogEntry = {
            id: 'malicious_log_789',
            timestamp: new Date().toISOString(),
            action: '<script>alert("xss")</script>MALICIOUS',
            details: 'Details with <img src=x onerror=alert(1)> attack',
            adminName: '<script>evil()</script>MaliciousAdmin',
            metadata: {
                'malicious<script>': 'evil script',
                'safe_key': 'safe value'
            }
        };
        
        const maliciousElement = createAuditLogEntry(maliciousLogEntry);
        const elementHTML = maliciousElement.innerHTML;
        
        console.assert(!elementHTML.includes('<script>'), "Test 9.5a FAILED: Should sanitize script tags");
        console.assert(!elementHTML.includes('onerror='), "Test 9.5b FAILED: Should sanitize event handlers");
        console.assert(!elementHTML.includes('evil()'), "Test 9.5c FAILED: Should sanitize malicious functions");

    } catch (error) {
        console.error("Audit log components test failed:", error);
        console.assert(false, `Test 9 FAILED with error: ${error.message}`);
    }

    console.log("✅ Audit log components tests completed.");
    console.groupEnd();
}

// 暴露到全局以便在控制台手动运行
window.runAdminTests = async function() {
    await runAdminTests();
    
    // 清理模拟函数
    api.loadSystemConfig = originalLoadSystemConfig;
    api.saveSystemConfig = originalSaveSystemConfig;
    api.saveMembers = originalSaveMembers;
    auth.hasPermission = originalHasPermission;
    
    console.log("🧹 Test cleanup completed");
};