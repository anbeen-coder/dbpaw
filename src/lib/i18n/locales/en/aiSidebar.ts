export const aiSidebar = {
  title: "AI Assistant",
  newChat: "New chat",
  startNewChat: "Start new chat",
  status: {
    requestSent: "Request sent ({{model}}), waiting for first token...",
    receiving: "Receiving response...",
    finalizing: "Finalizing response...",
    sending: "Sending request...",
  },
  errors: {
    loadConversation: "Failed to load conversation",
    requestFailed: "AI request failed",
    providerMissing:
      "Please configure and select an AI provider in Settings.",
    sendFailed: "Failed to send AI message",
    deleteConversation: "Failed to delete conversation",
  },
} as const;

export const chatComposer = {
  inputPlaceholder: "Describe SQL to generate or optimize...",
  selectProvider: "Select AI provider",
  send: "Send",
  sendMessage: "Send message",
} as const;
