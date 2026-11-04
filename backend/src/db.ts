import fs from 'fs';
import path from 'path';

export interface UserSubscriptionRecord {
  email: string;
  isPro: boolean;
  plan: 'free' | 'monthly' | 'lifetime';
  status: 'active' | 'cancelled' | 'trial';
  licenseKey: string;
  stripeCustomerId?: string;
  stripeSessionId?: string;
  createdAt: string;
  updatedAt: string;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'subscriptions.json');

// Ensure data folder and subscriptions file exist
function initDb() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({}, null, 2), 'utf-8');
  }
}

function readAll(): Record<string, UserSubscriptionRecord> {
  initDb();
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function writeAll(data: Record<string, UserSubscriptionRecord>) {
  initDb();
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

export function generateLicenseKey(plan: 'monthly' | 'lifetime'): string {
  const prefix = plan === 'lifetime' ? 'LIFE' : 'PRO';
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  const rand2 = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${rand}-${rand2}`;
}

export function getSubscriptionByEmail(email: string): UserSubscriptionRecord | null {
  const all = readAll();
  const normalized = email.trim().toLowerCase();
  return all[normalized] || null;
}

export function getSubscriptionByLicense(licenseKey: string): UserSubscriptionRecord | null {
  if (!licenseKey || typeof licenseKey !== 'string') return null;
  const all = readAll();
  const normalized = licenseKey.trim().toUpperCase();

  for (const record of Object.values(all)) {
    if (record.licenseKey && record.licenseKey.toUpperCase() === normalized && record.isPro && record.status === 'active') {
      return record;
    }
  }
  return null;
}

export function getAllSubscriptions(): UserSubscriptionRecord[] {
  return Object.values(readAll());
}

export function saveSubscription(record: UserSubscriptionRecord): void {
  const all = readAll();
  const normalized = record.email.trim().toLowerCase();
  all[normalized] = {
    ...record,
    email: normalized,
    updatedAt: new Date().toISOString(),
  };
  writeAll(all);
}
