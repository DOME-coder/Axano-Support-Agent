import type {
  KnowledgeSourceListResponse,
  KnowledgeUploadResponse,
} from '@avatardesk/shared';
import { apiFetch } from './api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

export async function fetchKnowledgeSources(): Promise<KnowledgeSourceListResponse> {
  const response = await apiFetch('/api/knowledge/sources');
  if (!response.ok) {
    throw new Error(`knowledge/sources ${response.status}`);
  }
  return (await response.json()) as KnowledgeSourceListResponse;
}

// Multer-multipart upload. We can't use the apiFetch wrapper here
// because it sets Content-Type: application/json by default;
// FormData needs to keep its own boundary header.
export async function uploadKnowledgePdf(file: File): Promise<KnowledgeUploadResponse> {
  const body = new FormData();
  body.append('file', file);
  const response = await fetch(`${API_BASE_URL}/api/knowledge/upload`, {
    method: 'POST',
    credentials: 'include',
    body,
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`knowledge/upload ${response.status}${text ? `: ${text}` : ''}`);
  }
  return (await response.json()) as KnowledgeUploadResponse;
}
