// 智能文本助手 - 设置页面脚本
class SettingsManager {
    constructor() {
        this.settings = {};
        this.init();
    }

    // 初始化设置页面
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
                apiKey: '',
                apiEndpoint: 'https://api.moonshot.cn/v1/chat/completions',
                ...result.settings
            };
        } catch (error) {
            console.error('加载设置失败:', error);
            this.settings = {
                apiKey: '',
                apiEndpoint: 'https://api.moonshot.cn/v1/chat/completions'
            };
        }
    }

    // 绑定事件
    bindEvents() {
        // API 配置
        document.getElementById('apiKey').addEventListener('input', (e) => {
            this.settings.apiKey = e.target.value;
        });

        document.getElementById('apiEndpoint').addEventListener('input', (e) => {
            this.settings.apiEndpoint = e.target.value;
        });

        // 按钮事件
        document.getElementById('testApi').addEventListener('click', () => {
            this.testApiConnection();
        });

        document.getElementById('saveSettings').addEventListener('click', () => {
            this.saveSettings();
        });
    }

    // 更新UI
    updateUI() {
        // 更新输入框
        document.getElementById('apiKey').value = this.settings.apiKey || '';
        document.getElementById('apiEndpoint').value = this.settings.apiEndpoint || '';
    }

    // 更新开关状态
    updateToggle(elementId, isActive) {
        const element = document.getElementById(elementId);
        if (isActive) {
            element.classList.add('active');
        } else {
            element.classList.remove('active');
        }
    }

    // 切换设置
    async toggleSetting(settingName) {
        this.settings[settingName] = !this.settings[settingName];
        this.updateToggle(settingName + 'Toggle', this.settings[settingName]);
        
        // 立即保存设置
        await this.saveSettings();
    }

    // 保存设置
    async saveSettings() {
        try {
            await chrome.storage.local.set({
                settings: this.settings
            });
            
            this.showMessage('设置已保存', 'success');
            
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

    // 测试API连接
    async testApiConnection() {
        if (!this.settings.apiKey) {
            this.showMessage('请先输入 API Key', 'error');
            return;
        }

        try {
            this.showMessage('正在测试连接...', 'info');
            
            const response = await fetch(this.settings.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.settings.apiKey}`
                },
                body: JSON.stringify({
                    model: 'moonshot-v1-8k',
                    messages: [
                        {
                            role: 'user',
                            content: 'Hello'
                        }
                    ],
                    max_tokens: 10
                })
            });

            if (response.ok) {
                this.showMessage('API 连接成功！', 'success');
            } else {
                const errorData = await response.json();
                this.showMessage(`API 连接失败: ${errorData.error?.message || '未知错误'}`, 'error');
            }
        } catch (error) {
            console.error('API 测试失败:', error);
            this.showMessage('API 连接失败: ' + error.message, 'error');
        }
    }

    // 显示消息
    showMessage(message, type = 'info') {
        const statusElement = document.getElementById('statusMessage');
        
        statusElement.textContent = message;
        statusElement.className = 'status-message';
        
        switch (type) {
            case 'success':
                statusElement.classList.add('status-success');
                break;
            case 'error':
                statusElement.classList.add('status-error');
                break;
        }

        // 3秒后自动隐藏
        setTimeout(() => {
            statusElement.textContent = '';
            statusElement.className = '';
        }, 3000);
    }
}

// 初始化设置页面
document.addEventListener('DOMContentLoaded', () => {
    new SettingsManager();
}); 