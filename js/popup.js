// 智能文本助手 Chrome 插件 - 弹出窗口脚本
// 负责处理弹出窗口的交互逻辑

class PopupManager {
  constructor() {
    this.init();
  }

  // 初始化弹出窗口
  init() {
    this.bindEvents();
    this.updateUI();
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
  }

  // 更新UI
  updateUI() {
    // 更新状态显示
    const statusElement = document.getElementById('status');
    if (statusElement) {
      statusElement.textContent = '已启用';
      statusElement.className = 'status enabled';
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
  new PopupManager();
});

// 监听来自后台脚本的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('弹出窗口收到消息:', request);
  
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
  console.log('弹出窗口即将关闭');
}); 