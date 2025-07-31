// 智能文本助手 Chrome 插件 - 内容脚本
// 负责处理页面交互和显示悬浮框

// 智能文本助手 Chrome 插件 - 内容脚本
// 负责处理页面交互和显示悬浮框

// 配置对象（将在初始化时从config.js加载）
let CONFIG = null;

class TextAssistant {
  constructor() {
    this.floatingElement = null;
    this.selectedText = '';
    this.resultElements = {};
    this.isReading = false;
    this.currentUtterance = null;
    this.config = null; // 将配置作为实例属性
  }

  // 初始化插件
  async init() {
    // 加载配置
    await this.loadConfig();
    
    // 监听文本选择事件
    document.addEventListener('mouseup', this.handleTextSelection.bind(this));
    document.addEventListener('keyup', this.handleTextSelection.bind(this));
    
    // 监听点击事件，用于隐藏悬浮框
    document.addEventListener('click', this.handleDocumentClick.bind(this));
    
    // 监听键盘事件
    document.addEventListener('keydown', this.handleKeydown.bind(this));
    
    // 监听来自后台脚本的消息
    chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));
    
    console.log('智能文本助手已初始化，配置:', this.config);
  }

  // 加载配置
  async loadConfig() {
    try {
      // 直接使用您配置的API Key
      this.config = {
        KIMI_API_URL: "https://api.moonshot.cn/v1/chat/completions",
        KIMI_API_KEY: "sk-1nGQ6z60vfBs7NxDZSVamBs4flEqmWuIKF0QkMeVvsZyBYjg",
        PROMPTS: {
          EXPLAIN: "请详细解释以下文本的含义和背景：",
          TRANSLATE_TO_CN: "请将以下英文文本翻译成中文，保持原意准确：",
          TRANSLATE_TO_EN: "请将以下中文文本翻译成英文，保持原意准确：",
          POLISH: "请对以下文本进行润色和优化，使其更加流畅、准确和易读：",
          SUMMARIZE: "请对以下网页内容进行总结，提取主要观点和关键信息，并按照逻辑结构组织："
        }
      };
      
      console.log('配置加载成功，API Key:', this.config.KIMI_API_KEY.substring(0, 10) + '...');
      console.log('配置对象:', this.config);
    } catch (error) {
      console.error('配置加载失败:', error);
      // 使用默认配置
      this.config = {
        KIMI_API_URL: "https://api.moonshot.cn/v1/chat/completions",
        KIMI_API_KEY: "your_kimi_api_key_here",
        PROMPTS: {
          EXPLAIN: "请详细解释以下文本的含义和背景：",
          TRANSLATE_TO_CN: "请将以下英文文本翻译成中文，保持原意准确：",
          TRANSLATE_TO_EN: "请将以下中文文本翻译成英文，保持原意准确：",
          POLISH: "请对以下文本进行润色和优化，使其更加流畅、准确和易读：",
          SUMMARIZE: "请对以下网页内容进行总结，提取主要观点和关键信息，并按照逻辑结构组织："
        }
      };
    }
  }

  // 处理来自后台脚本的消息
  handleMessage(request, sender, sendResponse) {
    console.log('收到消息:', request);
    
    switch (request.action) {
      case 'toggleEnabled':
        if (request.isEnabled) {
          this.showFloating();
        } else {
          this.hideFloating();
          this.hideAllResults();
        }
        sendResponse({ success: true });
        break;
        
      case 'testApi':
        this.testApiConnection().then(result => {
          sendResponse(result);
        });
        return true; // 保持消息通道开放
        
      case 'getStatus':
        sendResponse({
          success: true,
          isEnabled: this.floatingElement !== null,
          selectedText: this.selectedText
        });
        break;
        
      default:
        sendResponse({ success: false, error: '未知的操作' });
    }
  }

  // 处理文本选择
  handleTextSelection(event) {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    // 如果选中的文本为空或太短，隐藏悬浮框
    if (!selectedText || selectedText.length < 1) {
      this.hideFloating();
      return;
    }
    
    // 如果选中的文本发生变化，更新悬浮框
    if (selectedText !== this.selectedText) {
      this.selectedText = selectedText;
      this.showFloating(event);
    }
  }

  // 处理文档点击事件
  handleDocumentClick(event) {
    // 如果点击的不是插件元素，隐藏所有面板
    if (!event.target.closest('.text-assistant')) {
      this.hideAllResults();
    }
  }

  // 处理键盘事件
  handleKeydown(event) {
    // ESC键关闭所有面板
    if (event.key === 'Escape') {
      this.hideAllResults();
    }
  }

  // 显示悬浮框
  showFloating(event) {
    console.log('显示悬浮框，事件:', event);
    console.log('当前选中文本:', this.selectedText);
    
    // 如果悬浮框已存在，先移除
    if (this.floatingElement) {
      console.log('移除现有悬浮框');
      this.floatingElement.remove();
    }

    // 创建悬浮框
    console.log('创建新的悬浮框');
    this.floatingElement = this.createFloatingElement();
    document.body.appendChild(this.floatingElement);
    console.log('悬浮框已添加到页面:', this.floatingElement);

    // 计算位置
    this.positionFloating(event);
  }

  // 创建悬浮框元素
  createFloatingElement() {
    const container = document.createElement('div');
    container.className = 'text-assistant';
    container.innerHTML = `
      <div class="text-assistant-floating">
        <button class="text-assistant-btn" data-action="explain">
          <span class="text-assistant-btn-icon">🔍</span>
          解释
        </button>
                 <div class="text-assistant-btn-container" style="position: relative; z-index: 10003;">
          <button class="text-assistant-btn" data-action="translate">
            <span class="text-assistant-btn-icon">🌐</span>
            翻译
            <span class="text-assistant-dropdown-arrow">▼</span>
          </button>
          <div class="text-assistant-dropdown" style="display: none;">
            <div class="text-assistant-dropdown-item" data-lang="zh">翻译为中文</div>
            <div class="text-assistant-dropdown-item" data-lang="en">翻译为英文</div>
          </div>
        </div>
        <button class="text-assistant-btn" data-action="read">
          <span class="text-assistant-btn-icon">🔊</span>
          朗读
        </button>
        <button class="text-assistant-btn" data-action="polish">
          <span class="text-assistant-btn-icon">✏️</span>
          润色
        </button>
        <button class="text-assistant-btn" data-action="summarize">
          <span class="text-assistant-btn-icon">📊</span>
          总结
        </button>
      </div>
    `;

    // 绑定事件
    this.bindFloatingEvents(container);
    
    return container;
  }

  // 绑定悬浮框事件
  bindFloatingEvents(container) {
    console.log('绑定悬浮框事件，容器:', container);
    
    // 解释按钮
    const explainBtn = container.querySelector('[data-action="explain"]');
    console.log('解释按钮元素:', explainBtn);
    if (explainBtn) {
      explainBtn.onclick = () => {
        console.log('解释按钮被点击');
        this.handleExplain();
      };
    } else {
      console.error('解释按钮未找到');
    }

    // 翻译按钮
    const translateBtn = container.querySelector('[data-action="translate"]');
    const dropdown = container.querySelector('.text-assistant-dropdown');
    
    console.log('翻译按钮元素:', translateBtn);
    console.log('下拉菜单元素:', dropdown);
    
    if (translateBtn && dropdown) {
      console.log('翻译按钮和下拉菜单找到');
      
      translateBtn.onclick = (e) => {
        e.stopPropagation(); // 阻止事件冒泡
        console.log('翻译按钮被点击');
        const currentDisplay = dropdown.style.display;
        dropdown.style.display = currentDisplay === 'none' || currentDisplay === '' ? 'block' : 'none';
        console.log('下拉菜单显示状态:', dropdown.style.display);
      };

      // 翻译语言选择 - 使用事件委托
      const dropdownItems = dropdown.querySelectorAll('.text-assistant-dropdown-item');
      console.log('找到下拉菜单项数量:', dropdownItems.length);
      
      // 同时保留原有的直接绑定作为备用
      dropdownItems.forEach((item, index) => {
        console.log(`下拉菜单项 ${index}:`, item);
        
        // 直接使用 mousedown 事件，因为 onclick 可能被外部事件干扰
        item.onmousedown = (e) => {
          e.stopPropagation();
          e.preventDefault();
          const lang = e.target.dataset.lang;
          console.log('下拉菜单项点击 (mousedown):', lang);
          dropdown.style.display = 'none';
          this.handleTranslate(lang);
        };
        
        // 保留 onclick 作为备用
        item.onclick = (e) => {
          e.stopPropagation();
          e.preventDefault();
          const lang = e.target.dataset.lang;
          console.log('下拉菜单项点击 (onclick):', lang);
          dropdown.style.display = 'none';
          this.handleTranslate(lang);
        };
      });
    } else {
      console.error('翻译按钮或下拉菜单未找到');
    }

    // 朗读按钮
    const readBtn = container.querySelector('[data-action="read"]');
    console.log('朗读按钮元素:', readBtn);
    if (readBtn) {
      readBtn.onclick = () => {
        console.log('朗读按钮被点击');
        this.handleRead();
      };
    } else {
      console.error('朗读按钮未找到');
    }

    // 润色按钮
    const polishBtn = container.querySelector('[data-action="polish"]');
    console.log('润色按钮元素:', polishBtn);
    if (polishBtn) {
      polishBtn.onclick = () => {
        console.log('润色按钮被点击');
        this.handlePolish();
      };
    } else {
      console.error('润色按钮未找到');
    }

    // 总结按钮
    const summarizeBtn = container.querySelector('[data-action="summarize"]');
    console.log('总结按钮元素:', summarizeBtn);
    if (summarizeBtn) {
      summarizeBtn.onclick = () => {
        console.log('总结按钮被点击');
        this.handleSummarize();
      };
    } else {
      console.error('总结按钮未找到');
    }

    // 点击外部关闭下拉菜单 - 使用 mousedown 事件，避免干扰 click 事件
    document.addEventListener('mousedown', (e) => {
      const btnContainer = container.querySelector('.text-assistant-btn-container');
      if (btnContainer && !btnContainer.contains(e.target)) {
        dropdown.style.display = 'none';
        console.log('点击外部，关闭下拉菜单 (mousedown)');
      }
    });
  }

  // 定位悬浮框
  positionFloating(event) {
    if (!this.floatingElement) return;

    const selection = window.getSelection();
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    // 计算位置：在选中文本上方
    const top = Math.max(10, rect.top - 50);
    const left = Math.max(10, rect.left + (rect.width / 2) - 140);

    this.floatingElement.style.top = top + 'px';
    this.floatingElement.style.left = left + 'px';
  }

  // 隐藏悬浮框
  hideFloating() {
    if (this.floatingElement) {
      this.floatingElement.remove();
      this.floatingElement = null;
    }
  }

  // 隐藏所有结果面板
  hideAllResults() {
    Object.values(this.resultElements).forEach(element => {
      if (element && element.parentNode) {
        element.remove();
      }
    });
    this.resultElements = {};
  }

  // 处理解释功能
  async handleExplain() {
    console.log('开始处理解释功能，选中文本:', this.selectedText);
    
    // 先关闭所有其他结果弹框
    this.hideAllResults();
    
    const resultId = 'explain-result';
    this.showLoadingResult(resultId, '文本解释');
    
    try {
      const response = await this.callKimiAPI('explain', this.selectedText);
      console.log('解释API调用成功，响应:', response);
      this.showExplainResult(resultId, response);
    } catch (error) {
      console.error('解释功能失败:', error);
      this.showErrorResult(resultId, '解释失败：' + error.message);
    }
  }

  // 处理翻译功能
  async handleTranslate(targetLang) {
    console.log('开始处理翻译功能，选中文本:', this.selectedText, '目标语言:', targetLang);
    
    if (!this.selectedText || this.selectedText.trim() === '') {
      console.error('没有选中的文本');
      this.showToast('请先选中要翻译的文本');
      return;
    }
    
    // 先关闭所有其他结果弹框
    this.hideAllResults();
    
    const resultId = 'translate-result';
    console.log('创建翻译结果元素:', resultId);
    this.showLoadingResult(resultId, '文本翻译');
    
    try {
      console.log('准备调用Kimi API进行翻译...');
      const response = await this.callKimiAPI('translate', this.selectedText, targetLang);
      console.log('翻译API调用成功，响应:', response);
      console.log('准备显示翻译结果...');
      this.showTranslateResult(resultId, response, targetLang);
    } catch (error) {
      console.error('翻译功能失败:', error);
      this.showErrorResult(resultId, '翻译失败：' + error.message);
    }
  }

  // 处理朗读功能
  handleRead() {
    if (this.isReading) {
      this.stopReading();
    } else {
      this.startReading();
    }
  }

  // 开始朗读
  startReading(text = null) {
    const textToRead = text || this.selectedText;
    if (!textToRead) return;

    // 停止当前朗读
    if (this.isReading) {
      this.stopReading();
    }

    // 检测语言（简单的中文检测）
    const isChinese = /[\u4e00-\u9fff]/.test(textToRead);
    const lang = isChinese ? 'zh-CN' : 'en-US';

    this.currentUtterance = new SpeechSynthesisUtterance(textToRead);
    this.currentUtterance.lang = lang;
    this.currentUtterance.rate = 0.9;
    this.currentUtterance.pitch = 1;

    this.currentUtterance.onstart = () => {
      this.isReading = true;
      this.updateReadButton(true);
    };

    this.currentUtterance.onend = () => {
      this.isReading = false;
      this.updateReadButton(false);
    };

    speechSynthesis.speak(this.currentUtterance);
  }

  // 停止朗读
  stopReading() {
    if (this.currentUtterance) {
      speechSynthesis.cancel();
      this.isReading = false;
      this.updateReadButton(false);
    }
  }

  // 更新朗读按钮状态
  updateReadButton(isReading) {
    const readBtn = this.floatingElement?.querySelector('[data-action="read"]');
    if (readBtn) {
      readBtn.classList.toggle('active', isReading);
      const icon = readBtn.querySelector('.text-assistant-btn-icon');
      icon.textContent = isReading ? '⏹️' : '🔊';
    }
  }

  // 处理润色功能
  async handlePolish() {
    console.log('开始处理润色功能，选中文本:', this.selectedText);
    
    // 先关闭所有其他结果弹框
    this.hideAllResults();
    
    const resultId = 'polish-result';
    this.showLoadingResult(resultId, '文本润色');
    
    try {
      const response = await this.callKimiAPI('polish', this.selectedText);
      console.log('润色API调用成功，响应:', response);
      this.showPolishResult(resultId, response);
    } catch (error) {
      console.error('润色功能失败:', error);
      this.showErrorResult(resultId, '润色失败：' + error.message);
    }
  }

  // 处理总结功能
  async handleSummarize() {
    console.log('开始处理总结功能');
    
    // 获取当前页面内容
    const pageContent = this.getPageContent();
    const currentUrl = window.location.href;
    
    // 先关闭所有其他结果弹框
    this.hideAllResults();
    
    const resultId = 'summarize-result';
    this.showLoadingResult(resultId, '网页总结');
    
    try {
      const response = await this.callKimiAPI('summarize', pageContent);
      console.log('总结API调用成功，响应:', response);
      this.showSummarizeResult(resultId, response, currentUrl);
    } catch (error) {
      console.error('总结功能失败:', error);
      this.showErrorResult(resultId, '总结失败：' + error.message);
    }
  }

  // 获取页面内容
  getPageContent() {
    // 获取页面标题
    const title = document.title || '';
    
    // 获取页面主要内容（优先获取article、main、content等标签）
    let content = '';
    const contentSelectors = [
      'article',
      'main',
      '[role="main"]',
      '.content',
      '.main-content',
      '.post-content',
      '.article-content',
      '#content',
      '#main'
    ];
    
    for (const selector of contentSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        content = element.textContent || element.innerText || '';
        break;
      }
    }
    
    // 如果没有找到主要内容，使用body内容
    if (!content) {
      content = document.body.textContent || document.body.innerText || '';
    }
    
    // 清理内容（移除多余空白字符）
    content = content.replace(/\s+/g, ' ').trim();
    
    // 限制内容长度，避免API请求过大
    const maxLength = 8000;
    if (content.length > maxLength) {
      content = content.substring(0, maxLength) + '...';
    }
    
    return `页面标题：${title}\n\n页面内容：${content}`;
  }

  // 调用Kimi API
  async callKimiAPI(action, text, targetLang = null) {
    if (!this.config) {
      throw new Error('配置未加载');
    }
    
    // 检查API Key是否已配置
    if (!this.config.KIMI_API_KEY || this.config.KIMI_API_KEY === 'your_kimi_api_key_here' || this.config.KIMI_API_KEY.length < 10) {
      throw new Error('请先在config.js中配置您的Kimi API Key');
    }
    
    // 构建请求数据
    let prompt = '';
    switch (action) {
      case 'explain':
        prompt = this.config.PROMPTS.EXPLAIN + text;
        break;
      case 'translate':
        const translatePrompt = targetLang === 'zh' ? 
          this.config.PROMPTS.TRANSLATE_TO_CN : this.config.PROMPTS.TRANSLATE_TO_EN;
        prompt = translatePrompt + text;
        break;
      case 'polish':
        prompt = this.config.PROMPTS.POLISH + text;
        break;
      case 'summarize':
        prompt = this.config.PROMPTS.SUMMARIZE + text;
        break;
      default:
        throw new Error('未知的操作类型');
    }

    const requestData = {
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      model: "moonshot-v1-8k",
      stream: false
    };

    console.log('发送API请求:', {
      action,
      text: text.substring(0, 50) + '...',
      targetLang,
      prompt: prompt.substring(0, 100) + '...'
    });

    // 发送请求
    const response = await fetch(this.config.KIMI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.KIMI_API_KEY}`
      },
      body: JSON.stringify(requestData)
    });

    console.log('API响应状态:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API错误响应:', errorText);
      throw new Error(`API请求失败: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('API响应数据:', data);

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('API响应格式错误:', data);
      throw new Error('API响应格式错误');
    }

    const content = data.choices[0].message.content;
    console.log('API返回内容:', content);
    
    return content;
  }

  // 测试API连接
  async testApiConnection() {
    try {
      if (!this.config) {
        return { success: false, error: '配置未加载' };
      }
      
      if (!this.config.KIMI_API_KEY || this.config.KIMI_API_KEY === 'your_kimi_api_key_here' || this.config.KIMI_API_KEY.length < 10) {
        return { success: false, error: '请先配置Kimi API Key' };
      }
      
      // 发送测试请求
      const response = await this.callKimiAPI('explain', '测试');
      return { success: true, message: 'API连接成功' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // 显示加载结果
  showLoadingResult(resultId, title) {
    console.log('开始显示加载结果:', resultId, title);
    
    // 先隐藏已存在的结果
    this.hideResult(resultId);
    
    const resultElement = document.createElement('div');
    resultElement.className = 'text-assistant-result';
    resultElement.id = resultId;
    resultElement.innerHTML = `
      <div class="text-assistant-result-header">
        ${title}
        <button class="text-assistant-result-close">×</button>
      </div>
      <div class="text-assistant-loading">
        <div class="text-assistant-spinner"></div>
        处理中...
      </div>
    `;

    // 将结果面板添加到悬浮工具栏中（通过positionResult函数）
    this.positionResult(resultElement);
    this.bindResultEvents(resultElement);
    this.resultElements[resultId] = resultElement;
    
    console.log('显示加载结果完成:', resultId, resultElement);
    console.log('当前结果元素列表:', Object.keys(this.resultElements));
  }

  // 显示解释结果
  showExplainResult(resultId, content) {
    const resultElement = this.resultElements[resultId];
    if (!resultElement) {
      console.error('结果元素不存在:', resultId);
      return;
    }

    console.log('显示解释结果:', content);

    resultElement.innerHTML = `
      <div class="text-assistant-result-header">
        文本解释
        <button class="text-assistant-result-close">×</button>
      </div>
      <div class="text-assistant-result-content">
        <div class="text-assistant-label">原文：</div>
        <div class="text-assistant-text">${this.selectedText}</div>
        <div class="text-assistant-label">解释：</div>
        <div class="text-assistant-text">${content}</div>
        <div class="text-assistant-actions">
          <button class="text-assistant-action-btn secondary" data-action="copy-original">复制原文</button>
          <button class="text-assistant-action-btn secondary" data-action="copy-explanation">复制解释</button>
          <button class="text-assistant-action-btn secondary" data-action="read-original">朗读原文</button>
          <button class="text-assistant-action-btn secondary" data-action="read-explanation">朗读解释</button>
        </div>
      </div>
    `;

    this.bindExplainEvents(resultElement, content);
    this.bindResultEvents(resultElement);
  }

  // 显示翻译结果
  showTranslateResult(resultId, content, targetLang) {
    console.log('开始显示翻译结果:', resultId, content, targetLang);
    console.log('当前结果元素列表:', Object.keys(this.resultElements));
    
    let resultElement = this.resultElements[resultId];
    if (!resultElement) {
      console.error('结果元素不存在:', resultId);
      console.error('可用的结果元素:', Object.keys(this.resultElements));
      
      // 尝试重新创建结果元素
      console.log('尝试重新创建结果元素...');
      this.showLoadingResult(resultId, '文本翻译');
      resultElement = this.resultElements[resultId];
      if (!resultElement) {
        console.error('重新创建结果元素失败');
        return;
      }
    }

    const langText = targetLang === 'zh' ? '中文' : '英文';
    const reverseLang = targetLang === 'zh' ? 'en' : 'zh';
    const reverseLangText = targetLang === 'zh' ? '英文' : '中文';
    
    console.log('显示翻译结果:', content, '目标语言:', langText);
    
    resultElement.innerHTML = `
      <div class="text-assistant-result-header">
        文本翻译
        <button class="text-assistant-result-close">×</button>
      </div>
      <div class="text-assistant-result-content">
        <div class="text-assistant-label">原文：</div>
        <div class="text-assistant-text">${this.selectedText}</div>
        <div class="text-assistant-label">译文（${langText}）：</div>
        <div class="text-assistant-text">${content}</div>
        <div class="text-assistant-actions">
          <button class="text-assistant-action-btn secondary" data-action="copy-original">复制原文</button>
          <button class="text-assistant-action-btn secondary" data-action="copy-translation">复制译文</button>
          <button class="text-assistant-action-btn secondary" data-action="read-original">朗读原文</button>
          <button class="text-assistant-action-btn secondary" data-action="read-translation">朗读译文</button>
          <button class="text-assistant-action-btn" data-action="reverse-translate">反向翻译</button>
        </div>
      </div>
    `;

    this.bindTranslateEvents(resultElement, content, reverseLang, reverseLangText);
    this.bindResultEvents(resultElement);
    
    console.log('翻译结果显示完成');
  }

  // 显示润色结果
  showPolishResult(resultId, content) {
    const resultElement = this.resultElements[resultId];
    if (!resultElement) {
      console.error('结果元素不存在:', resultId);
      return;
    }

    console.log('显示润色结果:', content);

    resultElement.innerHTML = `
      <div class="text-assistant-result-header">
        文本润色
        <button class="text-assistant-result-close">×</button>
      </div>
      <div class="text-assistant-result-content">
        <div class="text-assistant-label">原文：</div>
        <div class="text-assistant-text">${this.selectedText}</div>
        <div class="text-assistant-label">润色结果：</div>
        <div class="text-assistant-text">
          <textarea class="text-assistant-edit-area">${content}</textarea>
        </div>
        <div class="text-assistant-actions">
          <button class="text-assistant-action-btn secondary" data-action="copy">复制结果</button>
          <button class="text-assistant-action-btn" data-action="replace">替换原文</button>
        </div>
      </div>
    `;

    this.bindPolishEvents(resultElement);
    this.bindResultEvents(resultElement);
  }

  // 显示总结结果
  showSummarizeResult(resultId, content, url) {
    const resultElement = this.resultElements[resultId];
    if (!resultElement) {
      console.error('结果元素不存在:', resultId);
      return;
    }

    console.log('显示总结结果:', content);

    resultElement.innerHTML = `
      <div class="text-assistant-result-header">
        网页总结
        <button class="text-assistant-result-close">×</button>
      </div>
      <div class="text-assistant-result-content">
        <div class="text-assistant-label">网页地址：</div>
        <div class="text-assistant-text" style="font-size: 12px; color: #666;">${url}</div>
        <div class="text-assistant-label">AI 总结：</div>
        <div class="text-assistant-text">${content}</div>
        <div class="text-assistant-actions">
          <button class="text-assistant-action-btn secondary" data-action="copy-summary">复制总结</button>
          <button class="text-assistant-action-btn secondary" data-action="read-summary">朗读总结</button>
          <button class="text-assistant-action-btn" data-action="view-mindmap">查看思维导图</button>
        </div>
      </div>
    `;

    this.bindSummarizeEvents(resultElement, content, url);
    this.bindResultEvents(resultElement);
  }

  // 显示错误结果
  showErrorResult(resultId, errorMessage) {
    const resultElement = this.resultElements[resultId];
    if (!resultElement) {
      console.error('结果元素不存在:', resultId);
      return;
    }

    console.error('显示错误结果:', errorMessage);

    resultElement.innerHTML = `
      <div class="text-assistant-result-header">
        错误
        <button class="text-assistant-result-close">×</button>
      </div>
      <div class="text-assistant-error">${errorMessage}</div>
    `;

    this.bindResultEvents(resultElement);
  }

  // 绑定润色结果事件
  bindPolishEvents(resultElement) {
    // 复制结果按钮
    resultElement.querySelector('[data-action="copy"]').addEventListener('click', () => {
      const textarea = resultElement.querySelector('.text-assistant-edit-area');
      navigator.clipboard.writeText(textarea.value).then(() => {
        this.showToast('已复制到剪贴板');
      });
    });

    // 替换原文按钮
    resultElement.querySelector('[data-action="replace"]').addEventListener('click', () => {
      const textarea = resultElement.querySelector('.text-assistant-edit-area');
      const newText = textarea.value;
      
      // 替换选中的文本
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(newText));
        this.showToast('已替换原文');
      }
    });
  }

  // 绑定总结结果事件
  bindSummarizeEvents(resultElement, content, url) {
    // 复制总结按钮
    resultElement.querySelector('[data-action="copy-summary"]').addEventListener('click', () => {
      navigator.clipboard.writeText(content).then(() => {
        this.showToast('已复制总结到剪贴板');
      });
    });

    // 朗读总结按钮
    resultElement.querySelector('[data-action="read-summary"]').addEventListener('click', () => {
      this.startReading(content);
    });

    // 查看思维导图按钮
    resultElement.querySelector('[data-action="view-mindmap"]').addEventListener('click', () => {
      this.openMindMap(content, url);
    });
  }

  // 打开思维导图页面
  openMindMap(content, url) {
    // 编码参数
    const encodedContent = encodeURIComponent(content);
    const encodedUrl = encodeURIComponent(url);
    
    // 构建思维导图页面URL - 使用 X6 版本
            const mindmapUrl = chrome.runtime.getURL('html/mindmap-x6.html') + 
                      `?url=${encodedUrl}&summary=${encodedContent}`;
    
    // 打开新窗口
    window.open(mindmapUrl, '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
  }

  // 绑定结果面板事件
  bindResultEvents(resultElement) {
    // 关闭按钮
    resultElement.querySelector('.text-assistant-result-close').addEventListener('click', () => {
      this.hideResult(resultElement.id);
    });
  }

  // 绑定翻译结果事件
  bindTranslateEvents(resultElement, content, reverseLang, reverseLangText) {
    // 复制原文按钮
    resultElement.querySelector('[data-action="copy-original"]').addEventListener('click', () => {
      navigator.clipboard.writeText(this.selectedText).then(() => {
        this.showToast('已复制原文到剪贴板');
      });
    });

    // 复制译文按钮
    resultElement.querySelector('[data-action="copy-translation"]').addEventListener('click', () => {
      navigator.clipboard.writeText(content).then(() => {
        this.showToast('已复制译文到剪贴板');
      });
    });

    // 朗读原文按钮
    resultElement.querySelector('[data-action="read-original"]').addEventListener('click', () => {
      this.startReading(this.selectedText);
    });

    // 朗读译文按钮
    resultElement.querySelector('[data-action="read-translation"]').addEventListener('click', () => {
      console.log('朗读译文按钮点击');
      this.startReading(content);
    });

    // 反向翻译按钮
    resultElement.querySelector('[data-action="reverse-translate"]').addEventListener('click', () => {
      console.log('反向翻译按钮点击');
      this.handleTranslate(reverseLang);
    });
  }

  // 绑定解释结果事件
  bindExplainEvents(resultElement, content) {
    // 复制原文按钮
    resultElement.querySelector('[data-action="copy-original"]').addEventListener('click', () => {
      navigator.clipboard.writeText(this.selectedText).then(() => {
        this.showToast('已复制原文到剪贴板');
      });
    });

    // 复制解释按钮
    resultElement.querySelector('[data-action="copy-explanation"]').addEventListener('click', () => {
      navigator.clipboard.writeText(content).then(() => {
        this.showToast('已复制解释到剪贴板');
      });
    });

    // 朗读原文按钮
    resultElement.querySelector('[data-action="read-original"]').addEventListener('click', () => {
      this.startReading(this.selectedText);
    });

    // 朗读解释按钮
    resultElement.querySelector('[data-action="read-explanation"]').addEventListener('click', () => {
      this.startReading(content);
    });
  }

  // 定位结果面板
  positionResult(resultElement) {
    if (!this.floatingElement) return;

    // 将结果面板添加到悬浮工具栏容器中，而不是body中
    // 这样结果面板就会相对于悬浮工具栏定位
    this.floatingElement.appendChild(resultElement);
    
    // 设置相对定位样式
    resultElement.style.position = 'absolute';
    resultElement.style.top = '100%';
    resultElement.style.left = '0';
    resultElement.style.marginTop = '8px';
    
    console.log('结果面板已定位到悬浮工具栏');
  }

  // 隐藏结果面板
  hideResult(resultId) {
    const element = this.resultElements[resultId];
    if (element && element.parentNode) {
      element.remove();
      delete this.resultElements[resultId];
    }
  }

  // 显示提示信息
  showToast(message) {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #4A90E2;
      color: white;
      padding: 8px 16px;
      border-radius: 4px;
      font-size: 12px;
      z-index: 10002;
      animation: fadeIn 0.2s ease-in-out;
    `;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.remove();
    }, 2000);
  }
}



// 初始化插件
let textAssistant = null;

// 等待页面加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', async () => {
    textAssistant = new TextAssistant();
    await textAssistant.init();
  });
} else {
  textAssistant = new TextAssistant();
  textAssistant.init();
} 