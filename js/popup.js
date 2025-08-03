// 智能文本助手 Chrome 插件 - 弹出窗口脚本
// 负责处理弹出窗口的交互逻辑

class PopupManager {
  constructor() {
    this.settings = {};
    this.init();
  }

  // 初始化弹出窗口
  async init() {
    await this.loadSettings();
    this.bindEvents();
    this.updateUI();
  }

  // 加载设置
  async loadSettings() {
    try {
      const result = await chrome.storage.local.get(['settings']);
      this.settings = {
        explainEnabled: true,
        translateEnabled: true,
        ttsEnabled: true,
        polishEnabled: true,
        summaryEnabled: true,
        ...result.settings
      };
    } catch (error) {
      console.error('加载设置失败:', error);
      this.settings = {
        explainEnabled: true,
        translateEnabled: true,
        ttsEnabled: true,
        polishEnabled: true,
        summaryEnabled: true
      };
    }
  }

  // 绑定事件
  bindEvents() {
    // 打开设置按钮
    const openSettingsButton = document.getElementById('openSettings');
    if (openSettingsButton) {
      openSettingsButton.addEventListener('click', () => {
        this.openSettings();
      });
    }

    // 功能开关按钮
    const explainToggle = document.getElementById('explainToggle');
    if (explainToggle) {
      explainToggle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        this.toggleFeature('explainEnabled');
      });
    }

    const translateToggle = document.getElementById('translateToggle');
    if (translateToggle) {
      translateToggle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        this.toggleFeature('translateEnabled');
      });
    }

    const ttsToggle = document.getElementById('ttsToggle');
    if (ttsToggle) {
      ttsToggle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        this.toggleFeature('ttsEnabled');
      });
    }

    const polishToggle = document.getElementById('polishToggle');
    if (polishToggle) {
      polishToggle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        this.toggleFeature('polishEnabled');
      });
    }

    const summaryToggle = document.getElementById('summaryToggle');
    if (summaryToggle) {
      summaryToggle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        this.toggleFeature('summaryEnabled');
      });
    }
  }

  // 更新UI
  updateUI() {
    // 更新状态显示
    const statusElement = document.getElementById('status');
    if (statusElement) {
      statusElement.textContent = '已启用';
      statusElement.className = 'status enabled';
    }

    // 更新功能开关状态
    this.updateToggle('explainToggle', this.settings.explainEnabled);
    this.updateToggle('translateToggle', this.settings.translateEnabled);
    this.updateToggle('ttsToggle', this.settings.ttsEnabled);
    this.updateToggle('polishToggle', this.settings.polishEnabled);
    this.updateToggle('summaryToggle', this.settings.summaryEnabled);
  }

  // 更新开关状态
  updateToggle(elementId, isActive) {
    const element = document.getElementById(elementId);
    if (element) {
      if (isActive) {
        element.classList.add('active');
      } else {
        element.classList.remove('active');
      }
    }
  }

  // 切换功能
  toggleFeature(featureName) {
    // 立即更新设置和UI
    this.settings[featureName] = !this.settings[featureName];
    
    // 根据功能名称获取正确的元素ID
    const elementIdMap = {
      explainEnabled: 'explainToggle',
      translateEnabled: 'translateToggle',
      ttsEnabled: 'ttsToggle',
      polishEnabled: 'polishToggle',
      summaryEnabled: 'summaryToggle'
    };
    
    const elementId = elementIdMap[featureName];
    this.updateToggle(elementId, this.settings[featureName]);
    
    // 异步保存设置（不阻塞UI更新）
    this.saveSettings().catch(error => {
      console.error('保存设置失败:', error);
    });
  }

  // 保存设置
  async saveSettings() {
    try {
      await chrome.storage.local.set({
        settings: this.settings
      });
      
      // 通知其他组件设置已更新
      chrome.runtime.sendMessage({
        action: 'settingsUpdated',
        settings: this.settings
      });
      
    } catch (error) {
      console.error('保存设置失败:', error);
      this.showMessage('保存设置失败', 'error');
    }
  }

  // 打开设置
  openSettings() {
    // 打开设置页面或显示设置对话框
    chrome.tabs.create({
              url: chrome.runtime.getURL('html/settings.html')
    });
  }

  // 显示消息
  showMessage(message, type = 'info') {
    // 创建消息元素
    const messageElement = document.createElement('div');
    messageElement.style.cssText = `
      position: fixed;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      padding: 8px 16px;
      border-radius: 4px;
      font-size: 12px;
      z-index: 1000;
      animation: fadeIn 0.2s ease-in-out;
    `;

    // 根据类型设置样式
    switch (type) {
      case 'success':
        messageElement.style.background = '#E8F5E8';
        messageElement.style.color = '#2E7D32';
        messageElement.style.border = '1px solid #A5D6A7';
        break;
      case 'error':
        messageElement.style.background = '#FFEBEE';
        messageElement.style.color = '#C62828';
        messageElement.style.border = '1px solid #EF9A9A';
        break;
      default:
        messageElement.style.background = '#E3F2FD';
        messageElement.style.color = '#1976D2';
        messageElement.style.border = '1px solid #90CAF9';
    }

    messageElement.textContent = message;
    document.body.appendChild(messageElement);

    // 3秒后自动移除
    setTimeout(() => {
      if (messageElement.parentNode) {
        messageElement.remove();
      }
    }, 3000);
  }
}

// 初始化弹出窗口
document.addEventListener('DOMContentLoaded', () => {
  window.popupManager = new PopupManager();
});

// 监听来自后台脚本的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'showMessage':
      // 显示消息
      if (window.popupManager) {
        window.popupManager.showMessage(request.message, request.type);
      }
      break;
  }
});

// 页面卸载时清理
window.addEventListener('beforeunload', () => {
  // 清理资源
}); 