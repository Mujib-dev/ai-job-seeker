import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Sparkles,
  User,
  FileText,
  Clock,
  CheckCircle2,
  Copy,
  Download,
  Trash2,
  Settings,
  Zap,
  ShieldCheck,
  ExternalLink,
  Plus,
  PlusCircle,
  Crown,
  Check,
  X,
  Edit3,
  Sun,
  Moon,
  Globe,
  GraduationCap,
  MessageSquare,
  RefreshCw,
  HelpCircle,
} from 'lucide-react';
import { UserProfile, DEFAULT_USER_PROFILE, JobApplication, UserSubscription } from '../../lib/types';
import {
  getUserProfile,
  saveUserProfile,
  getJobApplications,
  saveJobApplication,
  updateApplicationStatus,
  deleteJobApplication,
  getUserSubscription,
  incrementUsage,
  setProStatus,
  getAppTheme,
  setAppTheme,
  getFloatingWidgetEnabled,
  setFloatingWidgetEnabled,
} from '../../lib/storage';
import { generateAIAnswer, generateAICoverLetter } from '../../lib/ai';
import { API_BASE_URL } from '../../lib/config';

type Tab = 'autofill' | 'profile' | 'cover-letter' | 'tracker' | 'settings';

const QUICK_PROMPTS = [
  'Why should we hire you?',
  'Tell me about yourself',
  'What are your greatest strengths?',
  'How do you handle tight deadlines?',
  'Describe a challenge you solved',
  'Where do you see yourself in 3-5 years?',
];

const PROFILE_CATEGORIES = [
  { id: 'contact', label: 'Contact', icon: User },
  { id: 'links', label: 'Links', icon: Globe },
  { id: 'work', label: 'Work', icon: Briefcase },
  { id: 'education', label: 'Education', icon: GraduationCap },
  { id: 'eeo', label: 'Demographics', icon: ShieldCheck },
  { id: 'skills', label: 'Skills', icon: Zap },
  { id: 'custom', label: '+ Custom Fields', icon: PlusCircle },
] as const;

export default function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const isDark = theme === 'dark';
  const [activeTab, setActiveTab] = useState<Tab>('autofill');
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [pricingTier, setPricingTier] = useState<'monthly' | 'lifetime'>('lifetime');
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_USER_PROFILE);
  const [subscription, setSubscription] = useState<UserSubscription>({
    isPro: false,
    monthlyUsageCount: 0,
    lastUsageMonth: new Date().toISOString().slice(0, 7),
    monthlyLimit: 50,
  });
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Active page detection state
  const [pageInfo, setPageInfo] = useState({ title: '', company: '', url: '', description: '' });

  // AI Q&A State
  const [customQuestion, setCustomQuestion] = useState('');
  const [generatedAnswer, setGeneratedAnswer] = useState('');
  const [selectedTone, setSelectedTone] = useState<'confident' | 'professional' | 'creative'>('professional');

  // Cover Letter State
  const [coverLetter, setCoverLetter] = useState('');

  // Profile Form state
  const [profileCategory, setProfileCategory] = useState<'contact' | 'links' | 'work' | 'education' | 'eeo' | 'skills' | 'custom'>('contact');
  const [newSkill, setNewSkill] = useState('');
  const [newCert, setNewCert] = useState('');
  const [customKeyInput, setCustomKeyInput] = useState('');
  const [customValInput, setCustomValInput] = useState('');
  const [quickCustomKey, setQuickCustomKey] = useState('');
  const [quickCustomVal, setQuickCustomVal] = useState('');

  // Payment & License Verification State
  const [licenseInput, setLicenseInput] = useState('');
  const [activatingLicense, setActivatingLicense] = useState(false);
  const [showFloatingWidget, setShowFloatingWidget] = useState(true);

  useEffect(() => {
    loadInitialData();
    detectActiveTabInfo();
  }, []);

  const loadInitialData = async () => {
    const t = await getAppTheme();
    setTheme(t);
    if (t === 'light') {
      document.body.classList.add('theme-light');
    } else {
      document.body.classList.remove('theme-light');
    }
    const fw = await getFloatingWidgetEnabled();
    setShowFloatingWidget(fw);
    const p = await getUserProfile();
    setProfile(p);
    const s = await getUserSubscription();
    setSubscription(s);
    const a = await getJobApplications();
    setApplications(a);

    // If profile is empty (first time install), redirect directly to Profile tab!
    if (!p.personal?.firstName && !p.personal?.email) {
      setActiveTab('profile');
    }

    // Prompt new customers with the 3-step guide on first install
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const guideRes = await chrome.storage.local.get('ai_job_seeker_has_seen_guide');
        if (!guideRes.ai_job_seeker_has_seen_guide) {
          setShowGuideModal(true);
        }
      }
    } catch {}
  };

  const handleCloseGuide = async () => {
    setShowGuideModal(false);
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        await chrome.storage.local.set({ ai_job_seeker_has_seen_guide: true });
      }
    } catch {}
  };

  const handleGuideGoToProfile = async () => {
    await handleCloseGuide();
    setActiveTab('profile');
  };

  const handleToggleTheme = async () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    if (next === 'light') {
      document.body.classList.add('theme-light');
    } else {
      document.body.classList.remove('theme-light');
    }
    await setAppTheme(next);
    showToast(next === 'light' ? 'Light mode enabled' : 'Dark mode enabled');
  };

  const handleToggleFloatingWidget = async () => {
    const nextVal = !showFloatingWidget;
    setShowFloatingWidget(nextVal);
    await setFloatingWidgetEnabled(nextVal);
    showToast(nextVal ? 'Floating button enabled' : 'Floating button hidden');
  };

  const showToast = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  };

  const detectActiveTabInfo = () => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (tab && tab.id) {
          const url = tab.url || '';
          let host = '';
          try {
            host = new URL(url).hostname.replace('www.', '');
          } catch {}

          setPageInfo({
            title: tab.title || '',
            company: host || '',
            url: url,
            description: '',
          });

          // Ask content script for deeper metadata if available
          chrome.tabs.sendMessage(tab.id, { type: 'GET_PAGE_JOB_INFO' }, (res) => {
            if (chrome.runtime.lastError) return;
            if (res && res.title) {
              setPageInfo({
                title: res.title || tab.title || '',
                company: res.company || host || '',
                url: url,
                description: res.description || '',
              });
            }
          });
        }
      });
    }
  };

  // Helper to record job tracking & usage
  const recordApplicationAndUsage = async () => {
    await saveJobApplication({
      jobTitle: pageInfo.title || 'Job Opening',
      company: pageInfo.company || 'Company',
      url: pageInfo.url,
      status: 'Applied',
    });
    const updated = await getJobApplications();
    setApplications(updated);

    const newSub = await incrementUsage();
    setSubscription(newSub);
  };

  // Trigger 1-Click Form Autofill
  const handleTriggerAutofill = async (customProfileToUse?: UserProfile) => {
    const profileToUse = customProfileToUse || profile;
    const hasData = Boolean(
      profileToUse.personal?.email?.trim() ||
      profileToUse.personal?.firstName?.trim() ||
      profileToUse.personal?.lastName?.trim() ||
      profileToUse.personal?.phone?.trim() ||
      (profileToUse.customAnswers && Object.keys(profileToUse.customAnswers).length > 0)
    );

    // Check if profile is empty
    if (!hasData) {
      showToast('Please enter your profile details first!');
      setActiveTab('profile');
      return;
    }

    const freeLimit = subscription.monthlyLimit || 50;
    const currentUsage = subscription.monthlyUsageCount ?? subscription.dailyUsageCount ?? 0;
    if (!subscription.isPro && currentUsage >= freeLimit) {
      showToast(`Monthly limit reached (${freeLimit}/${freeLimit}). Upgrade to Pro for unlimited autofills!`);
      return;
    }

    setLoading(true);
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (tab && tab.id) {
          // Attempt 1: Send message to content script
          chrome.tabs.sendMessage(tab.id, { type: 'EXECUTE_AUTOFILL', profile: profileToUse }, async (response) => {
            if (chrome.runtime.lastError || !response) {
              // Attempt 2: Direct Script Injection fallback (for newly opened tabs or file:// URLs)
              try {
                chrome.scripting.executeScript(
                  {
                    target: { tabId: tab.id! },
                    func: directAutofillScript,
                    args: [profileToUse],
                  },
                  async (results) => {
                    setLoading(false);
                    const filled = results?.[0]?.result ?? 0;
                    if (filled > 0) {
                      showToast(`Autofilled ${filled} fields!`);
                      await recordApplicationAndUsage();
                    } else {
                      showToast('No empty application fields found on this page.');
                    }
                  }
                );
              } catch (err: any) {
                setLoading(false);
                showToast('Please refresh the page and try again!');
              }
            } else {
              setLoading(false);
              const filled = response.filledCount ?? 0;
              if (filled > 0) {
                showToast(`Autofilled ${filled} fields!`);
                await recordApplicationAndUsage();
              } else {
                showToast('No empty application fields found on this page.');
              }
            }
          });
        }
      });
    } else {
      setLoading(false);
      showToast('Autofill simulated (demo environment)');
    }
  };

  // Handle AI Custom Answer
  const handleGenerateAnswer = async () => {
    if (!customQuestion.trim()) {
      showToast('Please type a question or pick a prompt.');
      return;
    }

    const freeLimit = subscription.monthlyLimit || 50;
    const currentUsage = subscription.monthlyUsageCount ?? subscription.dailyUsageCount ?? 0;
    if (!subscription.isPro && currentUsage >= freeLimit) {
      showToast('Monthly limit reached. Upgrade to Pro for unlimited AI answers!');
      return;
    }

    setLoading(true);
    try {
      const ans = await generateAIAnswer({
        profile,
        jobTitle: pageInfo.title,
        company: pageInfo.company,
        jobDescription: pageInfo.description,
        question: customQuestion,
        tone: selectedTone,
      });
      setGeneratedAnswer(ans);
      const newSub = await incrementUsage();
      setSubscription(newSub);
      showToast('Answer generated!');
    } catch {
      showToast('Error generating answer. Try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Cover Letter
  const handleGenerateCoverLetter = async () => {
    const freeLimit = subscription.monthlyLimit || 50;
    const currentUsage = subscription.monthlyUsageCount ?? subscription.dailyUsageCount ?? 0;
    if (!subscription.isPro && currentUsage >= freeLimit) {
      showToast('Monthly limit reached. Upgrade to Pro for unlimited cover letters!');
      return;
    }

    setLoading(true);
    try {
      const letter = await generateAICoverLetter({
        profile,
        jobTitle: pageInfo.title,
        company: pageInfo.company,
        jobDescription: pageInfo.description,
      });
      setCoverLetter(letter);
      const newSub = await incrementUsage();
      setSubscription(newSub);
      showToast('Cover letter generated!');
    } catch {
      showToast('Failed to generate cover letter.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, label = 'Copied to clipboard!') => {
    navigator.clipboard.writeText(text);
    showToast(label);
  };

  const handleDownloadCoverLetter = () => {
    const element = document.createElement('a');
    const file = new Blob([coverLetter], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `Cover_Letter_${pageInfo.company || 'Job'}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    showToast('Cover letter downloaded!');
  };

  const handleSaveProfile = async () => {
    await saveUserProfile(profile);
    showToast('Profile saved successfully!');
  };

  const handleAddSkill = () => {
    if (newSkill.trim() && !profile.skills.includes(newSkill.trim())) {
      const updated = { ...profile, skills: [...profile.skills, newSkill.trim()] };
      setProfile(updated);
      saveUserProfile(updated);
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    const updated = { ...profile, skills: profile.skills.filter((s) => s !== skillToRemove) };
    setProfile(updated);
    saveUserProfile(updated);
  };

  const handleAddCert = () => {
    if (newCert.trim() && !(profile.certifications || []).includes(newCert.trim())) {
      const updated = { ...profile, certifications: [...(profile.certifications || []), newCert.trim()] };
      setProfile(updated);
      saveUserProfile(updated);
      setNewCert('');
    }
  };

  const handleRemoveCert = (certToRemove: string) => {
    const updated = { ...profile, certifications: (profile.certifications || []).filter((c) => c !== certToRemove) };
    setProfile(updated);
    saveUserProfile(updated);
  };

  const handleAddCustomField = () => {
    if (customKeyInput.trim() && customValInput.trim()) {
      const cleanKey = customKeyInput.trim().toLowerCase().replace(/\s+/g, '_');
      const updated = {
        ...profile,
        customAnswers: {
          ...(profile.customAnswers || {}),
          [cleanKey]: customValInput.trim(),
        },
      };
      setProfile(updated);
      saveUserProfile(updated);
      setCustomKeyInput('');
      setCustomValInput('');
      showToast('Custom field added!');
    }
  };

  const handleSaveAndAutofillCustom = async () => {
    if (!quickCustomKey.trim() || !quickCustomVal.trim()) return;
    const cleanKey = quickCustomKey.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const updated = {
      ...profile,
      customAnswers: {
        ...(profile.customAnswers || {}),
        [cleanKey]: quickCustomVal.trim(),
      },
    };
    setProfile(updated);
    await saveUserProfile(updated);
    const savedLabel = quickCustomKey.trim();
    setQuickCustomKey('');
    setQuickCustomVal('');
    showToast(`Saved "${savedLabel}"! Autofilling form...`);
    handleTriggerAutofill(updated);
  };

  const handleRemoveCustomField = (key: string) => {
    const nextCustom = { ...(profile.customAnswers || {}) };
    delete nextCustom[key];
    const updated = { ...profile, customAnswers: nextCustom };
    setProfile(updated);
    saveUserProfile(updated);
  };

  const handleStartCheckout = async (plan: 'monthly' | 'lifetime' = pricingTier) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: profile.personal.email || 'user@example.com',
          planType: plan,
        }),
      });
      const data = await res.json();
      if (data.checkoutUrl) {
        if (typeof chrome !== 'undefined' && chrome.tabs) {
          chrome.tabs.create({ url: data.checkoutUrl });
        } else {
          window.open(data.checkoutUrl, '_blank');
        }
        showToast('Opening secure checkout...');
        setShowPricingModal(false);
      } else if (data.whatsappUrl) {
        showToast('Opening LynkZone WhatsApp...');
        if (typeof chrome !== 'undefined' && chrome.tabs) {
          chrome.tabs.create({ url: data.whatsappUrl });
        } else {
          window.open(data.whatsappUrl, '_blank');
        }
      } else {
        showToast(data.message || 'Error creating checkout.');
      }
    } catch {
      showToast('Payment server offline. Ensure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyLicense = async (keyToVerify?: string) => {
    const key = (keyToVerify || licenseInput).trim();
    if (!key) {
      showToast('Please enter your license key or email.');
      return;
    }
    setActivatingLicense(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/verify-license`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          licenseKey: key,
          email: key.includes('@') ? key : undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.isPro) {
        await setProStatus(true);
        setSubscription({ ...subscription, isPro: true });
        showToast(`Pro activated successfully!`);
        setShowPricingModal(false);
        setLicenseInput('');
      } else {
        showToast(data.error || 'Invalid license key.');
      }
    } catch {
      showToast('Could not reach verification server.');
    } finally {
      setActivatingLicense(false);
    }
  };

  const freeLimit = subscription.monthlyLimit || 50;
  const currentUsage = subscription.monthlyUsageCount ?? subscription.dailyUsageCount ?? 0;
  const remainingQuota = Math.max(0, freeLimit - currentUsage);

  return (
    <div className={`flex flex-col h-[600px] w-[480px] select-none ${theme === 'light' ? 'theme-light' : 'bg-[#0b0f19] text-slate-100'}`}>
      {/* Toast Feedback Notification */}
      {feedback && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 bg-indigo-600 text-white text-xs px-4 py-2 rounded-full shadow-lg shadow-indigo-500/25 flex items-center gap-2 animate-bounce font-medium">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Sleek, Friendly Header */}
      <header className="px-4 py-3 border-b border-slate-800/80 bg-[#0f172a]/95 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-cyan-400 p-0.5 flex items-center justify-center shadow-md shadow-indigo-500/20">
            <div className="w-full h-full bg-[#0b0f19] rounded-[7px] flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-cyan-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm tracking-tight text-white">AI Job Seeker</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-cyan-300 font-semibold border border-cyan-500/30">
                LynkZone
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Fast Autofill & AI Copilot</p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-1.5">
          {/* Quick Guide (?) Button */}
          <button
            onClick={() => setShowGuideModal(true)}
            className={`p-1.5 rounded-full border transition cursor-pointer flex items-center justify-center ${
              isDark
                ? 'bg-slate-800/80 hover:bg-slate-700 text-cyan-300 border-slate-700 shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300 shadow-sm'
            }`}
            title="How It Works Guide"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>

          {/* Theme Switcher */}
          <button
            onClick={handleToggleTheme}
            className={`p-1.5 rounded-full border transition cursor-pointer flex items-center justify-center ${
              theme === 'dark'
                ? 'bg-slate-800/80 hover:bg-slate-700 text-amber-300 border-slate-700 shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300 shadow-sm'
            }`}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>

          {/* Quota / Pro Pill */}
          {subscription.isPro ? (
            <button
              onClick={() => setShowPricingModal(true)}
              className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border transition cursor-pointer ${
                isDark
                  ? 'font-semibold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30'
                  : 'font-bold text-emerald-900 bg-emerald-100 hover:bg-emerald-200 border-emerald-300 shadow-sm'
              }`}
            >
              <Crown className="w-3.5 h-3.5 text-emerald-400" /> Pro Active
            </button>
          ) : (
            <button
              onClick={() => setShowPricingModal(true)}
              className={`flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border transition-all cursor-pointer shadow-sm ${
                isDark
                  ? 'font-semibold text-amber-300 bg-gradient-to-r from-amber-500/15 to-orange-500/15 hover:from-amber-500/25 hover:to-orange-500/25 border-amber-500/30'
                  : 'font-bold text-amber-950 bg-amber-100 hover:bg-amber-200 border-amber-400'
              }`}
              title="Click to upgrade"
            >
              <Zap className={`w-3 h-3 ${isDark ? 'text-amber-400' : 'text-amber-800 fill-amber-700'}`} />
              <span>{remainingQuota} left</span>
            </button>
          )}

          {/* Close Popup (X) Button */}
          <button
            onClick={() => window.close()}
            className={`p-1.5 rounded-full border transition cursor-pointer flex items-center justify-center ${
              isDark
                ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border-slate-700 shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 border-slate-300 shadow-sm'
            }`}
            title="Close popup"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Segmented Tab Bar */}
      <nav className="flex items-center justify-around px-2 py-1.5 bg-[#0c1322] border-b border-slate-800/80 text-xs">
        <button
          onClick={() => setActiveTab('autofill')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
            activeTab === 'autofill'
              ? 'bg-indigo-600/20 text-indigo-400 font-semibold border border-indigo-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Zap className="w-3.5 h-3.5" /> Autofill
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
            activeTab === 'profile'
              ? 'bg-indigo-600/20 text-indigo-400 font-semibold border border-indigo-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <User className="w-3.5 h-3.5" /> Profile
        </button>

        <button
          onClick={() => setActiveTab('cover-letter')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
            activeTab === 'cover-letter'
              ? 'bg-indigo-600/20 text-indigo-400 font-semibold border border-indigo-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5" /> Cover Letter
        </button>

        <button
          onClick={() => setActiveTab('tracker')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
            activeTab === 'tracker'
              ? 'bg-indigo-600/20 text-indigo-400 font-semibold border border-indigo-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5" /> Tracker
          {applications.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-indigo-300 font-bold">
              {applications.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`p-1.5 rounded-lg transition-all ${
            activeTab === 'settings'
              ? 'bg-indigo-600/20 text-indigo-400 font-semibold border border-indigo-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </nav>

      {/* Main Tab Content */}
      <main className="flex-1 overflow-y-auto p-4 space-y-3.5">
        {/* ================= TAB 1: AUTOFILL & COPILOT ================= */}
        {activeTab === 'autofill' && (
          <div className="space-y-3.5">
            {/* Active Job Detection / Friendly Status Card */}
            {pageInfo.title ? (
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wide">
                      Job Page Ready
                    </span>
                  </div>
                  <h3 className="text-xs font-semibold text-white truncate">{pageInfo.title}</h3>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">{pageInfo.company || 'Job Application'}</p>
                </div>
                <button
                  onClick={detectActiveTabInfo}
                  className="p-1 rounded text-slate-400 hover:text-cyan-400 transition"
                  title="Refresh detection"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-white">Ready to Apply</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Open any job posting on LinkedIn, Indeed, etc., then click below.
                  </p>
                  <button
                    onClick={() => setShowGuideModal(true)}
                    className="text-[10px] text-cyan-400 hover:text-cyan-300 hover:underline mt-1 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <HelpCircle className="w-3 h-3" /> New here? View 3-step guide →
                  </button>
                </div>
                <button
                  onClick={detectActiveTabInfo}
                  className="p-1 rounded text-slate-400 hover:text-cyan-400 transition"
                  title="Detect page"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Primary Autofill Action Button */}
            <div className="space-y-1.5">
              <button
                onClick={handleTriggerAutofill}
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-bold text-sm shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer disabled:opacity-50"
              >
                <Zap className="w-4 h-4 fill-white" />
                {loading ? 'Autofilling Form...' : 'Autofill Application'}
              </button>
              <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>Fills fields safely using your saved profile</span>
              </div>
            </div>

            {/* Quick Missing / Custom Field Adder */}
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <PlusCircle className="w-3.5 h-3.5 text-indigo-400" />
                  <h4 className="text-xs font-semibold text-white">Missing a field on this page?</h4>
                </div>
                <span className="text-[10px] text-slate-500">Custom Input</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Add any unique question or input (e.g. Father's Name, Emergency Contact) to autofill it instantly.
              </p>

              {/* Quick Preset Chips */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar">
                {["Father's Name", 'Passport Number', 'Driver License', 'Emergency Contact', 'Notice Period', 'Expected Salary'].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => {
                      setQuickCustomKey(preset);
                      if (preset === 'Notice Period' && profile.work?.noticePeriod) setQuickCustomVal(profile.work.noticePeriod);
                      else if (preset === 'Expected Salary' && profile.work?.salaryExpectations) setQuickCustomVal(profile.work.salaryExpectations);
                    }}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-300 border border-slate-700/60 transition whitespace-nowrap cursor-pointer"
                  >
                    + {preset}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                <input
                  type="text"
                  value={quickCustomKey}
                  onChange={(e) => setQuickCustomKey(e.target.value)}
                  placeholder="Field Name (e.g. Father Name)"
                  className="w-full text-xs p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <input
                  type="text"
                  value={quickCustomVal}
                  onChange={(e) => setQuickCustomVal(e.target.value)}
                  placeholder="Value to fill..."
                  className="w-full text-xs p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                onClick={handleSaveAndAutofillCustom}
                disabled={!quickCustomKey.trim() || !quickCustomVal.trim()}
                className="w-full py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition disabled:opacity-40 cursor-pointer shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" /> Save & Autofill Field Now
              </button>
            </div>

            {/* AI Custom Question Responder */}
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <h4 className="text-xs font-semibold text-white">AI Question Helper</h4>
                </div>
                <select
                  value={selectedTone}
                  onChange={(e) => setSelectedTone(e.target.value as any)}
                  className="text-[11px] bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-slate-300 focus:outline-none"
                >
                  <option value="professional">Professional</option>
                  <option value="confident">Confident</option>
                  <option value="creative">Creative</option>
                </select>
              </div>

              {/* Quick Prompts Row */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {QUICK_PROMPTS.map((chip) => (
                  <button
                    key={chip}
                    onClick={() => setCustomQuestion(chip)}
                    className={`text-[10px] px-2.5 py-1 rounded-md whitespace-nowrap transition cursor-pointer border ${
                      customQuestion === chip
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700/60'
                    }`}
                  >
                    {chip}
                  </button>
                ))}
              </div>

              <textarea
                value={customQuestion}
                onChange={(e) => setCustomQuestion(e.target.value)}
                placeholder="Paste any application question here..."
                rows={2}
                className="w-full text-xs p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
              />

              <button
                onClick={handleGenerateAnswer}
                disabled={loading || !customQuestion.trim()}
                className="w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition disabled:opacity-40 cursor-pointer shadow-md shadow-indigo-600/20"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {loading ? 'Crafting answer...' : 'Generate Answer'}
              </button>

              {/* Generated Result Output */}
              {generatedAnswer && (
                <div className="mt-2.5 p-3 rounded-xl bg-slate-950 border border-indigo-500/40 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5 text-indigo-400 font-semibold">
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Tailored Answer</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500 font-mono">
                        {generatedAnswer.split(/\s+/).filter(Boolean).length} words
                      </span>
                      <button
                        onClick={() => handleCopy(generatedAnswer, 'Answer copied!')}
                        className="px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1 text-[11px] font-medium transition cursor-pointer"
                      >
                        <Copy className="w-3 h-3" /> Copy
                      </button>
                    </div>
                  </div>

                  <textarea
                    value={generatedAnswer}
                    onChange={(e) => setGeneratedAnswer(e.target.value)}
                    rows={4}
                    className="w-full text-xs p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 leading-relaxed focus:outline-none focus:border-indigo-500 resize-y"
                  />

                  <div className="flex items-center justify-end pt-0.5">
                    <button
                      onClick={() => {
                        const cleanKey = customQuestion.slice(0, 30).toLowerCase().replace(/[^a-z0-9]+/g, '_');
                        const updated = {
                          ...profile,
                          customAnswers: {
                            ...(profile.customAnswers || {}),
                            [cleanKey]: generatedAnswer,
                          },
                        };
                        setProfile(updated);
                        saveUserProfile(updated);
                        showToast('Saved to Profile Q&A!');
                      }}
                      className="text-[11px] text-cyan-400 hover:text-cyan-300 hover:underline cursor-pointer font-medium"
                    >
                      + Save to Profile Q&A
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 2: MULTI-CATEGORY PROFILE ================= */}
        {activeTab === 'profile' && (
          <div className="space-y-3.5">
            {/* First Time Welcome Banner */}
            {!profile.personal?.firstName && !profile.personal?.email && (
              <div className="p-3 rounded-xl bg-gradient-to-r from-indigo-500/20 via-cyan-500/15 to-transparent border border-indigo-500/30 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs">
                  <h4 className="font-bold text-white">Welcome! Enter your details once</h4>
                  <p className="text-slate-300 text-[11px] mt-0.5">
                    Fill in your details below so AI Job Seeker can autofill job applications for you automatically.
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Your Profile</h3>
                <p className="text-xs text-slate-400">Used to autofill your job applications.</p>
              </div>
              <button
                onClick={handleSaveProfile}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow cursor-pointer transition flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" /> Save Profile
              </button>
            </div>

            {/* Category Navigation Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] no-scrollbar">
              {PROFILE_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setProfileCategory(cat.id as any)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full whitespace-nowrap font-medium transition cursor-pointer ${
                      profileCategory === cat.id
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>

            {/* CATEGORY 1: CONTACT */}
            {profileCategory === 'contact' && (
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5">
                <span className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider">Contact & Address</span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400">First Name</label>
                    <input
                      type="text"
                      value={profile.personal.firstName}
                      placeholder="e.g. Mujib"
                      onChange={(e) => setProfile({ ...profile, personal: { ...profile.personal, firstName: e.target.value } })}
                      className="w-full text-xs p-2 rounded bg-slate-950 border border-slate-800 text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">Last Name</label>
                    <input
                      type="text"
                      value={profile.personal.lastName}
                      placeholder="e.g. Ur Rahman"
                      onChange={(e) => setProfile({ ...profile, personal: { ...profile.personal, lastName: e.target.value } })}
                      className="w-full text-xs p-2 rounded bg-slate-950 border border-slate-800 text-slate-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400">Email Address</label>
                    <input
                      type="email"
                      value={profile.personal.email}
                      placeholder="e.g. mujiburrahman.dev@gmail.com"
                      onChange={(e) => setProfile({ ...profile, personal: { ...profile.personal, email: e.target.value } })}
                      className="w-full text-xs p-2 rounded bg-slate-950 border border-slate-800 text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">Phone / Mobile</label>
                    <input
                      type="text"
                      value={profile.personal.phone}
                      placeholder="e.g. +92 348 1974606"
                      onChange={(e) => setProfile({ ...profile, personal: { ...profile.personal, phone: e.target.value } })}
                      className="w-full text-xs p-2 rounded bg-slate-950 border border-slate-800 text-slate-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400">National ID / CNIC (User ID)</label>
                  <input
                    type="text"
                    value={profile.personal.cnic || ''}
                    placeholder="e.g. 17301-1234567-1"
                    onChange={(e) => setProfile({ ...profile, personal: { ...profile.personal, cnic: e.target.value } })}
                    className="w-full text-xs p-2 rounded bg-slate-950 border border-slate-800 text-slate-200"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400">Street Address</label>
                  <input
                    type="text"
                    value={profile.personal.address}
                    placeholder="e.g. LynkZone Tech Center, 123 Main St"
                    onChange={(e) => setProfile({ ...profile, personal: { ...profile.personal, address: e.target.value } })}
                    className="w-full text-xs p-2 rounded bg-slate-950 border border-slate-800 text-slate-200"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400">City</label>
                    <input
                      type="text"
                      value={profile.personal.city}
                      placeholder="e.g. Peshawar"
                      onChange={(e) => setProfile({ ...profile, personal: { ...profile.personal, city: e.target.value } })}
                      className="w-full text-xs p-2 rounded bg-slate-950 border border-slate-800 text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">State / Province</label>
                    <input
                      type="text"
                      value={profile.personal.state}
                      placeholder="e.g. KP"
                      onChange={(e) => setProfile({ ...profile, personal: { ...profile.personal, state: e.target.value } })}
                      className="w-full text-xs p-2 rounded bg-slate-950 border border-slate-800 text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">Zip / Postal</label>
                    <input
                      type="text"
                      value={profile.personal.zipCode}
                      placeholder="e.g. 25000"
                      onChange={(e) => setProfile({ ...profile, personal: { ...profile.personal, zipCode: e.target.value } })}
                      className="w-full text-xs p-2 rounded bg-slate-950 border border-slate-800 text-slate-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400">Country</label>
                  <input
                    type="text"
                    value={profile.personal.country}
                    placeholder="e.g. Pakistan"
                    onChange={(e) => setProfile({ ...profile, personal: { ...profile.personal, country: e.target.value } })}
                    className="w-full text-xs p-2 rounded bg-slate-950 border border-slate-800 text-slate-200"
                  />
                </div>
              </div>
            )}

            {/* CATEGORY 2: LINKS */}
            {profileCategory === 'links' && (
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5">
                <span className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider">Online Profiles</span>
                <div>
                  <label className="text-[10px] text-slate-400">LinkedIn URL</label>
                  <input
                    type="url"
                    value={profile.personal.linkedIn}
                    onChange={(e) => setProfile({ ...profile, personal: { ...profile.personal, linkedIn: e.target.value } })}
                    placeholder="https://linkedin.com/in/mujiburrahman"
                    className="w-full text-xs p-2 rounded bg-slate-950 border border-slate-800 text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400">GitHub URL</label>
                  <input
                    type="url"
                    value={profile.personal.github}
                    onChange={(e) => setProfile({ ...profile, personal: { ...profile.personal, github: e.target.value } })}
                    placeholder="https://github.com/mujiburrahman"
                    className="w-full text-xs p-2 rounded bg-slate-950 border border-slate-800 text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400">Portfolio / Website</label>
                  <input
                    type="url"
                    value={profile.personal.portfolio}
                    onChange={(e) => setProfile({ ...profile, personal: { ...profile.personal, portfolio: e.target.value } })}
                    placeholder="https://lynkzone.dev"
                    className="w-full text-xs p-2 rounded bg-slate-950 border border-slate-800 text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400">Twitter / X URL</label>
                  <input
                    type="text"
                    value={profile.personal.twitter || ''}
                    onChange={(e) => setProfile({ ...profile, personal: { ...profile.personal, twitter: e.target.value } })}
                    placeholder="https://x.com/mujiburrahman"
                    className="w-full text-xs p-2 rounded bg-slate-950 border border-slate-800 text-slate-200"
                  />
                </div>
              </div>
            )}

            {/* CATEGORY 3: WORK & PREFERENCES */}
            {profileCategory === 'work' && (
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5">
                <span className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider">Work & Experience</span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400">Current Job Title</label>
                    <input
                      type="text"
                      value={profile.work.currentTitle}
                      placeholder="e.g. Lead Software Engineer"
                      onChange={(e) => setProfile({ ...profile, work: { ...profile.work, currentTitle: e.target.value } })}
                      className="w-full text-xs p-2 rounded bg-slate-950 border border-slate-800 text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">Current Employer</label>
                    <input
                      type="text"
                      value={profile.work.currentCompany}
                      placeholder="e.g. LynkZone"
                      onChange={(e) => setProfile({ ...profile, work: { ...profile.work, currentCompany: e.target.value } })}
                      className="w-full text-xs p-2 rounded bg-slate-950 border border-slate-800 text-slate-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400">Years of Experience</label>
                    <input
                      type="text"
                      value={profile.work.yearsExperience}
                      placeholder="e.g. 5"
                      onChange={(e) => setProfile({ ...profile, work: { ...profile.work, yearsExperience: e.target.value } })}
                      className="w-full text-xs p-2 rounded bg-slate-950 border border-slate-800 text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">Desired Salary</label>
                    <input
                      type="text"
                      value={profile.work.salaryExpectations}
                      placeholder="e.g. $80,000 / year or Negotiable"
                      onChange={(e) => setProfile({ ...profile, work: { ...profile.work, salaryExpectations: e.target.value } })}
                      className="w-full text-xs p-2 rounded bg-slate-950 border border-slate-800 text-slate-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400">Work Location</label>
                    <select
                      value={profile.work.workLocationPreference || 'Remote'}
                      onChange={(e) => setProfile({ ...profile, work: { ...profile.work, workLocationPreference: e.target.value } })}
                      className="w-full text-xs p-2 rounded bg-slate-950 border border-slate-800 text-slate-200"
                    >
                      <option value="Remote">Remote</option>
                      <option value="Hybrid">Hybrid</option>
                      <option value="On-site">On-site</option>
                      <option value="Flexible">Flexible</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">Relocate?</label>
                    <select
                      value={profile.work.willingToRelocate || 'Negotiable'}
                      onChange={(e) => setProfile({ ...profile, work: { ...profile.work, willingToRelocate: e.target.value } })}
                      className="w-full text-xs p-2 rounded bg-slate-950 border border-slate-800 text-slate-200"
                    >
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                      <option value="Negotiable">Negotiable</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">Notice Period</label>
                    <input
                      type="text"
                      value={profile.work.noticePeriod || 'Immediate'}
                      placeholder="e.g. 2 weeks or Immediate"
                      onChange={(e) => setProfile({ ...profile, work: { ...profile.work, noticePeriod: e.target.value } })}
                      className="w-full text-xs p-2 rounded bg-slate-950 border border-slate-800 text-slate-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400">Career Summary</label>
                  <textarea
                    rows={3}
                    value={profile.work.summary}
                    placeholder="e.g. Full-stack software engineer with 5+ years building web and mobile applications..."
                    onChange={(e) => setProfile({ ...profile, work: { ...profile.work, summary: e.target.value } })}
                    className="w-full text-xs p-2 rounded bg-slate-950 border border-slate-800 text-slate-200 resize-none"
                  />
                </div>
              </div>
            )}

            {/* CATEGORY 4: EDUCATION & LEGAL */}
            {profileCategory === 'education' && (
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5">
                <span className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider">Education & Authorization</span>
                <div>
                  <label className="text-[10px] text-slate-400">University / College</label>
                  <input
                    type="text"
                    value={profile.education.school}
                    placeholder="e.g. University of California, Berkeley"
                    onChange={(e) => setProfile({ ...profile, education: { ...profile.education, school: e.target.value } })}
                    className="w-full text-xs p-2 rounded bg-slate-950 border border-slate-800 text-slate-200"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400">Degree</label>
                    <input
                      type="text"
                      value={profile.education.degree}
                      onChange={(e) => setProfile({ ...profile, education: { ...profile.education, degree: e.target.value } })}
                      placeholder="e.g. Bachelor of Science"
                      className="w-full text-xs p-2 rounded bg-slate-950 border border-slate-800 text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">Field of Study</label>
                    <input
                      type="text"
                      value={profile.education.fieldOfStudy}
                      onChange={(e) => setProfile({ ...profile, education: { ...profile.education, fieldOfStudy: e.target.value } })}
                      placeholder="e.g. Computer Science"
                      className="w-full text-xs p-2 rounded bg-slate-950 border border-slate-800 text-slate-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400">Graduation Year</label>
                    <input
                      type="text"
                      value={profile.education.graduationYear}
                      placeholder="e.g. 2024"
                      onChange={(e) => setProfile({ ...profile, education: { ...profile.education, graduationYear: e.target.value } })}
                      className="w-full text-xs p-2 rounded bg-slate-950 border border-slate-800 text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">GPA (Optional)</label>
                    <input
                      type="text"
                      value={profile.education.gpa}
                      placeholder="e.g. 3.8"
                      onChange={(e) => setProfile({ ...profile, education: { ...profile.education, gpa: e.target.value } })}
                      className="w-full text-xs p-2 rounded bg-slate-950 border border-slate-800 text-slate-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/60">
                  <div>
                    <label className="text-[10px] text-slate-400">Authorized to Work?</label>
                    <select
                      value={profile.authorization.legallyAuthorized ? 'yes' : 'no'}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          authorization: { ...profile.authorization, legallyAuthorized: e.target.value === 'yes' },
                        })
                      }
                      className="w-full text-xs p-2 rounded bg-slate-950 border border-slate-800 text-slate-200"
                    >
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">Require Sponsorship?</label>
                    <select
                      value={profile.authorization.sponsorshipRequired ? 'yes' : 'no'}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          authorization: { ...profile.authorization, sponsorshipRequired: e.target.value === 'yes' },
                        })
                      }
                      className="w-full text-xs p-2 rounded bg-slate-950 border border-slate-800 text-slate-200"
                    >
                      <option value="no">No</option>
                      <option value="yes">Yes</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* CATEGORY 5: EEO / DEMOGRAPHICS */}
            {profileCategory === 'eeo' && (
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5">
                <span className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider">Demographics (EEO)</span>

                <div>
                  <label className="text-[10px] text-slate-400">Gender Identity</label>
                  <select
                    value={profile.eeo?.gender || 'Decline to self-identify'}
                    onChange={(e) => setProfile({ ...profile, eeo: { ...profile.eeo, gender: e.target.value } })}
                    className="w-full text-xs p-2 rounded bg-slate-950 border border-slate-800 text-slate-200"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Non-binary">Non-binary</option>
                    <option value="Decline to self-identify">Decline to self-identify</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400">Race / Ethnicity</label>
                  <select
                    value={profile.eeo?.raceEthnicity || 'Decline to self-identify'}
                    onChange={(e) => setProfile({ ...profile, eeo: { ...profile.eeo, raceEthnicity: e.target.value } })}
                    className="w-full text-xs p-2 rounded bg-slate-950 border border-slate-800 text-slate-200"
                  >
                    <option value="White">White</option>
                    <option value="Black or African American">Black or African American</option>
                    <option value="Asian">Asian</option>
                    <option value="Hispanic or Latino">Hispanic or Latino</option>
                    <option value="Two or More Races">Two or More Races</option>
                    <option value="Decline to self-identify">Decline to self-identify</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400">Veteran Status</label>
                  <select
                    value={profile.eeo?.veteranStatus || 'I am not a protected veteran'}
                    onChange={(e) => setProfile({ ...profile, eeo: { ...profile.eeo, veteranStatus: e.target.value } })}
                    className="w-full text-xs p-2 rounded bg-slate-950 border border-slate-800 text-slate-200"
                  >
                    <option value="I am not a protected veteran">I am not a protected veteran</option>
                    <option value="I identify as a protected veteran">I identify as a protected veteran</option>
                    <option value="I decline to self-identify">I decline to self-identify</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400">Disability Status</label>
                  <select
                    value={profile.eeo?.disabilityStatus || 'No, I do not have a disability'}
                    onChange={(e) => setProfile({ ...profile, eeo: { ...profile.eeo, disabilityStatus: e.target.value } })}
                    className="w-full text-xs p-2 rounded bg-slate-950 border border-slate-800 text-slate-200"
                  >
                    <option value="No, I do not have a disability">No, I do not have a disability</option>
                    <option value="Yes, I have a disability">Yes, I have a disability</option>
                    <option value="I decline to self-identify">I decline to self-identify</option>
                  </select>
                </div>
              </div>
            )}

            {/* CATEGORY 6: SKILLS & CERTS */}
            {profileCategory === 'skills' && (
              <div className="space-y-3">
                {/* Skills */}
                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5">
                  <span className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider">Skills</span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddSkill()}
                      placeholder="Add skill (e.g. React, Python)..."
                      className="flex-1 text-xs p-2 rounded bg-slate-950 border border-slate-800 text-slate-200"
                    />
                    <button
                      onClick={handleAddSkill}
                      className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 rounded text-xs text-white cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1 max-h-28 overflow-y-auto">
                    {profile.skills.length === 0 ? (
                      <p className="text-[11px] text-slate-500 italic">No skills added yet. Type a skill above and click +</p>
                    ) : (
                      profile.skills.map((skill) => (
                        <span
                          key={skill}
                          className="inline-flex items-center gap-1.5 text-[11px] bg-indigo-950/60 text-indigo-300 border border-indigo-800/60 px-2.5 py-1 rounded-md"
                        >
                          {skill}
                          <button
                            onClick={() => handleRemoveSkill(skill)}
                            className="hover:text-red-400 p-0.5 rounded transition cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                </div>

                {/* Certifications */}
                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5">
                  <span className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider">Certifications</span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCert}
                      onChange={(e) => setNewCert(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddCert()}
                      placeholder="Add certification (e.g. AWS Solutions Architect)..."
                      className="flex-1 text-xs p-2 rounded bg-slate-950 border border-slate-800 text-slate-200"
                    />
                    <button
                      onClick={handleAddCert}
                      className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 rounded text-xs text-white cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {(!profile.certifications || profile.certifications.length === 0) ? (
                      <p className="text-[11px] text-slate-500 italic">No certifications added yet. (Optional)</p>
                    ) : (
                      profile.certifications.map((cert) => (
                        <span
                          key={cert}
                          className="inline-flex items-center gap-1.5 text-[11px] bg-cyan-950/60 text-cyan-300 border border-cyan-800/60 px-2.5 py-1 rounded-md"
                        >
                          {cert}
                          <button
                            onClick={() => handleRemoveCert(cert)}
                            className="hover:text-red-400 p-0.5 rounded transition cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* CATEGORY 7: CUSTOM FIELDS & MISSING INPUTS */}
            {profileCategory === 'custom' && (
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider">Custom Fields & Missing Inputs</span>
                  <span className="text-[10px] text-slate-500">{Object.keys(profile.customAnswers || {}).length} saved</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Save missing application inputs (e.g. Father's Name, Driver's License, Emergency Contact) so they autofill automatically.
                </p>

                {/* Preset Chips */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar">
                  {["Father's Name", "Mother's Name", 'Passport Number', 'Driver License', 'Emergency Contact', 'Notice Period', 'Expected Salary'].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => {
                        setCustomKeyInput(preset);
                        if (preset === 'Notice Period' && profile.work?.noticePeriod) setCustomValInput(profile.work.noticePeriod);
                        else if (preset === 'Expected Salary' && profile.work?.salaryExpectations) setCustomValInput(profile.work.salaryExpectations);
                      }}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-300 border border-slate-700/60 transition whitespace-nowrap cursor-pointer"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>

                <div className="space-y-2 p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80">
                  <input
                    type="text"
                    value={customKeyInput}
                    onChange={(e) => setCustomKeyInput(e.target.value)}
                    placeholder="Field name or question (e.g. Father's Name, emergency contact)..."
                    className="w-full text-xs p-2 rounded bg-slate-900 border border-slate-800 text-slate-200"
                  />
                  <textarea
                    rows={2}
                    value={customValInput}
                    onChange={(e) => setCustomValInput(e.target.value)}
                    placeholder="Your saved answer or value to fill..."
                    className="w-full text-xs p-2 rounded bg-slate-900 border border-slate-800 text-slate-200 resize-none"
                  />
                  <button
                    onClick={handleAddCustomField}
                    disabled={!customKeyInput.trim() || !customValInput.trim()}
                    className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer transition shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Custom Field
                  </button>
                </div>

                <div className="space-y-2 max-h-44 overflow-y-auto pt-1">
                  {Object.keys(profile.customAnswers || {}).length === 0 ? (
                    <p className="text-[11px] text-slate-500 italic text-center py-2">
                      No custom fields added yet. Add common application questions or missing inputs above!
                    </p>
                  ) : (
                    Object.entries(profile.customAnswers || {}).map(([key, val]) => (
                      <div key={key} className="p-2 rounded-lg bg-slate-950 border border-slate-800/80 text-xs flex justify-between gap-2 items-center">
                        <div className="overflow-hidden">
                          <span className="font-semibold text-indigo-400 block truncate capitalize">{key.replace(/_/g, ' ')}</span>
                          <p className="text-slate-300 text-[11px] line-clamp-2">{val}</p>
                        </div>
                        <button
                          onClick={() => handleRemoveCustomField(key)}
                          className="text-slate-500 hover:text-red-400 p-1 flex-shrink-0 cursor-pointer"
                          title="Remove custom field"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 3: COVER LETTER ================= */}
        {activeTab === 'cover-letter' && (
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Cover Letter</h3>
                <p className="text-xs text-slate-400">
                  {pageInfo.company ? `Tailored for ${pageInfo.company}` : 'Tailored to the active job listing'}
                </p>
              </div>
              <button
                onClick={handleGenerateCoverLetter}
                disabled={loading}
                className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white text-xs font-semibold shadow flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {loading ? 'Writing...' : 'Generate Letter'}
              </button>
            </div>

            {coverLetter ? (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="text-[11px] text-slate-400 font-mono">
                    {coverLetter.split(/\s+/).filter(Boolean).length} words
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCopy(coverLetter, 'Cover letter copied!')}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1 text-xs cursor-pointer transition"
                    >
                      <Copy className="w-3 h-3" /> Copy
                    </button>
                    <button
                      onClick={handleDownloadCoverLetter}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1 text-xs cursor-pointer transition"
                    >
                      <Download className="w-3 h-3" /> Download .txt
                    </button>
                  </div>
                </div>

                <textarea
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  rows={13}
                  className="w-full text-xs p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 leading-relaxed focus:outline-none focus:border-indigo-500 resize-none font-sans"
                />
              </div>
            ) : (
              <div className="p-8 text-center rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-3">
                <div className="w-12 h-12 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto">
                  <FileText className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-semibold text-white">No cover letter generated yet</h4>
                <p className="text-xs text-slate-400 max-w-[300px] mx-auto">
                  Click Generate above to write a tailored cover letter matched to this job posting.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 4: APPLIED TRACKER ================= */}
        {activeTab === 'tracker' && (
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Application Tracker</h3>
                <p className="text-xs text-slate-400">Keep track of every job you applied to.</p>
              </div>
              {applications.length > 0 && (
                <button
                  onClick={() => {
                    const csvContent =
                      'data:text/csv;charset=utf-8,' +
                      'Company,Job Title,Applied Date,Status,URL\n' +
                      applications.map((a) => `"${a.company}","${a.jobTitle}","${a.appliedDate}","${a.status}","${a.url}"`).join('\n');
                    const encodedUri = encodeURI(csvContent);
                    const link = document.createElement('a');
                    link.setAttribute('href', encodedUri);
                    link.setAttribute('download', `Job_Applications_${new Date().toISOString().split('T')[0]}.csv`);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    showToast('Exported to CSV!');
                  }}
                  className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3 h-3" /> Export CSV
                </button>
              )}
            </div>

            {applications.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-2">
                <Clock className="w-8 h-8 text-slate-500 mx-auto opacity-60" />
                <h4 className="text-sm font-semibold text-white">No applications yet</h4>
                <p className="text-xs text-slate-400 max-w-[280px] mx-auto">
                  When you autofill a job, it will automatically be saved and tracked here.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1">
                {applications.map((app) => (
                  <div
                    key={app.id}
                    className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-3 hover:border-slate-700 transition"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-semibold text-white truncate">{app.jobTitle}</h4>
                        {app.url && (
                          <a href={app.url} target="_blank" rel="noreferrer" className="text-slate-500 hover:text-cyan-400">
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400">{app.company} • {app.appliedDate}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={app.status}
                        onChange={(e) => {
                          updateApplicationStatus(app.id, e.target.value as any);
                          setApplications(applications.map((a) => (a.id === app.id ? { ...a, status: e.target.value as any } : a)));
                        }}
                        className={`text-[10px] font-medium px-2 py-1 rounded-full border focus:outline-none cursor-pointer ${
                          app.status === 'Applied'
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                            : app.status === 'Interview'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : app.status === 'Offer'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        <option value="Applied">Applied</option>
                        <option value="Screening">Screening</option>
                        <option value="Interview">Interview</option>
                        <option value="Offer">Offer</option>
                        <option value="Rejected">Rejected</option>
                      </select>

                      <button
                        onClick={async () => {
                          await deleteJobApplication(app.id);
                          setApplications(applications.filter((a) => a.id !== app.id));
                          showToast('Application deleted');
                        }}
                        className="text-slate-500 hover:text-red-400 p-1 cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 5: SETTINGS ================= */}
        {activeTab === 'settings' && (
          <div className="space-y-3.5">
            <div>
              <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Settings</h3>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Manage preferences and subscription.</p>
            </div>

            {/* Current Plan Card */}
            <div
              className={`p-3.5 rounded-xl border space-y-2.5 ${
                isDark
                  ? 'bg-gradient-to-br from-indigo-950/60 to-slate-900 border-indigo-500/30'
                  : 'bg-gradient-to-br from-indigo-50/90 to-blue-50/70 border-indigo-200 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Current Plan</span>
                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                    subscription.isPro
                      ? isDark
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : isDark
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-amber-100 text-amber-900 border border-amber-300'
                  }`}
                >
                  {subscription.isPro ? 'PRO UNLIMITED' : 'FREE TIER'}
                </span>
              </div>
              <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                {subscription.isPro
                  ? 'Unlimited 1-click autofills, cover letters, and custom AI responses.'
                  : `${remainingQuota} of ${freeLimit} free applications remaining this month. Resets on the 1st.`}
              </p>

              <button
                onClick={() => setShowPricingModal(true)}
                className="w-full py-2 rounded-lg bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:brightness-110 text-slate-950 font-extrabold text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Crown className="w-3.5 h-3.5" />
                <span>{subscription.isPro ? 'Manage Subscription' : 'Upgrade to Pro ($2.99 / $8.99)'}</span>
              </button>
            </div>

            {/* Visual Appearance */}
            <div
              className={`p-3 rounded-xl border flex items-center justify-between ${
                isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              <div>
                <h4 className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Appearance</h4>
                <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Switch between Dark and Light mode.</p>
              </div>
              <div
                className={`flex items-center gap-1 p-1 rounded-lg border ${
                  isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
                }`}
              >
                <button
                  type="button"
                  onClick={() => theme !== 'dark' && handleToggleTheme()}
                  className={`flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md transition cursor-pointer ${
                    theme === 'dark'
                      ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Moon className="w-3 h-3" /> Dark
                </button>
                <button
                  type="button"
                  onClick={() => theme !== 'light' && handleToggleTheme()}
                  className={`flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md transition cursor-pointer ${
                    theme === 'light'
                      ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Sun className="w-3 h-3" /> Light
                </button>
              </div>
            </div>

            {/* On-Screen Floating Button */}
            <div
              className={`p-3 rounded-xl border flex items-center justify-between ${
                isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              <div>
                <h4 className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>On-Screen Button</h4>
                <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Show 1-click floating button on job web pages.
                </p>
              </div>
              <button
                type="button"
                onClick={handleToggleFloatingWidget}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                  showFloatingWidget ? 'bg-indigo-600' : isDark ? 'bg-slate-800' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    showFloatingWidget ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* License Key Activation */}
            <div
              className={`p-3 rounded-xl border space-y-2 ${
                isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              <h4 className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Activate License Key</h4>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={licenseInput}
                  onChange={(e) => setLicenseInput(e.target.value)}
                  placeholder="Paste License Key or Email..."
                  className={`flex-1 text-xs p-2 rounded border focus:outline-none focus:border-indigo-500 ${
                    isDark
                      ? 'bg-slate-950 border-slate-800 text-slate-200 placeholder-slate-600'
                      : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                  }`}
                />
                <button
                  onClick={() => handleVerifyLicense()}
                  disabled={activatingLicense || !licenseInput.trim()}
                  className={`px-3 py-2 rounded text-xs font-bold transition flex items-center justify-center cursor-pointer ${
                    licenseInput.trim()
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm'
                      : isDark
                      ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                      : 'bg-slate-200 text-slate-500 border border-slate-300 cursor-not-allowed'
                  }`}
                >
                  {activatingLicense ? 'Checking...' : 'Activate'}
                </button>
              </div>
            </div>

            {/* Backup & Restore Profile */}
            <div
              className={`p-3 rounded-xl border space-y-2 ${
                isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              <h4 className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Backup & Restore Profile</h4>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(profile, null, 2));
                    const link = document.createElement('a');
                    link.setAttribute('href', dataStr);
                    link.setAttribute('download', 'AI_Job_Seeker_Profile.json');
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    showToast('Profile exported!');
                  }}
                  className="flex-1 py-1.5 px-3 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Export JSON
                </button>

                <label className="flex-1 py-1.5 px-3 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 flex items-center justify-center gap-1.5 cursor-pointer">
                  <ExternalLink className="w-3.5 h-3.5" /> Import JSON
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        try {
                          const parsed = JSON.parse(event.target?.result as string);
                          setProfile(parsed);
                          saveUserProfile(parsed);
                          showToast('Profile imported successfully!');
                        } catch {
                          showToast('Invalid JSON file.');
                        }
                      };
                      reader.readAsText(file);
                    }}
                  />
                </label>
              </div>
            </div>

            {/* New Customer Guide Card */}
            <div
              className={`p-3 rounded-xl border flex items-center justify-between ${
                isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              <div>
                <h4 className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>How It Works Guide</h4>
                <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Quick 3-step walkthrough on how to autofill jobs.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(true)}
                className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>View Guide</span>
              </button>
            </div>

            {/* WhatsApp Support Card */}
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
              <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wide">
                LynkZone WhatsApp Support
              </span>
              <p className="text-xs text-slate-400">
                Direct questions, feature requests, or local payment options (Easypaisa, Jazzcash, Bank, Crypto).
              </p>
              <a
                href={`https://wa.me/923481974606?text=${encodeURIComponent(
                  'Hello LynkZone! I have a question about AI Job Seeker.'
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 px-3 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition text-decoration-none cursor-pointer"
              >
                <span>Chat on WhatsApp (+92 348 1974606)</span>
              </a>
            </div>
          </div>
        )}
      </main>

      {/* Clean, Minimal Footer */}
      <footer className="px-4 py-2 border-t border-slate-800/80 bg-[#090d16] text-[10px] text-slate-500 flex items-center justify-between">
        <span>LynkZone • AI Job Seeker</span>
        <span className="flex items-center gap-1 text-slate-400">
          <ShieldCheck className="w-3 h-3 text-emerald-400" /> Private & Local Storage
        </span>
      </footer>

      {/* ================= HOW IT WORKS QUICK GUIDE MODAL ================= */}
      {showGuideModal && (
        <div
          className={`absolute inset-0 z-50 backdrop-blur-md flex flex-col p-5 overflow-y-auto ${
            isDark ? 'bg-[#090d16]/95 text-slate-100' : 'bg-white/98 text-slate-900 shadow-2xl'
          }`}
        >
          {/* Modal Header */}
          <div className={`flex items-center justify-between pb-3 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-500 to-cyan-400 flex items-center justify-center shadow-sm">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>How AI Job Seeker Works</span>
            </div>
            <button
              onClick={handleCloseGuide}
              className={`p-1 rounded-lg transition cursor-pointer ${
                isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title="Close guide"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="py-2.5 text-center">
            <h2 className={`text-sm font-extrabold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Apply 10x Faster in 3 Steps
            </h2>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Your personal autofill copilot for any job site.
            </p>
          </div>

          {/* 3 Step Cards */}
          <div className="space-y-2.5 my-2">
            {/* Step 1 */}
            <div
              className={`p-3 rounded-xl border flex items-start gap-3 ${
                isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="w-7 h-7 rounded-full bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center flex-shrink-0 font-bold text-xs">
                1
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <h4 className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Save Your Profile</h4>
                  <span
                    className="text-[10px] text-cyan-400 font-semibold cursor-pointer hover:underline"
                    onClick={handleGuideGoToProfile}
                  >
                    Go to Profile →
                  </span>
                </div>
                <p className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Enter your name, email, phone, and skills in the Profile tab. Stored safely on your computer.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div
              className={`p-3 rounded-xl border flex items-start gap-3 ${
                isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="w-7 h-7 rounded-full bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center flex-shrink-0 font-bold text-xs">
                2
              </div>
              <div className="min-w-0 flex-1">
                <h4 className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Open Any Job Posting</h4>
                <p className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Browse job applications on LinkedIn, Indeed, Greenhouse, Workday, or any careers page.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div
              className={`p-3 rounded-xl border flex items-start gap-3 ${
                isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="w-7 h-7 rounded-full bg-amber-600/20 text-amber-400 border border-amber-500/30 flex items-center justify-center flex-shrink-0 font-bold text-xs">
                3
              </div>
              <div className="min-w-0 flex-1">
                <h4 className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>1-Click Autofill</h4>
                <p className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Click <strong className="text-indigo-400">⚡ Autofill Application</strong> or click the on-screen floating button to fill every field instantly!
                </p>
              </div>
            </div>
          </div>

          {/* AI Features Note */}
          <div
            className={`p-2.5 rounded-xl border space-y-1 ${
              isDark ? 'bg-indigo-950/30 border-indigo-800/40' : 'bg-indigo-50 border-indigo-200'
            }`}
          >
            <span className={`text-[11px] font-bold flex items-center gap-1.5 ${isDark ? 'text-indigo-300' : 'text-indigo-900'}`}>
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> AI Bonus Features:
            </span>
            <p className={`text-[10px] leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              • <strong>AI Question Helper:</strong> Instant answers for questions like <em>"Why do you want to work here?"</em><br/>
              • <strong>ATS Cover Letters:</strong> 1-click tailored letters matched to the job description.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="mt-auto pt-3 space-y-2">
            <button
              onClick={handleGuideGoToProfile}
              className="w-full py-2.5 rounded-lg bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-bold text-xs shadow-md shadow-indigo-600/25 transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>Set Up My Profile Now (1 min) →</span>
            </button>

            <button
              onClick={handleCloseGuide}
              className={`w-full py-1.5 text-center text-xs font-medium cursor-pointer transition ${
                isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Got it, start applying
            </button>
          </div>
        </div>
      )}

      {/* ================= PRICING & UPGRADE MODAL ================= */}
      {showPricingModal && (
        <div
          className={`absolute inset-0 z-50 backdrop-blur-md flex flex-col p-5 overflow-y-auto ${
            isDark ? 'bg-[#090d16]/95 text-slate-100' : 'bg-white/98 text-slate-900 shadow-2xl'
          }`}
        >
          {/* Modal Header */}
          <div className={`flex items-center justify-between pb-3 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-500 to-orange-400 flex items-center justify-center shadow-sm">
                <Crown className="w-4 h-4 text-slate-950" />
              </div>
              <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>Choose Your Plan</span>
            </div>
            <button
              onClick={() => setShowPricingModal(false)}
              className={`p-1 rounded-lg transition cursor-pointer ${
                isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="py-2.5 text-center">
            <h2 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Simple, Fair Pricing</h2>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Apply 10x faster and land more interviews.
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-2 gap-3 my-2">
            {/* Monthly Pro */}
            <div
              onClick={() => setPricingTier('monthly')}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                pricingTier === 'monthly'
                  ? isDark
                    ? 'bg-gradient-to-b from-indigo-950/80 to-slate-900 border-indigo-500 shadow-md shadow-indigo-500/10'
                    : 'bg-indigo-50/70 border-indigo-500 shadow-md shadow-indigo-500/15'
                  : isDark
                  ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
              }`}
            >
              <div>
                <span className={`text-[11px] font-bold ${isDark ? 'text-indigo-400' : 'text-indigo-700'}`}>Monthly Pro</span>
                <div className="flex items-baseline gap-1 my-1">
                  <span className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>$2.99</span>
                  <span className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>/ mo</span>
                </div>
                <p className={`text-[10px] font-medium ${isDark ? 'text-indigo-300' : 'text-indigo-700'}`}>Cancel anytime</p>

                <ul className={`space-y-1.5 mt-3 text-[11px] ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  <li className="flex items-center gap-1.5">
                    <Check className={`w-3 h-3 flex-shrink-0 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                    <span>Unlimited Autofills</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check className={`w-3 h-3 flex-shrink-0 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                    <span>AI Question Helper</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check className={`w-3 h-3 flex-shrink-0 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                    <span>Tailored Cover Letters</span>
                  </li>
                </ul>
              </div>

              <div className={`mt-3 pt-2 border-t ${isDark ? 'border-slate-800/60' : 'border-slate-200'}`}>
                <div
                  className={`w-full py-1 text-center rounded text-[11px] font-bold ${
                    pricingTier === 'monthly'
                      ? isDark
                        ? 'text-indigo-300 bg-indigo-500/10'
                        : 'text-indigo-800 bg-indigo-100'
                      : 'text-slate-500'
                  }`}
                >
                  {pricingTier === 'monthly' ? 'Selected' : 'Choose Monthly'}
                </div>
              </div>
            </div>

            {/* Lifetime Pass */}
            <div
              onClick={() => setPricingTier('lifetime')}
              className={`p-3.5 rounded-xl border relative transition-all cursor-pointer flex flex-col justify-between ${
                pricingTier === 'lifetime'
                  ? isDark
                    ? 'bg-gradient-to-b from-amber-950/40 via-slate-900 to-slate-900 border-amber-500 shadow-md shadow-amber-500/10'
                    : 'bg-amber-50/70 border-amber-500 shadow-md shadow-amber-500/15'
                  : isDark
                  ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
              }`}
            >
              <div className="absolute -top-2.5 right-3 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 text-[9px] font-extrabold px-2 py-0.5 rounded-full shadow-sm">
                BEST VALUE
              </div>

              <div>
                <span className={`text-[11px] font-bold ${isDark ? 'text-amber-400' : 'text-amber-800'}`}>Lifetime Pass</span>
                <div className="flex items-baseline gap-1 my-1">
                  <span className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>$8.99</span>
                  <span className={`text-[11px] font-bold ${isDark ? 'text-amber-400/80' : 'text-amber-700'}`}>once</span>
                </div>
                <p className={`text-[10px] font-semibold ${isDark ? 'text-amber-300/90' : 'text-amber-800'}`}>Pay once, keep forever</p>

                <ul className={`space-y-1.5 mt-3 text-[11px] ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  <li className="flex items-center gap-1.5">
                    <Check className={`w-3 h-3 flex-shrink-0 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                    <span>Everything in Pro</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check className={`w-3 h-3 flex-shrink-0 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                    <span>0 Recurring Fees</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check className={`w-3 h-3 flex-shrink-0 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                    <span>Lifetime Future Updates</span>
                  </li>
                </ul>
              </div>

              <div className={`mt-3 pt-2 border-t ${isDark ? 'border-slate-800/60' : 'border-slate-200'}`}>
                <div
                  className={`w-full py-1 text-center rounded text-[11px] font-bold ${
                    pricingTier === 'lifetime'
                      ? isDark
                        ? 'text-amber-400 bg-amber-500/10'
                        : 'text-amber-900 bg-amber-100'
                      : 'text-slate-500'
                  }`}
                >
                  {pricingTier === 'lifetime' ? 'Selected' : 'Choose Lifetime'}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-2 space-y-2">
            <button
              onClick={() => handleStartCheckout(pricingTier)}
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:brightness-110 text-slate-950 font-extrabold text-xs shadow-md shadow-orange-500/20 transition cursor-pointer flex items-center justify-center gap-2"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>
                {pricingTier === 'lifetime' ? 'Proceed to Checkout • $8.99 Lifetime' : 'Proceed to Checkout • $2.99 / mo'}
              </span>
            </button>

            <a
              href={`https://wa.me/923481974606?text=${encodeURIComponent(
                `Hello LynkZone! I want to purchase AI Job Seeker Pro (${
                  pricingTier === 'lifetime' ? 'Lifetime Pass $8.99' : 'Monthly Pro $2.99/mo'
                }). Please send direct payment details & license key.`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2 px-3 rounded-lg bg-emerald-600/90 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer text-decoration-none"
            >
              <span>Quick Buy via WhatsApp (+92 348 1974606)</span>
            </a>

            {/* License Key Input */}
            <div
              className={`p-2 rounded-lg border space-y-1.5 ${
                isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <span className={`text-[10px] block font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Already purchased? Enter your key:
              </span>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={licenseInput}
                  onChange={(e) => setLicenseInput(e.target.value)}
                  placeholder="e.g. LIFE-XXXX-YYYY or account email"
                  className={`flex-1 text-[11px] p-1.5 rounded border focus:outline-none focus:border-indigo-500 ${
                    isDark
                      ? 'bg-slate-900 border-slate-800 text-slate-200 placeholder-slate-600'
                      : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                  }`}
                />
                <button
                  onClick={() => handleVerifyLicense()}
                  disabled={activatingLicense || !licenseInput.trim()}
                  className={`px-3 py-1.5 rounded text-[11px] font-bold transition flex items-center justify-center cursor-pointer ${
                    licenseInput.trim()
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm'
                      : isDark
                      ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                      : 'bg-slate-200 text-slate-500 border border-slate-300 cursor-not-allowed'
                  }`}
                >
                  {activatingLicense ? 'Checking...' : 'Activate'}
                </button>
              </div>
            </div>
          </div>

          {/* Guarantee info */}
          <div className="mt-auto pt-3 text-center text-[10px] text-slate-500">
            <div className="flex items-center justify-center gap-1.5 text-slate-400">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>Secured by Stripe & ExtensionPay • 30-Day Money Back Guarantee</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Direct injection function executed inside the webpage by chrome.scripting
function directAutofillScript(profile: any): number {
  function setVal(el: any, val: any): boolean {
    if (!val || typeof val !== 'string' || !val.trim()) return false;
    const trimmed = val.trim();

    // 1. Reset React 16+ internal valueTracker
    if (el._valueTracker) {
      el._valueTracker.setValue('');
    }

    // 2. Prototype property descriptor setter
    const valSetter = Object.getOwnPropertyDescriptor(el, 'value')?.set;
    const proto = Object.getPrototypeOf(el);
    const protoValSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;

    if (protoValSetter && valSetter !== protoValSetter) {
      protoValSetter.call(el, trimmed);
    } else if (valSetter) {
      valSetter.call(el, trimmed);
    } else {
      el.value = trimmed;
    }

    // 3. Dispatch events
    el.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    el.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    return true;
  }

  function getDesc(el: HTMLElement): string {
    const parts = [
      el.id || '',
      el.getAttribute('name') || '',
      el.getAttribute('placeholder') || '',
      el.getAttribute('type') || '',
      el.getAttribute('aria-label') || '',
      el.getAttribute('autocomplete') || '',
      el.getAttribute('title') || '',
      el.getAttribute('data-testid') || '',
    ];
    if (el.id) {
      const lbl = document.querySelector(`label[for="${el.id}"]`);
      if (lbl && lbl.textContent) parts.push(lbl.textContent.trim());
    }
    const pl = el.closest('label');
    if (pl && pl.textContent) parts.push(pl.textContent.trim());

    let prev = el.previousElementSibling;
    while (prev) {
      if (prev.tagName.toLowerCase() === 'label' || (prev as any).className?.includes?.('label')) {
        parts.push(prev.textContent?.trim() || '');
        break;
      }
      prev = prev.previousElementSibling;
    }

    const parent = el.parentElement;
    if (parent && parent.querySelectorAll('input, select, textarea').length <= 1) {
      const parentPrev = parent.previousElementSibling;
      if (parentPrev && (parentPrev.tagName.toLowerCase() === 'label' || parentPrev.querySelector('label'))) {
        parts.push(parentPrev.textContent?.trim() || '');
      }
      const internalLabel = parent.querySelector('label, .label, .control-label');
      if (internalLabel && internalLabel.textContent) {
        parts.push(internalLabel.textContent.trim());
      }
    }

    return parts.join(' ').toLowerCase();
  }

  const inputs = Array.from(
    document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="image"]), textarea, select'
    )
  );

  let count = 0;

  for (const input of inputs) {
    if (input.value && input.value.trim().length > 0 && input.type !== 'radio' && input.type !== 'checkbox') {
      continue;
    }

    const desc = getDesc(input);
    let matched = false;

    // Phone / Mobile (Check first so "Mobile" field never gets filled with email!)
    if (/phone|mobile|tel\b|cellular|contact[\s_-]?number/i.test(desc)) {
      let phoneVal = profile.personal?.phone || '';
      if ((input as HTMLInputElement).maxLength === 11 || /03\d{2}/.test(desc)) {
        phoneVal = phoneVal.replace(/^\+92\s?/, '0').replace(/\s+/g, '');
      }
      matched = setVal(input, phoneVal);
    }
    // Email (Strictly exclude mobile/phone)
    else if ((/e[\s_-]?mail|email[\s_-]?address/i.test(desc) || (input as HTMLInputElement).type === 'email') && !/phone|mobile|tel|cell/i.test(desc)) {
      matched = setVal(input, profile.personal?.email);
    }
    // User ID / CNIC / NICOP / Afghan Refugee / National ID
    else if (/cnic|nicop|afghan[\s_-]?refugee|por(?!\w)|national[\s_-]?id|identity[\s_-]?card|user[\s_-]?id/i.test(desc)) {
      let idVal = profile.personal?.cnic || profile.customAnswers?.['cnic'] || profile.customAnswers?.['user_id'] || '';
      if (idVal) {
        if (/without[\s_-]?dash|no[\s_-]?dash|digits[\s_-]?only/i.test(desc)) {
          idVal = idVal.replace(/\D/g, '');
        }
        matched = setVal(input, idVal);
      }
    }
    // First Name
    else if (/first[\s_-]?name|given[\s_-]?name|fname/i.test(desc) && !/last|full|sur/i.test(desc)) {
      matched = setVal(input, profile.personal?.firstName);
    }
    // Last Name
    else if (/last[\s_-]?name|family[\s_-]?name|surname|lname/i.test(desc) && !/first/i.test(desc)) {
      matched = setVal(input, profile.personal?.lastName);
    }
    // Full Name
    else if (/full[\s_-]?name|^name$|candidate[\s_-]?name/i.test(desc) && !/first|last|company|school/i.test(desc)) {
      const fullName = `${profile.personal?.firstName || ''} ${profile.personal?.lastName || ''}`.trim();
      matched = setVal(input, fullName);
    }
    // LinkedIn
    else if (/linkedin/i.test(desc)) {
      matched = setVal(input, profile.personal?.linkedIn);
    }
    // GitHub
    else if (/github/i.test(desc)) {
      matched = setVal(input, profile.personal?.github);
    }
    // Portfolio / Website
    else if (/portfolio|website|personal[\s_-]?site|blog/i.test(desc)) {
      matched = setVal(input, profile.personal?.portfolio);
    }
    // Street Address
    else if (/street|address[\s_-]?line[\s_-]?1|address$/i.test(desc) && !/email/i.test(desc)) {
      matched = setVal(input, profile.personal?.address);
    }
    // City
    else if (/city|town/i.test(desc)) {
      matched = setVal(input, profile.personal?.city);
    }
    // State
    else if (/state|province|region/i.test(desc)) {
      matched = setVal(input, profile.personal?.state);
    }
    // Zip
    else if (/zip|postal|post[\s_-]?code/i.test(desc)) {
      matched = setVal(input, profile.personal?.zipCode);
    }
    // Country
    else if (/country/i.test(desc)) {
      matched = setVal(input, profile.personal?.country);
    }
    // Current Job Title
    else if (/current[\s_-]?title|job[\s_-]?title|role/i.test(desc) && !/company/i.test(desc)) {
      matched = setVal(input, profile.work?.currentTitle);
    }
    // Current Company
    else if (/current[\s_-]?company|employer/i.test(desc)) {
      matched = setVal(input, profile.work?.currentCompany);
    }
    // Years of Experience
    else if (/years[\s_-]?(of)?[\s_-]?exp|total[\s_-]?experience/i.test(desc)) {
      matched = setVal(input, profile.work?.yearsExperience);
    }
    // Salary
    else if (/salary|compensation|desired[\s_-]?pay/i.test(desc)) {
      matched = setVal(input, profile.work?.salaryExpectations);
    }
    // School
    else if (/school|university|college/i.test(desc)) {
      matched = setVal(input, profile.education?.school);
    }
    // Degree
    else if (/degree|education[\s_-]?level/i.test(desc)) {
      matched = setVal(input, profile.education?.degree);
    }
    // Major
    else if (/major|field[\s_-]?of[\s_-]?study/i.test(desc)) {
      matched = setVal(input, profile.education?.fieldOfStudy);
    }
    // Work Authorization Selects
    else if (/legally[\s_-]?authorized|authorized[\s_-]?to[\s_-]?work/i.test(desc)) {
      if (input.tagName.toLowerCase() === 'select') {
        const select = input as HTMLSelectElement;
        for (let i = 0; i < select.options.length; i++) {
          if (/yes/i.test(select.options[i].text) || /yes/i.test(select.options[i].value)) {
            select.selectedIndex = i;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            matched = true;
            break;
          }
        }
      }
    }
    // Sponsorship Requirements Selects
    else if (/require[\s_-]?sponsorship|sponsorship/i.test(desc)) {
      if (input.tagName.toLowerCase() === 'select') {
        const select = input as HTMLSelectElement;
        for (let i = 0; i < select.options.length; i++) {
          if (/no/i.test(select.options[i].text) || /no/i.test(select.options[i].value)) {
            select.selectedIndex = i;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            matched = true;
            break;
          }
        }
      }
    }
    // Password (if saved in custom answers)
    else if (((input as HTMLInputElement).type === 'password' || /password|passwd|pwd/i.test(desc)) && profile.customAnswers?.['password']) {
      matched = setVal(input, profile.customAnswers['password']);
    }
    // Custom Field & Missing Input Check (Fuzzy keyword and phrase matching)
    else if (profile.customAnswers) {
      for (const [key, value] of Object.entries(profile.customAnswers)) {
        if (!value) continue;
        const cleanKey = key.replace(/_/g, ' ').toLowerCase();
        const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
        const normalizedDesc = desc.toLowerCase().replace(/[^a-z0-9]/g, '');
        const keyWords = cleanKey.split(/\s+/).filter(w => w.length > 2);

        const wordMatch = keyWords.length > 0 && keyWords.every(w => desc.includes(w));
        const substrMatch = (cleanKey.length >= 3 && desc.includes(cleanKey)) || (normalizedKey.length >= 3 && normalizedDesc.includes(normalizedKey));

        if (wordMatch || substrMatch) {
          if (setVal(input, value as string)) {
            matched = true;
            break;
          }
        }
      }
    }

    if (matched) {
      count++;
      input.style.transition = 'background-color 0.4s ease';
      input.style.backgroundColor = 'rgba(99, 102, 241, 0.2)';
      setTimeout(() => {
        input.style.backgroundColor = '';
      }, 1500);
    }
  }

  return count;
}
