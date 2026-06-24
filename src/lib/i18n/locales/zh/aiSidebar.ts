export const aiSidebar = {
  title: "AI 助手",
  newChat: "新对话",
  startNewChat: "开始新对话",
  status: {
    requestSent: "请求已发送（{{model}}），等待首个 token...",
    receiving: "接收响应中...",
    finalizing: "整理响应中...",
    sending: "发送请求中...",
  },
  errors: {
    loadConversation: "加载对话失败",
    requestFailed: "AI 请求失败",
    providerMissing: "请先在设置中配置并选择 AI 提供商。",
    sendFailed: "发送 AI 消息失败",
    deleteConversation: "删除对话失败",
  },
} as const;

export const chatComposer = {
  inputPlaceholder: "描述要生成或优化的 SQL...",
  selectProvider: "选择 AI 提供商",
  send: "发送",
  sendMessage: "发送消息",
} as const;
