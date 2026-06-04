export type AIProviderType = string;

export interface AIProviderConfig {
  id: number;
  name: string;
  providerType: AIProviderType;
  baseUrl: string;
  model: string;
  hasApiKey: boolean;
  isDefault: boolean;
  enabled: boolean;
  extraJson?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AIProviderForm {
  name: string;
  providerType?: AIProviderType;
  baseUrl: string;
  model: string;
  apiKey?: string;
  isDefault?: boolean;
  enabled?: boolean;
  extraJson?: string;
}

export interface AIUsage {
  promptTokens?: number | null;
  completionTokens?: number | null;
  totalTokens?: number | null;
}

export interface AIConversation {
  id: number;
  title: string;
  scenario: string;
  connectionId?: number | null;
  database?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AIMessage {
  id: number;
  conversationId: number;
  role: "system" | "developer" | "user" | "assistant" | "tool" | string;
  content: string;
  promptVersion?: string | null;
  model?: string | null;
  tokenIn?: number | null;
  tokenOut?: number | null;
  latencyMs?: number | null;
  createdAt: string;
}

export interface AIConversationDetail {
  conversation: AIConversation;
  messages: AIMessage[];
}

export interface AITableSummary {
  schema: string;
  name: string;
  columns: { name: string; type: string; nullable?: boolean }[];
}

export interface AISchemaOverview {
  tables: AITableSummary[];
}

export interface AISelectedTableRef {
  schema: string;
  name: string;
}

export interface AIChatRequest {
  requestId: string;
  providerId?: number;
  conversationId?: number;
  scenario: "sql_generate" | "sql_optimize" | "sql_explain" | string;
  input: string;
  title?: string;
  connectionId?: number;
  database?: string;
  schemaOverview?: AISchemaOverview;
  selectedTables?: AISelectedTableRef[];
}

export interface AIChatResponse {
  conversationId: number;
  userMessageId: number;
  assistantMessageId: number;
}
