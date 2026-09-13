import { InspectorUser, LoginCredentials, AuthSession, AuthResult } from '../types';

const STORAGE_KEY = 'aletiq_inspector_session';
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

// Pre-registered official inspector profiles for evaluation and demonstration autofill
export const SAMPLE_INSPECTORS: Array<{
  user: InspectorUser;
  defaultPassword: string;
}> = [
  {
    user: {
      id: 'insp-001',
      badgeId: 'DL-INSP-2026-089',
      name: 'P. K. Verma',
      designation: 'Senior Enforcement Inspector',
      department: 'Directorate of Legal Metrology, Dept. of Consumer Affairs',
      zone: 'Delhi Enforcement Zone (North & Central)',
      email: 'inspector.verma@delhi.gov.in',
      phone: '+91 11 2338 4591',
      role: 'SENIOR_INSPECTOR',
      jurisdiction: 'NCT of Delhi — E-Commerce & Retail Packaging Cell',
      activeSince: '2021-04-15',
    },
    defaultPassword: 'Password@2026',
  },
  {
    user: {
      id: 'insp-002',
      badgeId: 'IN-LMD-001',
      name: 'Dr. Rajesh Sharma',
      designation: 'Controller of Legal Metrology',
      department: 'Department of Consumer Affairs, Ministry of Consumer Affairs',
      zone: 'HQ Central Enforcement Directorate, New Delhi',
      email: 'controller@consumeraffairs.gov.in',
      phone: '+91 11 2338 1204',
      role: 'CONTROLLER_LEGAL_METROLOGY',
      jurisdiction: 'National Jurisdiction / All Zones Supervisory Authority',
      activeSince: '2018-01-10',
    },
    defaultPassword: 'Password@2026',
  },
  {
    user: {
      id: 'insp-003',
      badgeId: 'MH-INSP-4412',
      name: 'Ananya Kulkarni',
      designation: 'Legal Metrology Field Inspector',
      department: 'Office of the Controller of Legal Metrology, Maharashtra',
      zone: 'Mumbai Metropolitan & Port Inspection Zone',
      email: 'a.kulkarni@maharashtra.gov.in',
      phone: '+91 22 2202 8743',
      role: 'INSPECTOR',
      jurisdiction: 'Mumbai Coastal & Warehouse Logistics Sector',
      activeSince: '2023-08-01',
    },
    defaultPassword: 'Password@2026',
  },
];

/**
 * Inspector Authentication Service
 * 
 * Communicates with the Aletiq Backend (`/api/auth/inspector-login`)
 * to verify Cloudflare Turnstile token and validate inspector credentials.
 */
class AuthService {
  private currentSession: AuthSession | null = null;
  private listeners: Array<(session: AuthSession | null) => void> = [];

  constructor() {
    this.restoreSession();
  }

  private restoreSession(): void {
    try {
      // Check localStorage (Remember Me) first, then sessionStorage
      const localData = localStorage.getItem(STORAGE_KEY);
      const sessionData = sessionStorage.getItem(STORAGE_KEY);
      const raw = localData || sessionData;

      if (raw) {
        const parsed = JSON.parse(raw) as AuthSession;
        // Verify expiration
        if (new Date(parsed.expiresAt).getTime() > Date.now()) {
          this.currentSession = parsed;
        } else {
          this.logout();
        }
      }
    } catch (e) {
      console.warn('Failed to restore inspector auth session:', e);
      this.currentSession = null;
    }
  }

  /**
   * Subscribe to auth session changes
   */
  public subscribe(callback: (session: AuthSession | null) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  private notify(): void {
    this.listeners.forEach(cb => cb(this.currentSession));
  }

  /**
   * Log in an inspector via backend API with Turnstile verification
   */
  public async login(credentials: LoginCredentials): Promise<AuthResult> {
    const rawIdentifier = credentials.identifier?.trim();
    const rawPassword = credentials.password;
    const turnstileToken = credentials.turnstileToken?.trim();

    if (!rawIdentifier) {
      return { success: false, error: 'Please enter your Inspector ID or Official Email.' };
    }

    if (!rawPassword) {
      return { success: false, error: 'Please enter your password.' };
    }

    if (!turnstileToken) {
      return {
        success: false,
        error: 'Security challenge (Turnstile) verification is required. Please check the challenge box.',
      };
    }

    try {
      const payload = JSON.stringify({
        identifier: rawIdentifier,
        inspectorId: rawIdentifier,
        password: rawPassword,
        turnstileToken,
        rememberMe: Boolean(credentials.rememberMe),
      });

      const headers = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      };

      // Try primary endpoint first: /api/auth/inspector-login
      let response = await fetch(`${API_BASE_URL}/api/auth/inspector-login`, {
        method: 'POST',
        headers,
        body: payload,
      });

      // Fallback if primary endpoint returns 404
      if (response.status === 404) {
        response = await fetch(`${API_BASE_URL}/api/auth/login`, {
          method: 'POST',
          headers,
          body: payload,
        });
      }

      if (response.status === 404) {
        response = await fetch(`${API_BASE_URL}/api/login`, {
          method: 'POST',
          headers,
          body: payload,
        });
      }

      const data = await response.json().catch(() => null);

      if (!response.ok || !data || !data.success) {
        const errorMessage =
          data?.error || `Authentication request failed with status ${response.status}.`;
        return {
          success: false,
          error: errorMessage,
        };
      }

      // Successful authentication
      const user: InspectorUser = data.user;
      const token: string = data.token;
      const expiresAt: string = data.expiresAt;

      const session: AuthSession = {
        user,
        token,
        expiresAt,
        rememberMe: Boolean(credentials.rememberMe),
      };

      this.currentSession = session;

      // Persist to storage
      const serialized = JSON.stringify(session);
      if (credentials.rememberMe) {
        localStorage.setItem(STORAGE_KEY, serialized);
        sessionStorage.removeItem(STORAGE_KEY);
      } else {
        sessionStorage.setItem(STORAGE_KEY, serialized);
        localStorage.removeItem(STORAGE_KEY);
      }

      this.notify();
      return { success: true, user, token };
    } catch (netErr: any) {
      console.error('[AuthService] Network error during inspector login:', netErr);
      return {
        success: false,
        error: `Network error connecting to authentication server: ${netErr.message || 'Please check your connection and ensure the backend is running.'}`,
      };
    }
  }

  /**
   * Log out active inspector
   */
  public logout(): void {
    this.currentSession = null;
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    this.notify();
  }

  /**
   * Check if inspector is currently logged in with active valid session
   */
  public isAuthenticated(): boolean {
    if (!this.currentSession) return false;
    return new Date(this.currentSession.expiresAt).getTime() > Date.now();
  }

  /**
   * Get active logged in user profile
   */
  public getCurrentUser(): InspectorUser | null {
    if (!this.isAuthenticated()) return null;
    return this.currentSession ? this.currentSession.user : null;
  }

  /**
   * Get current auth token for API calls
   */
  public getToken(): string | null {
    if (!this.isAuthenticated() || !this.currentSession) return null;
    return this.currentSession.token;
  }

  /**
   * Get current auth session details
   */
  public getCurrentSession(): AuthSession | null {
    if (!this.isAuthenticated()) return null;
    return this.currentSession;
  }

  /**
   * Sample inspectors list for quick autofill
   */
  public getSampleInspectors() {
    return SAMPLE_INSPECTORS;
  }
}

export const authService = new AuthService();
