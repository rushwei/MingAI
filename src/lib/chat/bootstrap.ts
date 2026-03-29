import { requestBrowserJson } from '@/lib/browser-api';
export interface ChatBootstrapKnowledgeBase {
  id: string;
  name: string;
  description: string | null;
}

export interface ChatBootstrapData {
  userId: string | null;
  promptKnowledgeBaseIds: string[];
  promptKnowledgeBases: ChatBootstrapKnowledgeBase[];
}

export const EMPTY_CHAT_BOOTSTRAP: ChatBootstrapData = {
  userId: null,
  promptKnowledgeBaseIds: [],
  promptKnowledgeBases: [],
};

export async function loadChatBootstrap(): Promise<ChatBootstrapData | null> {
  const result = await requestBrowserJson<ChatBootstrapData>('/api/chat/bootstrap');
  if (result.error || !result.data) {
    return null;
  }
  return result.data;
}
