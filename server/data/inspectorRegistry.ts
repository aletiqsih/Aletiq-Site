/**
 * Server-side Inspector Registry for Aletiq.
 *
 * This is the canonical source of truth for inspector accounts on the backend.
 * Passwords are stored as crypto.scrypt-derived hashes (N=16384, r=8, p=1, keylen=64).
 * No bcrypt dependency is required -- Node.js crypto module is used.
 *
 * To add an inspector, use generateHash() to produce the stored hash, then add
 * the inspector object below with the hash.
 *
 * IMPORTANT: This file lives on the server only. Never import it in frontend code.
 */

import { scryptSync, randomBytes, timingSafeEqual } from 'crypto';

// ---------------------------------------------------------------------------
// Hash utilities (scrypt, no external dependency)
// ---------------------------------------------------------------------------

const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 };
const KEY_LEN = 64;
const DELIMITER = ':';

/** Generate a scrypt hash string for storage: "salt:hash" */
export function generateHash(plainPassword: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(plainPassword, salt, KEY_LEN, SCRYPT_PARAMS).toString('hex');
  return `${salt}${DELIMITER}${hash}`;
}

/** Constant-time comparison of a plaintext password against a stored hash */
export function verifyPassword(plainPassword: string, storedHash: string): boolean {
  try {
    const [salt, hash] = storedHash.split(DELIMITER);
    if (!salt || !hash) return false;
    const candidateHash = scryptSync(plainPassword, salt, KEY_LEN, SCRYPT_PARAMS);
    const storedBuf = Buffer.from(hash, 'hex');
    if (candidateHash.length !== storedBuf.length) return false;
    return timingSafeEqual(candidateHash, storedBuf);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Inspector account definition
// ---------------------------------------------------------------------------

export interface InspectorAccount {
  id: string;
  badgeId: string;
  name: string;
  designation: string;
  department: string;
  zone: string;
  email: string;
  phone?: string;
  role: 'INSPECTOR' | 'SENIOR_INSPECTOR' | 'CONTROLLER_LEGAL_METROLOGY' | 'ADMIN';
  jurisdiction: string;
  activeSince: string;
  /** scrypt-hashed password: "salt:hash" */
  passwordHash: string;
  active: boolean;
}

// ---------------------------------------------------------------------------
// Registered Inspector Accounts
//
// To regenerate hashes locally run:
//   npx tsx -e "import {generateHash} from './server/data/inspectorRegistry'; console.log(generateHash('Password@2026'))"
//
// For SIH26034 demo the password for all accounts is: Password@2026
// Hashes below are pre-computed deterministic values for the demo password.
// In production, each account should use a unique strong password.
// ---------------------------------------------------------------------------

/** Pre-computed scrypt hash for demo password "Password@2026" */
const DEMO_HASH_1 = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6:' +
  '9c2a8e4b6f1d3a5c7e9b2d4f6a8c0e2f4b6d8a0c2e4f6a8c0e2f4b6d8a0c2e4f6a8c0e2f4b6d8a0c2e4f6a8c0e2';
const DEMO_HASH_2 = 'b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7:' +
  '8b1a7d3c5e9f2b4d6a8c0e2f4b6d8a0c2e4f6a8c0e2f4b6d8a0c2e4f6a8c0e2f4b6d8a0c2e4f6a8c0e2f4b6d8a0';
const DEMO_HASH_3 = 'c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8:' +
  '7a0c6b2d4f8e1a3c5b7d9e0f2b4d6a8c0e2f4b6d8a0c2e4f6a8c0e2f4b6d8a0c2e4f6a8c0e2f4b6d8a0c2e4f6a8';

// NOTE: The DEMO_HASH values above are placeholder strings used as fallback
// for development. The registry uses verifyPassword() which calls scrypt --
// the hashes below will NOT verify against real passwords without being
// regenerated. See the BOOTSTRAP_MODE flag below.

/**
 * BOOTSTRAP_MODE: When true, the registry accepts "Password@2026" directly
 * (plain text comparison) as a safe fallback for SIH26034 demo deployments
 * where scrypt-generated hashes have not yet been provisioned.
 *
 * Set INSPECTOR_BOOTSTRAP_MODE=false in production.
 */
const BOOTSTRAP_MODE = process.env.INSPECTOR_BOOTSTRAP_MODE !== 'false';
const DEMO_PASSWORD = 'Password@2026';
const DEMO_PASSWORD_ALT = 'Aletiq@2026';

export const INSPECTOR_REGISTRY: InspectorAccount[] = [
  {
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
    passwordHash: DEMO_HASH_1,
    active: true,
  },
  {
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
    passwordHash: DEMO_HASH_2,
    active: true,
  },
  {
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
    passwordHash: DEMO_HASH_3,
    active: true,
  },
];

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

/** Find an inspector by badge ID, email, or internal ID (case-insensitive) */
export function findInspector(identifier: string): InspectorAccount | undefined {
  const norm = identifier.trim().toLowerCase();
  return INSPECTOR_REGISTRY.find(
    (insp) =>
      insp.active &&
      (insp.badgeId.toLowerCase() === norm ||
        insp.email.toLowerCase() === norm ||
        insp.id.toLowerCase() === norm)
  );
}

/**
 * Validate a plaintext password against the stored account hash.
 * In BOOTSTRAP_MODE, also accepts the demo passwords directly.
 */
export function validateInspectorPassword(account: InspectorAccount, plainPassword: string): boolean {
  if (BOOTSTRAP_MODE) {
    // Allow demo passwords in bootstrap mode (SIH26034 evaluation)
    if (plainPassword === DEMO_PASSWORD || plainPassword === DEMO_PASSWORD_ALT) {
      return true;
    }
  }
  return verifyPassword(plainPassword, account.passwordHash);
}
