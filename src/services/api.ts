import {
  Inspection,
  InspectionImage,
  LegalRule,
  RiskIntelligenceAnalytics,
  DigitalListing,
  ImprovementNotice,
  ProductUrlAnalysisResponse,
} from '../types';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, options);
  } catch (netErr: any) {
    throw new Error(
      `Network error connecting to API server at "${url}". Please ensure your backend is online and accessible. (Detail: ${netErr.message})`
    );
  }

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status} (${res.statusText}): ${text.slice(0, 150) || 'Empty response'}`);
    }
    if (text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
      throw new Error(
        `Received HTML instead of JSON from "${url}". If deployed on Vercel, make sure VITE_API_BASE_URL is set in your Vercel Environment Variables pointing to your Render backend URL.`
      );
    }
    throw new Error(`Unexpected non-JSON response from server: ${text.slice(0, 100)}`);
  }

  try {
    const json = await res.json();
    if (!res.ok && json && typeof json === 'object' && 'error' in json) {
      throw new Error(json.error || `Request failed with HTTP status ${res.status}`);
    }
    return json as T;
  } catch (err: any) {
    if (err.message && !err.message.includes('Unexpected end of JSON input')) {
      throw err;
    }
    throw new Error(`Server returned invalid JSON (HTTP ${res.status}). Ensure backend is active.`);
  }
}

export const api = {
  async checkHealth() {
    return fetchJson(`${API_BASE_URL}/api/health`);
  },

  async getRules(category?: string, search?: string): Promise<{ success: boolean; data: LegalRule[] }> {
    const params = new URLSearchParams();
    if (category && category !== 'ALL') params.set('category', category);
    if (search) params.set('search', search);
    return fetchJson(`${API_BASE_URL}/api/rules?${params.toString()}`);
  },

  async getRuleById(id: string): Promise<{ success: boolean; data: LegalRule }> {
    return fetchJson(`${API_BASE_URL}/api/rules/${id}`);
  },

  async getInspections(status?: string, search?: string): Promise<{ success: boolean; data: Inspection[] }> {
    const params = new URLSearchParams();
    if (status && status !== 'ALL') params.set('status', status);
    if (search) params.set('search', search);
    return fetchJson(`${API_BASE_URL}/api/inspections?${params.toString()}`);
  },

  async getInspectionById(id: string): Promise<{ success: boolean; data: Inspection }> {
    return fetchJson(`${API_BASE_URL}/api/inspections/${id}`);
  },

  async createInspection(data: Partial<Inspection>): Promise<{ success: boolean; data: Inspection }> {
    return fetchJson(`${API_BASE_URL}/api/inspections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async uploadImage(inspectionId: string, image: Partial<InspectionImage>): Promise<{ success: boolean; data: Inspection }> {
    return fetchJson(`${API_BASE_URL}/api/inspections/${inspectionId}/images`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image }),
    });
  },

  async deleteImage(inspectionId: string, imageId: string): Promise<{ success: boolean; data: Inspection }> {
    return fetchJson(`${API_BASE_URL}/api/inspections/${inspectionId}/images/${imageId}`, {
      method: 'DELETE',
    });
  },

  async runAnalysis(inspectionId: string): Promise<{ success: boolean; data: Inspection; error?: string }> {
    return fetchJson(`${API_BASE_URL}/api/inspections/${inspectionId}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
  },

  async deleteInspection(id: string): Promise<{ success: boolean }> {
    return fetchJson(`${API_BASE_URL}/api/inspections/${id}`, {
      method: 'DELETE',
    });
  },

  async compareWithListing(
    inspectionId: string,
    listing: DigitalListing
  ): Promise<{ success: boolean; data: Inspection }> {
    return fetchJson(`${API_BASE_URL}/api/inspections/${inspectionId}/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listing }),
    });
  },

  async analyzeProductUrl(
    url: string,
    inspectionId?: string
  ): Promise<ProductUrlAnalysisResponse> {
    return fetchJson(`${API_BASE_URL}/api/product/analyze-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, inspectionId }),
    });
  },

  async getImprovementNotice(inspectionId: string): Promise<{ success: boolean; data: ImprovementNotice }> {
    return fetchJson(`${API_BASE_URL}/api/inspections/${inspectionId}/notice`);
  },

  async getRiskIntelligence(): Promise<{ success: boolean; data: RiskIntelligenceAnalytics }> {
    return fetchJson(`${API_BASE_URL}/api/analytics/risk-intelligence`);
  },

  async seedDemoData(): Promise<{ success: boolean }> {
    return fetchJson(`${API_BASE_URL}/api/demo/seed`, { method: 'POST' });
  },
};
