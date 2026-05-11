// Tenant-related public types.

export interface TenantApiKeyHint {
  prefix: string;
  tail: string;
  generatedAt: string | null;
}

export interface RegenerateApiKeyResponse {
  hint: TenantApiKeyHint;
  storedAt: string;
}
