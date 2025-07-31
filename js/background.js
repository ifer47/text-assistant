// 智能文本助手 Chrome 插件 - 后台脚本
// 负责处理插件的后台逻辑和消息通信

// 插件安装时的初始化
chrome.runtime.onInstalled.addListener((details) => {
  console.log('智能文本助手插件已安装');
  
  // 设置默认配置
  chrome.storage.local.set({
    isEnabled: true,
    settings: {
      autoHide: true,
      showIcons: true,
      language: 'zh'
    }
  });
});

// 监听来自内容脚本的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('收到消息:', request);
  
  switch (request.action) {
    case 'getConfig':
      // 返回配置信息
      sendResponse({
        success: true,
        config: {
          isEnabled: true,
          settings: {
            autoHide: true,
            showIcons: true,
            language: 'zh'
          }
        }
      });
      break;
      
    case 'updateSettings':
      // 更新设置
      chrome.storage.local.set({
        settings: request.settings
      }, () => {
        sendResponse({ success: true });
      });
      return true; // 保持消息通道开放
      
    case 'toggleEnabled':
      // 切换插件启用状态
      chrome.storage.local.get(['isEnabled'], (result) => {
        const newState = !result.isEnabled;
        chrome.storage.local.set({ isEnabled: newState }, () => {
          sendResponse({ success: true, isEnabled: newState });
        });
      });
      return true;
      
    default:
      sendResponse({ success: false, error: '未知的操作' });
  }
});

// 处理标签页更新
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // 检查是否应该在此页面启用插件
    chrome.storage.local.get(['isEnabled'], (result) => {
      if (result.isEnabled !== false) {
        // 注入内容脚本
        chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ['config.js', 'content.js']
        }).catch((error) => {
          console.log('脚本注入失败:', error);
        });
      }
    });
  }
});

// 处理插件图标点击
chrome.action.onClicked.addListener((tab) => {
  // 打开设置页面或切换插件状态
  chrome.tabs.sendMessage(tab.id, {
    action: 'toggleAssistant'
  }).catch((error) => {
    console.log('发送消息失败:', error);
  });
});

// 处理快捷键
chrome.commands.onCommand.addListener((command) => {
  console.log('快捷键触发:', command);
  
  // 获取当前活动标签页
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      switch (command) {
        case 'toggle-assistant':
          // 切换插件状态
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'toggleAssistant'
          });
          break;
          
        case 'explain-text':
          // 解释选中的文本
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'explainSelected'
          });
          break;
          
        case 'translate-text':
          // 翻译选中的文本
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'translateSelected'
          });
          break;
      }
    }
  });
});

// 错误处理
chrome.runtime.onSuspend.addListener(() => {
  console.log('插件已暂停');
});

// 开发模式下的热重载支持
if (chrome.runtime.getManifest().version.includes('dev')) {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'reload') {
      chrome.runtime.reload();
      sendResponse({ success: true });
    }
  });
} 