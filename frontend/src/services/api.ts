import type { GlanceConfig, ConfigResponse, ApiError } from '../types';

const API_BASE = '/api';

export interface RuntimeSettings {
  glanceUrl: string;
  configPath: string;
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
}

export const api = new ApiService();
