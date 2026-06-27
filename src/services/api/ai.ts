import { invoke } from "./core";
import { COMMANDS } from "@/services/commands";
import type {
  AIChatRequest,
  AIProviderForm,
} from "../types";

export const aiApi = {
  ai: {
    providers: {
      list: () => invoke(COMMANDS.AI_LIST_PROVIDERS, {}),
      create: (config: AIProviderForm) =>
        invoke(COMMANDS.AI_CREATE_PROVIDER, { config }),
      update: (id: number, config: AIProviderForm) =>
        invoke(COMMANDS.AI_UPDATE_PROVIDER, { id, config }),
      delete: (id: number) => invoke(COMMANDS.AI_DELETE_PROVIDER, { id }),
      setDefault: (id: number) =>
        invoke(COMMANDS.AI_SET_DEFAULT_PROVIDER, { id }),
      clearApiKey: (providerType: string) =>
        invoke(COMMANDS.AI_CLEAR_PROVIDER_API_KEY, {
          providerType,
        }),
    },
    chat: {
      start: (request: AIChatRequest) =>
        invoke(COMMANDS.AI_CHAT_START, { request }),
      continue: (request: AIChatRequest) =>
        invoke(COMMANDS.AI_CHAT_CONTINUE, { request }),
    },
    conversations: {
      list: (filters?: { connectionId?: number; database?: string }) =>
        invoke(COMMANDS.AI_LIST_CONVERSATIONS, {
          connectionId: filters?.connectionId,
          database: filters?.database,
        }),
      get: (conversationId: number) =>
        invoke(COMMANDS.AI_GET_CONVERSATION, {
          conversationId,
        }),
      delete: (conversationId: number) =>
        invoke(COMMANDS.AI_DELETE_CONVERSATION, { conversationId }),
    },
  },
};
