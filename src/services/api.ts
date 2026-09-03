import {
  Inspection,
  InspectionImage,
  LegalRule,
  RiskIntelligenceAnalytics,
  DigitalListing,
  ImprovementNotice,
} from '../types';

export const api = {
  async checkHealth() {
    const res = await fetch('/api/health');
    return res.json();
  },

  async getRules(category?: string, search?: string): Promise<{ success: boolean; data: LegalRule[] }> {
    const params = new URLSearchParams();
    if (category && category !== 'ALL') params.set('category', category);
    if (search) params.set('search', search);
    const res = await fetch(`/api/rules?${params.toString()}`);
    return res.json();
  },

  async getRuleById(id: string): Promise<{ success: boolean; data: LegalRule }> {
    const res = await fetch(`/api/rules/${id}`);
    return res.json();
  },

  async getInspections(status?: string, search?: string): Promise<{ success: boolean; data: Inspection[] }> {
    const params = new URLSearchParams();
    if (status && status !== 'ALL') params.set('status', status);
    if (search) params.set('search', search);
    const res = await fetch(`/api/inspections?${params.toString()}`);
    return res.json();
  },

  async getInspectionById(id: string): Promise<{ success: boolean; data: Inspection }> {
    const res = await fetch(`/api/inspections/${id}`);
    return res.json();
  },

  async createInspection(data: Partial<Inspection>): Promise<{ success: boolean; data: Inspection }> {
    const res = await fetch('/api/inspections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async uploadImage(inspectionId: string, image: Partial<InspectionImage>): Promise<{ success: boolean; data: Inspection }> {
    const res = await fetch(`/api/inspections/${inspectionId}/images`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image }),
    });
    return res.json();
  },

  async deleteImage(inspectionId: string, imageId: string): Promise<{ success: boolean; data: Inspection }> {
    const res = await fetch(`/api/inspections/${inspectionId}/images/${imageId}`, {
      method: 'DELETE',
    });
    return res.json();
  },

  async runAnalysis(inspectionId: string): Promise<{ success: boolean; data: Inspection; error?: string }> {
    const res = await fetch(`/api/inspections/${inspectionId}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    return res.json();
  },

  async deleteInspection(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/inspections/${id}`, {
      method: 'DELETE',
    });
    return res.json();
  },

  async compareWithListing(
    inspectionId: string,
    listing: DigitalListing
  ): Promise<{ success: boolean; data: Inspection }> {
    const res = await fetch(`/api/inspections/${inspectionId}/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listing }),
    });
    return res.json();
  },

  async getImprovementNotice(inspectionId: string): Promise<{ success: boolean; data: ImprovementNotice }> {
    const res = await fetch(`/api/inspections/${inspectionId}/notice`);
    return res.json();
  },

  async getRiskIntelligence(): Promise<{ success: boolean; data: RiskIntelligenceAnalytics }> {
    const res = await fetch('/api/analytics/risk-intelligence');
    return res.json();
  },

  async seedDemoData(): Promise<{ success: boolean }> {
    const res = await fetch('/api/demo/seed', { method: 'POST' });
    return res.json();
  },
};
