import { invoke } from "./core";
import type {
  AIChatRequest,
  AIChatResponse,
  AIConversation,
  AIConversationDetail,
  AIProviderConfig,
  AIProviderForm,
} from "../types";

export const aiApi = {
  ai: {
    providers: {
      list: () => invoke<AIProviderConfig[]>("ai_list_providers"),
      create: (config: AIProviderForm) =>
        invoke<AIProviderConfig>("ai_create_provider", { config }),
      update: (id: number, config: AIProviderForm) =>
        invoke<AIProviderConfig>("ai_update_provider", { id, config }),
      delete: (id: number) => invoke<void>("ai_delete_provider", { id }),
      setDefault: (id: number) =>
        invoke<void>("ai_set_default_provider", { id }),
      clearApiKey: (providerType: string) =>
        invoke<void>("ai_clear_provider_api_key", {
          provider_type: providerType,
        }),
    },
    chat: {
      start: (request: AIChatRequest) =>
        invoke<AIChatResponse>("ai_chat_start", { request }),
      continue: (request: AIChatRequest) =>
        invoke<AIChatResponse>("ai_chat_continue", { request }),
    },
    conversations: {
      list: (filters?: { connectionId?: number; database?: string }) =>
        invoke<AIConversation[]>("ai_list_conversations", {
          connectionId: filters?.connectionId,
          database: filters?.database,
        }),
      get: (conversationId: number) =>
        invoke<AIConversationDetail>("ai_get_conversation", {
          conversationId,
        }),
      delete: (conversationId: number) =>
        invoke<void>("ai_delete_conversation", { conversationId }),
    },
  },
};
