// Knowledge-source types shared between api and dashboard.

export type KnowledgeSourceStatus = 'pending' | 'indexing' | 'ready' | 'failed';

export interface KnowledgeSourceSummary {
  id: string;
  type: string;
  displayName: string;
  status: KnowledgeSourceStatus;
  chunkCount: number;
  error: string | null;
  lastIndexedAt: string | null;
  createdAt: string;
}

export interface KnowledgeSourceListResponse {
  sources: KnowledgeSourceSummary[];
}

export interface KnowledgeUploadResponse {
  sourceId: string;
  status: KnowledgeSourceStatus;
}
