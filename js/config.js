// Kimi API 配置文件
// 请在此处填写您的 Kimi API 配置信息

const CONFIG = {
  // Kimi API 基础URL
  KIMI_API_URL: "https://api.moonshot.cn/v1/chat/completions",
  
  // Kimi API Key - 请替换为您的实际API Key
  KIMI_API_KEY: "",
  
  // 请求头配置
  HEADERS: {
    "Content-Type": "application/json",
    "Authorization": "Bearer " // 这里会自动替换为实际的API Key
  },
  
  // 功能提示词配置
  PROMPTS: {
    // 解释功能提示词
    EXPLAIN: "请详细解释以下文本的含义和背景：",
    
    // 翻译功能提示词
    TRANSLATE_TO_CN: "请将以下英文文本翻译成中文，保持原意准确：",
    TRANSLATE_TO_EN: "请将以下中文文本翻译成英文，保持原意准确：",
    
    // 润色功能提示词
    POLISH: "请对以下文本进行润色和优化，使其更加流畅、准确和易读："
  }
};

// 导出配置
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
} else {
  window.CONFIG = CONFIG;
} 