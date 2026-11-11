import { UserProfile, DEFAULT_USER_PROFILE, JobApplication, UserSubscription } from './types';

const STORAGE_KEYS = {
  PROFILE: 'ai_job_seeker_profile',
  APPLICATIONS: 'ai_job_seeker_applications',
  SUBSCRIPTION: 'ai_job_seeker_subscription',
  SETTINGS: 'ai_job_seeker_settings',
};

export async function getUserProfile(): Promise<UserProfile> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.PROFILE);
  if (result[STORAGE_KEYS.PROFILE]) {
    const saved = result[STORAGE_KEYS.PROFILE];
    // Deep merge with defaults to ensure all newly added fields and categories are always defined
    return {
      ...DEFAULT_USER_PROFILE,
      ...saved,
      personal: { ...DEFAULT_USER_PROFILE.personal, ...(saved.personal || {}) },
      work: { ...DEFAULT_USER_PROFILE.work, ...(saved.work || {}) },
      authorization: { ...DEFAULT_USER_PROFILE.authorization, ...(saved.authorization || {}) },
      education: { ...DEFAULT_USER_PROFILE.education, ...(saved.education || {}) },
      eeo: { ...DEFAULT_USER_PROFILE.eeo, ...(saved.eeo || {}) },
      skills: Array.isArray(saved.skills) ? saved.skills : DEFAULT_USER_PROFILE.skills,
      certifications: Array.isArray(saved.certifications) ? saved.certifications : (DEFAULT_USER_PROFILE.certifications || []),
      sectionCustomFields: saved.sectionCustomFields || {},
      customAnswers: { ...DEFAULT_USER_PROFILE.customAnswers, ...(saved.customAnswers || {}) },
    };
  }
  await saveUserProfile(DEFAULT_USER_PROFILE);
  return DEFAULT_USER_PROFILE;
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.PROFILE]: profile });
}

export async function getJobApplications(): Promise<JobApplication[]> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.APPLICATIONS);
  return result[STORAGE_KEYS.APPLICATIONS] || [];
}

export async function saveJobApplication(app: Omit<JobApplication, 'id' | 'appliedDate'>): Promise<JobApplication> {
  const current = await getJobApplications();
  const newApp: JobApplication = {
    ...app,
    id: `app_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    appliedDate: new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }),
  };
  const updated = [newApp, ...current];
  await chrome.storage.local.set({ [STORAGE_KEYS.APPLICATIONS]: updated });
  return newApp;
}

export async function updateApplicationStatus(id: string, status: JobApplication['status']): Promise<void> {
  const current = await getJobApplications();
  const updated = current.map(app => (app.id === id ? { ...app, status } : app));
  await chrome.storage.local.set({ [STORAGE_KEYS.APPLICATIONS]: updated });
}

export async function deleteJobApplication(id: string): Promise<void> {
  const current = await getJobApplications();
  const updated = current.filter(app => app.id !== id);
  await chrome.storage.local.set({ [STORAGE_KEYS.APPLICATIONS]: updated });
}

export async function getUserSubscription(): Promise<UserSubscription> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.SUBSCRIPTION);
  const currentMonth = new Date().toISOString().slice(0, 7); // e.g. "2026-11"
  const today = new Date().toISOString().split('T')[0];

  const raw = result[STORAGE_KEYS.SUBSCRIPTION];
  const sub: UserSubscription = {
    isPro: false,
    monthlyUsageCount: 0,
    lastUsageMonth: currentMonth,
    monthlyLimit: 50,
    dailyUsageCount: 0,
    lastUsageDate: today,
    dailyLimit: 50,
    ...(raw || {}),
  };

  // Reset monthly quota if new month
  if (sub.lastUsageMonth !== currentMonth) {
    sub.monthlyUsageCount = 0;
    sub.lastUsageMonth = currentMonth;
    await chrome.storage.local.set({ [STORAGE_KEYS.SUBSCRIPTION]: sub });
  }

  // Ensure dailyUsageCount mirrors monthlyUsageCount for backwards compatibility
  sub.dailyUsageCount = sub.monthlyUsageCount;
  sub.dailyLimit = sub.monthlyLimit || 50;

  return sub;
}

export async function setMonthlyFreeLimit(limit: number): Promise<UserSubscription> {
  const sub = await getUserSubscription();
  sub.monthlyLimit = Math.max(1, limit);
  sub.dailyLimit = sub.monthlyLimit;
  await chrome.storage.local.set({ [STORAGE_KEYS.SUBSCRIPTION]: sub });
  return sub;
}

export const setDailyFreeLimit = setMonthlyFreeLimit;

export async function incrementUsage(): Promise<UserSubscription> {
  const sub = await getUserSubscription();
  sub.monthlyUsageCount = (sub.monthlyUsageCount || 0) + 1;
  sub.dailyUsageCount = sub.monthlyUsageCount;
  await chrome.storage.local.set({ [STORAGE_KEYS.SUBSCRIPTION]: sub });
  return sub;
}

export async function setProStatus(isPro: boolean): Promise<void> {
  const sub = await getUserSubscription();
  sub.isPro = isPro;
  await chrome.storage.local.set({ [STORAGE_KEYS.SUBSCRIPTION]: sub });
}

export async function resetMonthlyUsage(): Promise<UserSubscription> {
  const sub = await getUserSubscription();
  sub.monthlyUsageCount = 0;
  sub.dailyUsageCount = 0;
  await chrome.storage.local.set({ [STORAGE_KEYS.SUBSCRIPTION]: sub });
  return sub;
}

export const resetDailyUsage = resetMonthlyUsage;

export async function getAppTheme(): Promise<'dark' | 'light'> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
  return result[STORAGE_KEYS.SETTINGS]?.theme || 'dark';
}

export async function setAppTheme(theme: 'dark' | 'light'): Promise<void> {
  const current = (await chrome.storage.local.get(STORAGE_KEYS.SETTINGS))[STORAGE_KEYS.SETTINGS] || {};
  await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: { ...current, theme } });
}

export async function getFloatingWidgetEnabled(): Promise<boolean> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
  const settings = result[STORAGE_KEYS.SETTINGS];
  // Default is true (enabled on screen)
  return settings?.showFloatingWidget !== false;
}

export async function setFloatingWidgetEnabled(enabled: boolean): Promise<void> {
  const current = (await chrome.storage.local.get(STORAGE_KEYS.SETTINGS))[STORAGE_KEYS.SETTINGS] || {};
  await chrome.storage.local.set({
    [STORAGE_KEYS.SETTINGS]: { ...current, showFloatingWidget: enabled },
  });
}

export function hasAnyProfileData(p?: UserProfile | null): boolean {
  if (!p) return false;
  if (p.personal) {
    for (const val of Object.values(p.personal)) {
      if (typeof val === 'string' && val.trim().length > 0) return true;
    }
  }
  if (p.work) {
    for (const val of Object.values(p.work)) {
      if (typeof val === 'string' && val.trim().length > 0) return true;
    }
  }
  if (p.education) {
    for (const val of Object.values(p.education)) {
      if (typeof val === 'string' && val.trim().length > 0) return true;
    }
  }
  if (p.authorization) {
    for (const val of Object.values(p.authorization)) {
      if (typeof val === 'string' && val.trim().length > 0) return true;
    }
  }
  if (p.eeo) {
    for (const val of Object.values(p.eeo)) {
      if (typeof val === 'string' && val.trim().length > 0) return true;
    }
  }
  if (Array.isArray(p.skills) && p.skills.length > 0) return true;
  if (Array.isArray(p.certifications) && p.certifications.length > 0) return true;
  if (p.customAnswers && Object.values(p.customAnswers).some((v) => Boolean(v?.trim()))) return true;
  if (p.sectionCustomFields && Object.values(p.sectionCustomFields).some((arr) => arr?.some?.((f) => Boolean(f?.value?.trim())))) return true;

  return false;
}
