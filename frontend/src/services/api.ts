import type { GlanceConfig, ConfigResponse, ApiError } from '../types';

const API_BASE = '/api';

export interface RuntimeSettings {
  glanceUrl: string;
  configPath: string;
}

export interface IncludeFile {
  name: string;
  path: string;
  relativePath: string;
  size: number;
  modified: string;
  isMainConfig: boolean;
  isIncluded: boolean;
}

export interface IncludeReference {
  path: string;
  line: number;
  absolutePath: string;
}

export interface IncludeFileContent {
  content: string;
  path: string;
  absolutePath: string;
}

class ApiService {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        error: `HTTP ${response.status}: ${response.statusText}`,
      }));
      throw new Error(error.error);
    }

    return response.json();
  }

  async getSettings(): Promise<RuntimeSettings> {
    return this.request<RuntimeSettings>('/settings');
  }

  async getConfig(): Promise<ConfigResponse> {
    return this.request<ConfigResponse>('/config');
  }

  async getConfigRaw(): Promise<{ raw: string }> {
    return this.request<{ raw: string }>('/config/raw');
  }

  async updateConfig(config: GlanceConfig): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>('/config', {
      method: 'PUT',
      body: JSON.stringify({ config }),
    });
  }

  async updateConfigRaw(raw: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>('/config/raw', {
      method: 'PUT',
      body: JSON.stringify({ raw }),
    });
  }

  async healthCheck(): Promise<{ status: string; timestamp?: string }> {
    return this.request<{ status: string; timestamp?: string }>('/health');
  }

  // Include files API
  async listIncludeFiles(): Promise<{ files: IncludeFile[] }> {
    return this.request<{ files: IncludeFile[] }>('/includes/files');
  }

  async getIncludeReferences(): Promise<{ includes: IncludeReference[] }> {
    return this.request<{ includes: IncludeReference[] }>('/includes/references');
  }

  async readIncludeFile(path: string): Promise<IncludeFileContent> {
    return this.request<IncludeFileContent>(`/includes/file/${encodeURIComponent(path)}`);
  }

  async writeIncludeFile(path: string, content: string): Promise<{ success: boolean; path: string }> {
    return this.request<{ success: boolean; path: string }>(`/includes/file/${encodeURIComponent(path)}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    });
  }

  async deleteIncludeFile(path: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/includes/file/${encodeURIComponent(path)}`, {
      method: 'DELETE',
    });
  }
}

export const api = new ApiService();
