import type {
  ConversationDetail,
  ConversationsListResponse,
} from '@avatardesk/shared';
import { apiFetch } from './api';

export async function fetchConversations(
  page: number,
  pageSize: number,
): Promise<ConversationsListResponse> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  const response = await apiFetch(`/api/conversations?${params}`);
  if (!response.ok) {
    throw new Error(`conversations ${response.status}`);
  }
  return (await response.json()) as ConversationsListResponse;
}

export async function fetchConversation(id: string): Promise<ConversationDetail> {
  const response = await apiFetch(`/api/conversations/${encodeURIComponent(id)}`);
  if (response.status === 404) {
    throw new Error('not_found');
  }
  if (!response.ok) {
    throw new Error(`conversation ${response.status}`);
  }
  return (await response.json()) as ConversationDetail;
}
