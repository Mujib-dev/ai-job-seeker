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
  const today = new Date().toISOString().split('T')[0];

  const raw = result[STORAGE_KEYS.SUBSCRIPTION];
  const sub: UserSubscription = {
    isPro: false,
    dailyUsageCount: 0,
    lastUsageDate: today,
    dailyLimit: 5,
    ...(raw || {}),
  };

  // Reset daily quota if new day
  if (sub.lastUsageDate !== today) {
    sub.dailyUsageCount = 0;
    sub.lastUsageDate = today;
    await chrome.storage.local.set({ [STORAGE_KEYS.SUBSCRIPTION]: sub });
  }

  return sub;
}

export async function setDailyFreeLimit(limit: number): Promise<UserSubscription> {
  const sub = await getUserSubscription();
  sub.dailyLimit = Math.max(1, limit);
  await chrome.storage.local.set({ [STORAGE_KEYS.SUBSCRIPTION]: sub });
  return sub;
}

export async function incrementUsage(): Promise<UserSubscription> {
  const sub = await getUserSubscription();
  sub.dailyUsageCount += 1;
  await chrome.storage.local.set({ [STORAGE_KEYS.SUBSCRIPTION]: sub });
  return sub;
}

export async function setProStatus(isPro: boolean): Promise<void> {
  const sub = await getUserSubscription();
  sub.isPro = isPro;
  await chrome.storage.local.set({ [STORAGE_KEYS.SUBSCRIPTION]: sub });
}

export async function resetDailyUsage(): Promise<UserSubscription> {
  const sub = await getUserSubscription();
  sub.dailyUsageCount = 0;
  await chrome.storage.local.set({ [STORAGE_KEYS.SUBSCRIPTION]: sub });
  return sub;
}

export async function getAppTheme(): Promise<'dark' | 'light'> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
  return result[STORAGE_KEYS.SETTINGS]?.theme || 'dark';
}

export async function setAppTheme(theme: 'dark' | 'light'): Promise<void> {
  const current = (await chrome.storage.local.get(STORAGE_KEYS.SETTINGS))[STORAGE_KEYS.SETTINGS] || {};
  await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: { ...current, theme } });
}
