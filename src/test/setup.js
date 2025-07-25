// 测试环境设置文件
// 为Netlify环境的数据迁移测试提供完整的浏览器API模拟

import { vi } from 'vitest'

// 模拟环境变量
global.ENV = {
  DEV: false,
  PROD: true
}

// 扩展 JSDOM 的 localStorage 实现
const localStorageMock = {
  data: {},
  getItem(key) {
    return this.data[key] || null
  },
  setItem(key, value) {
    this.data[key] = String(value)
  },
  removeItem(key) {
    delete this.data[key]
  },
  clear() {
    this.data = {}
  },
  get length() {
    return Object.keys(this.data).length
  },
  key(index) {
    const keys = Object.keys(this.data)
    return keys[index] || null
  }
}

// 模拟 Blob API（Netlify环境可能需要）
global.Blob = class Blob {
  constructor(content, options = {}) {
    this.content = content
    this.type = options.type || ''
    this.size = JSON.stringify(content).length
  }
}

// 模拟 URL API
global.URL = {
  createObjectURL: vi.fn(() => 'blob:mock-url'),
  revokeObjectURL: vi.fn()
}

// 模拟 FileReader API
global.FileReader = class FileReader {
  constructor() {
    this.result = null
    this.onload = null
    this.onerror = null
  }
  
  readAsText(file) {
    setTimeout(() => {
      try {
        this.result = file.content || '{"test": "data"}'
        if (this.onload) {
          this.onload({ target: { result: this.result } })
        }
      } catch (error) {
        if (this.onerror) {
          this.onerror(error)
        }
      }
    }, 10)
  }
}

// 模拟 alert, confirm, prompt
global.alert = vi.fn()
global.confirm = vi.fn(() => true)
global.prompt = vi.fn(() => 'test input')

// 增强 localStorage 模拟
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true
})

// 模拟 navigator 对象
Object.defineProperty(window, 'navigator', {
  value: {
    userAgent: 'Mozilla/5.0 (Netlify Test Environment)'
  },
  writable: true
})

// 模拟定时器函数确保测试环境稳定
vi.useFakeTimers()

// 模拟 console 方法以便在测试中捕获日志
const originalConsole = { ...console }
global.console = {
  ...console,
  log: vi.fn(originalConsole.log),
  warn: vi.fn(originalConsole.warn),
  error: vi.fn(originalConsole.error),
  info: vi.fn(originalConsole.info),
  debug: vi.fn(originalConsole.debug)
}

// 测试后清理
afterEach(() => {
  // 清理 localStorage
  localStorageMock.clear()
  
  // 重置所有模拟函数
  vi.clearAllMocks()
  
  // 清理定时器
  vi.clearAllTimers()
})

// 全局测试辅助函数
global.testHelpers = {
  // 创建模拟的成员数据
  createMockMember: (overrides = {}) => ({
    id: '1',
    name: '测试用户',
    studentId: '2023001',
    email: 'test@example.com',
    status: 'approved',
    joinDate: '2023-01-01T00:00:00.000Z',
    readingPreferences: {
      genres: ['fiction'],
      favoriteBooks: ['《测试书籍》'],
      readingHabits: {
        dailyTime: 60,
        preferredFormat: 'paper',
        readingSpeed: 'medium'
      }
    },
    matchingHistory: [],
    ...overrides
  }),
  
  // 创建模拟的备份数据
  createMockBackup: () => ({
    version: '1.0.0',
    backupDate: new Date().toISOString(),
    members: [testHelpers.createMockMember()],
    systemConfig: {}
  }),
  
  // 设置localStorage中的测试数据
  setupTestData: (members = []) => {
    localStorageMock.setItem('members', JSON.stringify(members))
    localStorageMock.setItem('appVersion', '1.0.0')
  },
  
  // 等待异步操作完成
  waitForAsync: () => new Promise(resolve => setTimeout(resolve, 0))
}

console.log('🧪 测试环境设置完成 - Netlify兼容模式')