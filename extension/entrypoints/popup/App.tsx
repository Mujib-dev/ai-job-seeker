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
  ChevronRight,
  Plus,
  AlertCircle,
  Crown,
  Check,
  X,
  Edit3,
  Sun,
  Moon
} from 'lucide-react';
import { UserProfile, DEFAULT_USER_PROFILE, JobApplication, UserSubscription } from '../../lib/types';
import { getUserProfile, saveUserProfile, getJobApplications, saveJobApplication, updateApplicationStatus, deleteJobApplication, getUserSubscription, incrementUsage, setProStatus, resetDailyUsage, getAppTheme, setAppTheme, getFloatingWidgetEnabled, setFloatingWidgetEnabled } from '../../lib/storage';
import { generateAIAnswer, generateAICoverLetter } from '../../lib/ai';
import { API_BASE_URL } from '../../lib/config';

type Tab = 'autofill' | 'profile' | 'cover-letter' | 'tracker' | 'settings';

export default function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const isDark = theme === 'dark';
  const [activeTab, setActiveTab] = useState<Tab>('autofill');
  const [showPricingModal, setShowPricingModal] = useState(false);
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
    showToast(next === 'light' ? '☀️ Light theme activated' : '🌙 Dark theme activated');
  };

  const handleToggleFloatingWidget = async () => {
    const nextVal = !showFloatingWidget;
    setShowFloatingWidget(nextVal);
    await setFloatingWidgetEnabled(nextVal);
    showToast(nextVal ? '⚡ On-screen floating button enabled' : '🚫 On-screen floating button disabled');
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
            title: tab.title || 'Job Posting',
            company: host || 'Active Site',
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
  const handleTriggerAutofill = async () => {
    const freeLimit = subscription.monthlyLimit || 50;
    const currentUsage = subscription.monthlyUsageCount ?? subscription.dailyUsageCount ?? 0;
    if (!subscription.isPro && currentUsage >= freeLimit) {
      showToast(`Monthly free limit reached (${freeLimit}/${freeLimit}). Upgrade to Pro for unlimited autofills!`);
      return;
    }

    setLoading(true);
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (tab && tab.id) {
          // Attempt 1: Send message to content script
          chrome.tabs.sendMessage(tab.id, { type: 'EXECUTE_AUTOFILL', profile }, async (response) => {
            if (chrome.runtime.lastError || !response) {
              // Attempt 2: Direct Script Injection fallback (for newly opened tabs or file:// URLs)
              try {
                chrome.scripting.executeScript(
                  {
                    target: { tabId: tab.id! },
                    func: directAutofillScript,
                    args: [profile],
                  },
                  async (results) => {
                    setLoading(false);
                    const filled = results?.[0]?.result ?? 0;
                    if (filled > 0) {
                      showToast(`✨ Success! Filled ${filled} fields.`);
                      await recordApplicationAndUsage();
                    } else {
                      showToast('No matching empty form fields found on this page.');
                    }
                  }
                );
              } catch (err: any) {
                setLoading(false);
                showToast('Please refresh the page and try again!');
              }
            } else {
              setLoading(false);
              showToast(`✨ Success! ${response.filledCount} fields autofilled.`);
              await recordApplicationAndUsage();
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
      showToast('Please type a question or pick a quick prompt.');
      return;
    }

    const freeLimit = subscription.monthlyLimit || 50;
    const currentUsage = subscription.monthlyUsageCount ?? subscription.dailyUsageCount ?? 0;
    if (!subscription.isPro && currentUsage >= freeLimit) {
      showToast('Monthly free limit reached. Upgrade to Pro for unlimited AI answers!');
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
      showToast('Monthly free limit reached. Upgrade to Pro for unlimited cover letters!');
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
      showToast('ATS Cover Letter generated!');
    } catch {
      showToast('Failed to generate cover letter.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, label = 'Copied!') => {
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
    const updated = { ...profile, skills: profile.skills.filter(s => s !== skillToRemove) };
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
    const updated = { ...profile, certifications: (profile.certifications || []).filter(c => c !== certToRemove) };
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

  const handleRemoveCustomField = (key: string) => {
    const nextCustom = { ...(profile.customAnswers || {}) };
    delete nextCustom[key];
    const updated = { ...profile, customAnswers: nextCustom };
    setProfile(updated);
    saveUserProfile(updated);
  };

  // Launch Real Stripe Checkout or Verified LynkZone WhatsApp Order
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
        showToast('Opening secure Stripe checkout in new tab...');
        setShowPricingModal(false);
      } else if (data.whatsappUrl) {
        showToast('Direct payment order. Opening LynkZone WhatsApp...');
        if (typeof chrome !== 'undefined' && chrome.tabs) {
          chrome.tabs.create({ url: data.whatsappUrl });
        } else {
          window.open(data.whatsappUrl, '_blank');
        }
      } else {
        showToast(data.message || 'Error creating checkout session.');
      }
    } catch {
      showToast('Payment server offline. Ensure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  // Verify Real Paid License Key or Account Email (No Dummy Data Accepted)
  const handleVerifyLicense = async (keyToVerify?: string) => {
    const key = (keyToVerify || licenseInput).trim();
    if (!key) {
      showToast('Please enter your official license key or email.');
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
        showToast(`🎉 Verified! Pro ${data.plan === 'lifetime' ? 'Lifetime' : 'Monthly'} active.`);
        setShowPricingModal(false);
        setLicenseInput('');
      } else {
        showToast(data.error || 'Invalid license key. Dummy data is rejected.');
      }
    } catch {
      showToast('Could not reach license verification server.');
    } finally {
      setActivatingLicense(false);
    }
  };

  return (
    <div className={`flex flex-col h-[600px] w-[480px] select-none ${theme === 'light' ? 'theme-light' : 'bg-[#0b0f19] text-slate-100'}`}>
      {/* Toast Feedback Notification */}
      {feedback && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 bg-indigo-600 text-white text-xs px-4 py-2 rounded-full shadow-lg shadow-indigo-500/20 flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Header (Matching Photo-Tools brand styling) */}
      <header className="px-5 py-3.5 border-b border-slate-800/80 bg-[#0f172a]/90 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-cyan-400 p-0.5 flex items-center justify-center shadow-md shadow-indigo-500/20">
            <div className="w-full h-full bg-[#0b0f19] rounded-[7px] flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-cyan-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm tracking-tight text-white">AI Job Seeker</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-cyan-400 font-bold border border-cyan-500/30 tracking-wide">
                LynkZone
              </span>
            </div>
            <p className="text-[10px] text-slate-400">by LynkZone • 1-Click Autofill & AI Copilot</p>
          </div>
        </div>

        {/* Header Right Actions (Plan Badge & Light/Dark Theme Switcher) */}
        <div className="flex items-center gap-1.5">
          {/* Sun / Moon Theme Toggle */}
          <button
            onClick={handleToggleTheme}
            className={`p-1.5 rounded-full border transition cursor-pointer flex items-center justify-center ${
              theme === 'dark'
                ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700 shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300 shadow-sm'
            }`}
            title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>

          {subscription.isPro ? (
            <button
              onClick={() => setShowPricingModal(true)}
              className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border transition cursor-pointer ${
                isDark
                  ? 'font-semibold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30'
                  : 'font-bold text-emerald-900 bg-emerald-100 hover:bg-emerald-200 border-emerald-300 shadow-sm'
              }`}
            >
              <Crown className={`w-3.5 h-3.5 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`} /> Pro Active
            </button>
          ) : (
            <button
              onClick={() => setShowPricingModal(true)}
              className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border transition-all cursor-pointer shadow-sm ${
                isDark
                  ? 'font-semibold text-amber-300 bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border-amber-500/30 shadow-amber-500/10'
                  : 'font-bold text-amber-950 bg-amber-100 hover:bg-amber-200 border-amber-400'
              }`}
              title="Click to upgrade"
            >
              <Zap className={`w-3 h-3 ${isDark ? 'text-amber-400' : 'text-amber-800 fill-amber-700'}`} />
              <span>
                {Math.max(0, (subscription.monthlyLimit || 50) - (subscription.monthlyUsageCount ?? subscription.dailyUsageCount ?? 0))} left of {subscription.monthlyLimit || 50} free
              </span>
            </button>
          )}
        </div>
      </header>

      {/* Segmented Tab Bar */}
      <nav className="flex items-center justify-around px-3 py-2 bg-[#0c1322] border-b border-slate-800/80 text-xs">
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
          <Clock className="w-3.5 h-3.5" /> Tracker ({applications.length})
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
      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* ================= TAB 1: AUTOFILL & COPILOT ================= */}
        {activeTab === 'autofill' && (
          <div className="space-y-4">
            {/* Active Page Card */}
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start justify-between">
              <div>
                <span className="text-[10px] font-semibold tracking-wider uppercase text-cyan-400">Current Job Page</span>
                <h3 className="text-sm font-semibold text-white truncate max-w-[340px]">
                  {pageInfo.title || 'Detecting job listing...'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">{pageInfo.company || 'LinkedIn, Indeed, or Greenhouse'}</p>
              </div>
              <button
                onClick={detectActiveTabInfo}
                className="text-[11px] text-slate-400 hover:text-cyan-400 flex items-center gap-1"
                title="Refresh page info"
              >
                Refresh
              </button>
            </div>

            {/* Free Tier Monthly Usage Indicator (Shows how many left out of monthly limit) */}
            {!subscription.isPro && (() => {
              const freeLimit = subscription.monthlyLimit || 50;
              const currentUsage = subscription.monthlyUsageCount ?? subscription.dailyUsageCount ?? 0;
              const remaining = Math.max(0, freeLimit - currentUsage);
              const isMaxed = currentUsage >= freeLimit;
              const percent = Math.min(100, (currentUsage / freeLimit) * 100);

              return (
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-medium flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      <span>Monthly Free Applications</span>
                    </span>
                    <span className="font-bold text-amber-300 text-[11px]">
                      {remaining} left out of {freeLimit} this month
                    </span>
                  </div>
                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className={`h-full transition-all duration-300 rounded-full ${
                        isMaxed ? 'bg-red-500' : 'bg-gradient-to-r from-indigo-500 to-cyan-400'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span>{currentUsage} of {freeLimit} used this month</span>
                    <button
                      onClick={() => setShowPricingModal(true)}
                      className="text-cyan-400 hover:underline cursor-pointer font-medium"
                    >
                      Get Unlimited →
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Primary Autofill Action */}
            <button
              onClick={handleTriggerAutofill}
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-semibold text-sm shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer disabled:opacity-50"
            >
              <Zap className="w-4 h-4 fill-white" />
              {loading ? 'Autofilling Form...' : '1-Click Autofill Active Form'}
            </button>

            {/* AI Custom Question Responder */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <h4 className="text-xs font-semibold text-white">AI Custom Question Copilot</h4>
                </div>
                {/* Tone Selector */}
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

              {/* Quick Prompt Chips (All Top ATS Questions) */}
              <div>
                <span className="text-[10px] text-slate-400 block mb-1.5">Common Application Questions:</span>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                  {[
                    'Why do you want to work here?',
                    'Tell me about yourself & background',
                    'Greatest technical strengths?',
                    'Describe a project conflict & solution',
                    'Biggest professional achievement?',
                    'Why are you leaving current role?',
                    'Handling tight deadlines & pressure',
                    'Where do you see yourself in 3-5 years?',
                    'Leadership & mentoring experience',
                    'Expected salary & compensation'
                  ].map((chip) => (
                    <button
                      key={chip}
                      onClick={() => setCustomQuestion(chip)}
                      className={`text-[10px] px-2.5 py-1 rounded-md transition cursor-pointer border ${
                        customQuestion === chip
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700/60'
                      }`}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                value={customQuestion}
                onChange={(e) => setCustomQuestion(e.target.value)}
                placeholder="Paste or click any application question above..."
                rows={2}
                className="w-full text-xs p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
              />

              <button
                onClick={handleGenerateAnswer}
                disabled={loading || !customQuestion.trim()}
                className="w-full py-2.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition disabled:opacity-40 cursor-pointer shadow-md shadow-indigo-600/20"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {loading ? 'Crafting tailored answer...' : 'Generate AI Answer'}
              </button>

              {/* Generated Result Output with Live Edit Option */}
              {generatedAnswer && (
                <div className="mt-3 p-3.5 rounded-xl bg-slate-950 border border-indigo-500/40 space-y-2 shadow-lg shadow-indigo-950/20">
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5 text-indigo-400 font-semibold">
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Editable AI Answer:</span>
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

                  {/* Fully Editable Textarea */}
                  <textarea
                    value={generatedAnswer}
                    onChange={(e) => setGeneratedAnswer(e.target.value)}
                    rows={5}
                    placeholder="Click to edit or refine your answer..."
                    className="w-full text-xs p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 leading-relaxed font-sans focus:outline-none focus:border-indigo-500 resize-y"
                  />

                  <div className="flex items-center justify-between pt-1 text-[10px]">
                    <span className="text-slate-500 flex items-center gap-1">
                      ✏️ Edit anytime before pasting
                    </span>
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
                        showToast('Answer saved to your Profile Q&A!');
                      }}
                      className="text-cyan-400 hover:text-cyan-300 hover:underline cursor-pointer font-medium"
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
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Your Autofill Profile</h3>
                <p className="text-xs text-slate-400">Manage all application details in one place.</p>
              </div>
              <button
                onClick={handleSaveProfile}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow cursor-pointer transition"
              >
                Save Profile
              </button>
            </div>

            {/* Category Sub-Navigation Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] no-scrollbar">
              {[
                { id: 'contact', label: '👤 Contact' },
                { id: 'links', label: '🔗 Links' },
                { id: 'work', label: '💼 Work & Prefs' },
                { id: 'education', label: '🎓 Education' },
                { id: 'eeo', label: '📋 Demographics' },
                { id: 'skills', label: '⚡ Skills & Certs' },
                { id: 'custom', label: '💬 Custom Q&A' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setProfileCategory(cat.id as any)}
                  className={`px-2.5 py-1 rounded-full whitespace-nowrap font-medium transition cursor-pointer ${
                    profileCategory === cat.id
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
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
                      onChange={(e) => setProfile({ ...profile, personal: { ...profile.personal, firstName: e.target.value } })}
                      className="w-full text-xs p-2 rounded bg-slate-950 border border-slate-800 text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">Last Name</label>
                    <input
                      type="text"
                      value={profile.personal.lastName}
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
                      onChange={(e) => setProfile({ ...profile, personal: { ...profile.personal, email: e.target.value } })}
                      className="w-full text-xs p-2 rounded bg-slate-950 border border-slate-800 text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">Phone / Mobile</label>
                    <input
                      type="text"
                      value={profile.personal.phone}
                      onChange={(e) => setProfile({ ...profile, personal: { ...profile.personal, phone: e.target.value } })}
                      className="w-full text-xs p-2 rounded bg-slate-950 border border-slate-800 text-slate-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400">National ID / CNIC / NICOP / PoR (User ID)</label>
                  <input
                    type="text"
                    value={profile.personal.cnic || ''}
                    placeholder="e.g. 17301-1234567-1 or 8265478965785"
                    onChange={(e) => setProfile({ ...profile, personal: { ...profile.personal, cnic: e.target.value } })}
                    className="w-full text-xs p-2 rounded bg-slate-950 border border-slate-800 text-slate-200"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400">Street Address</label>
                  <input
                    type="text"
                    value={profile.personal.address}
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
                      onChange={(e) => setProfile({ ...profile, personal: { ...profile.personal, city: e.target.value } })}
                      className="w-full text-xs p-2 rounded bg-slate-950 border border-slate-800 text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">State / Province</label>
                    <input
                      type="text"
                      value={profile.personal.state}
                      onChange={(e) => setProfile({ ...profile, personal: { ...profile.personal, state: e.target.value } })}
                      className="w-full text-xs p-2 rounded bg-slate-950 border border-slate-800 text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">Zip / Postal</label>
                    <input
                      type="text"
                      value={profile.personal.zipCode}
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
                    onChange={(e) => setProfile({ ...profile, personal: { ...profile.personal, country: e.target.value } })}
                    className="w-full text-xs p-2 rounded bg-slate-950 border border-slate-800 text-slate-200"
                  />
                </div>
              </div>
            )}

            {/* CATEGORY 2: LINKS */}
            {profileCategory === 'links' && (
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5">
                <span className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider">Social & Professional Profiles</span>
                <div>
                  <label className="text-[10px] text-slate-400">LinkedIn Profile URL</label>
                  <input
                    type="url"
                    value={profile.personal.linkedIn}
                    onChange={(e) => setProfile({ ...profile, personal: { ...profile.personal, linkedIn: e.target.value } })}
                    placeholder="https://linkedin.com/in/username"
                    className="w-full text-xs p-2 rounded bg-slate-950 border border-slate-800 text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400">GitHub URL</label>
                  <input
                    type="url"
                    value={profile.personal.github}
                    onChange={(e) => setProfile({ ...profile, personal: { ...profile.personal, github: e.target.value } })}
                    placeholder="https://github.com/username"
                    className="w-full text-xs p-2 rounded bg-slate-950 border border-slate-800 text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400">Portfolio / Personal Website</label>
                  <input
                    type="url"
                    value={profile.personal.portfolio}
                    onChange={(e) => setProfile({ ...profile, personal: { ...profile.personal, portfolio: e.target.value } })}
                    placeholder="https://yourdomain.dev"
                    className="w-full text-xs p-2 rounded bg-slate-950 border border-slate-800 text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400">Twitter / X Handle or URL</label>
                  <input
                    type="text"
                    value={profile.personal.twitter || ''}
                    onChange={(e) => setProfile({ ...profile, personal: { ...profile.personal, twitter: e.target.value } })}
                    placeholder="https://x.com/username"
                    className="w-full text-xs p-2 rounded bg-slate-950 border border-slate-800 text-slate-200"
                  />
                </div>
              </div>
            )}

            {/* CATEGORY 3: WORK & PREFERENCES */}
            {profileCategory === 'work' && (
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5">
                <span className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider">Employment & Job Preferences</span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400">Current Job Title</label>
                    <input
                      type="text"
                      value={profile.work.currentTitle}
                      onChange={(e) => setProfile({ ...profile, work: { ...profile.work, currentTitle: e.target.value } })}
                      className="w-full text-xs p-2 rounded bg-slate-950 border border-slate-800 text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">Current Employer</label>
                    <input
                      type="text"
                      value={profile.work.currentCompany}
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
                      onChange={(e) => setProfile({ ...profile, work: { ...profile.work, yearsExperience: e.target.value } })}
                      className="w-full text-xs p-2 rounded bg-slate-950 border border-slate-800 text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">Desired Salary</label>
                    <input
                      type="text"
                      value={profile.work.salaryExpectations}
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
                      value={profile.work.noticePeriod || '2 weeks'}
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
                    onChange={(e) => setProfile({ ...profile, work: { ...profile.work, summary: e.target.value } })}
                    className="w-full text-xs p-2 rounded bg-slate-950 border border-slate-800 text-slate-200 resize-none"
                  />
                </div>
              </div>
            )}

            {/* CATEGORY 4: EDUCATION & LEGAL */}
            {profileCategory === 'education' && (
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5">
                <span className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider">Education & Work Authorization</span>
                <div>
                  <label className="text-[10px] text-slate-400">University / Institution</label>
                  <input
                    type="text"
                    value={profile.education.school}
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
                      onChange={(e) => setProfile({ ...profile, education: { ...profile.education, graduationYear: e.target.value } })}
                      className="w-full text-xs p-2 rounded bg-slate-950 border border-slate-800 text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">GPA (Optional)</label>
                    <input
                      type="text"
                      value={profile.education.gpa}
                      onChange={(e) => setProfile({ ...profile, education: { ...profile.education, gpa: e.target.value } })}
                      className="w-full text-xs p-2 rounded bg-slate-950 border border-slate-800 text-slate-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/60">
                  <div>
                    <label className="text-[10px] text-slate-400">Legally Authorized to Work?</label>
                    <select
                      value={profile.authorization.legallyAuthorized ? 'yes' : 'no'}
                      onChange={(e) => setProfile({
                        ...profile,
                        authorization: { ...profile.authorization, legallyAuthorized: e.target.value === 'yes' }
                      })}
                      className="w-full text-xs p-2 rounded bg-slate-950 border border-slate-800 text-slate-200"
                    >
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">Require Visa Sponsorship?</label>
                    <select
                      value={profile.authorization.sponsorshipRequired ? 'yes' : 'no'}
                      onChange={(e) => setProfile({
                        ...profile,
                        authorization: { ...profile.authorization, sponsorshipRequired: e.target.value === 'yes' }
                      })}
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
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider">EEO Voluntary Demographics</span>
                  <span className="text-[9px] text-slate-500">Auto-answers standard ATS questions</span>
                </div>

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
                  <span className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider">Top Skills</span>
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
                    {profile.skills.map((skill) => (
                      <span
                        key={skill}
                        className="inline-flex items-center gap-1 text-[11px] bg-indigo-950/60 text-indigo-300 border border-indigo-800/60 px-2 py-0.5 rounded-md"
                      >
                        {skill}
                        <button onClick={() => handleRemoveSkill(skill)} className="hover:text-red-400 cursor-pointer">×</button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Certifications */}
                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5">
                  <span className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider">Certifications & Licenses</span>
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
                    {(profile.certifications || []).map((cert) => (
                      <span
                        key={cert}
                        className="inline-flex items-center gap-1 text-[11px] bg-cyan-950/60 text-cyan-300 border border-cyan-800/60 px-2 py-0.5 rounded-md"
                      >
                        {cert}
                        <button onClick={() => handleRemoveCert(cert)} className="hover:text-red-400 cursor-pointer">×</button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* CATEGORY 7: CUSTOM Q&A */}
            {profileCategory === 'custom' && (
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider">Custom Questions & Answers</span>
                  <span className="text-[9px] text-slate-500">Auto-matches unusual form fields</span>
                </div>

                <div className="space-y-2 p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80">
                  <input
                    type="text"
                    value={customKeyInput}
                    onChange={(e) => setCustomKeyInput(e.target.value)}
                    placeholder="Field keyword (e.g. 'referral', 'why us', 'rate')..."
                    className="w-full text-xs p-2 rounded bg-slate-900 border border-slate-800 text-slate-200"
                  />
                  <textarea
                    rows={2}
                    value={customValInput}
                    onChange={(e) => setCustomValInput(e.target.value)}
                    placeholder="Your saved answer..."
                    className="w-full text-xs p-2 rounded bg-slate-900 border border-slate-800 text-slate-200 resize-none"
                  />
                  <button
                    onClick={handleAddCustomField}
                    className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Custom Field
                  </button>
                </div>

                <div className="space-y-2 max-h-36 overflow-y-auto pt-1">
                  {Object.entries(profile.customAnswers || {}).map(([key, val]) => (
                    <div key={key} className="p-2 rounded bg-slate-950 border border-slate-800/80 text-xs flex justify-between gap-2">
                      <div className="overflow-hidden">
                        <span className="font-semibold text-indigo-400 block truncate">{key.replace(/_/g, ' ')}</span>
                        <p className="text-slate-300 text-[11px] line-clamp-2">{val}</p>
                      </div>
                      <button
                        onClick={() => handleRemoveCustomField(key)}
                        className="text-slate-500 hover:text-red-400 p-1 flex-shrink-0 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 3: COVER LETTER ================= */}
        {activeTab === 'cover-letter' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">AI Cover Letter Generator</h3>
                <p className="text-xs text-slate-400">Customized specifically to {pageInfo.company || 'the job listing'}.</p>
              </div>
              <button
                onClick={handleGenerateCoverLetter}
                disabled={loading}
                className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white text-xs font-semibold shadow flex items-center gap-1.5 disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {loading ? 'Writing...' : 'Generate Letter'}
              </button>
            </div>

            {coverLetter ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-1.5 text-indigo-400 font-semibold text-[11px]">
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Editable Cover Letter Draft</span>
                    <span className="text-[10px] text-slate-500 font-normal font-mono">
                      ({coverLetter.split(/\s+/).filter(Boolean).length} words)
                    </span>
                  </div>
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

                <div>
                  <textarea
                    value={coverLetter}
                    onChange={(e) => setCoverLetter(e.target.value)}
                    rows={13}
                    placeholder="Click to edit or personalize any paragraph..."
                    className="w-full text-xs p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 leading-relaxed font-sans focus:outline-none focus:border-indigo-500 resize-none"
                  />
                  <div className="text-[10px] text-slate-500 text-right mt-1">
                    ✏️ Feel free to edit or personalize text directly before copying
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-3">
                <div className="w-12 h-12 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto">
                  <FileText className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-semibold text-white">No cover letter generated yet</h4>
                <p className="text-xs text-slate-400 max-w-[320px] mx-auto">
                  Click the button above to generate a professional, ATS-friendly cover letter tailored to this exact job opening.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 4: APPLIED TRACKER ================= */}
        {activeTab === 'tracker' && (
          <div className="space-y-4">
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
                      applications.map(a => `"${a.company}","${a.jobTitle}","${a.appliedDate}","${a.status}","${a.url}"`).join('\n');
                    const encodedUri = encodeURI(csvContent);
                    const link = document.createElement('a');
                    link.setAttribute('href', encodedUri);
                    link.setAttribute('download', `Job_Applications_${new Date().toISOString().split('T')[0]}.csv`);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    showToast('Exported to CSV!');
                  }}
                  className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded flex items-center gap-1"
                >
                  <Download className="w-3 h-3" /> Export CSV
                </button>
              )}
            </div>

            {applications.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-2">
                <Clock className="w-8 h-8 text-slate-500 mx-auto" />
                <p className="text-xs text-slate-400">No applications tracked yet. Autofill a job to log it automatically!</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1">
                {applications.map((app) => (
                  <div
                    key={app.id}
                    className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-3 hover:border-slate-700 transition"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
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
                          setApplications(applications.map(a => a.id === app.id ? { ...a, status: e.target.value as any } : a));
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
                          setApplications(applications.filter(a => a.id !== app.id));
                          showToast('Application deleted');
                        }}
                        className="text-slate-500 hover:text-red-400 p-1"
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

        {/* ================= TAB 5: SETTINGS & MONETIZATION ================= */}
        {activeTab === 'settings' && (
          <div className="space-y-4">
            <div>
              <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Extension Settings & Account</h3>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Manage plan, backups, and preferences.</p>
            </div>

            {/* Subscription & Pricing Box */}
            <div className={`p-4 rounded-xl border space-y-3 ${
              isDark
                ? 'bg-gradient-to-br from-indigo-950/60 to-slate-900 border-indigo-500/30'
                : 'bg-gradient-to-br from-indigo-50/90 to-blue-50/70 border-indigo-200 shadow-sm'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Current Plan</span>
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                  subscription.isPro
                    ? (isDark ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-emerald-100 text-emerald-800 border border-emerald-300')
                    : (isDark ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-amber-100 text-amber-900 border border-amber-300')
                }`}>
                  {subscription.isPro ? 'PRO UNLIMITED' : 'FREE TIER'}
                </span>
              </div>
              <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-700 font-medium'}`}>
                {subscription.isPro
                  ? '✨ You have unlimited 1-click form autofills, ATS cover letters, and custom AI responses.'
                  : `Free tier: ${Math.max(0, (subscription.monthlyLimit || 50) - (subscription.monthlyUsageCount ?? subscription.dailyUsageCount ?? 0))} left out of ${subscription.monthlyLimit || 50} this month (${subscription.monthlyUsageCount ?? subscription.dailyUsageCount ?? 0} used). Resets on the 1st of each month.`}
              </p>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setShowPricingModal(true)}
                  className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:brightness-110 text-slate-950 font-extrabold text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Crown className="w-3.5 h-3.5" />
                  <span>{subscription.isPro ? 'Manage Plans & Pricing' : 'View Affordable Plans ($2.99 / $8.99)'}</span>
                </button>
              </div>
            </div>

            {/* Visual Theme Mode (Dark / Light) */}
            <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
              isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div>
                <h4 className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Visual Appearance</h4>
                <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Switch between Dark and Light mode.</p>
              </div>
              <div className={`flex items-center gap-1 p-1 rounded-lg border ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
              }`}>
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

            {/* On-Screen Floating Button Toggle */}
            <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
              isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div>
                <h4 className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>On-Screen Floating Button</h4>
                <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Show 1-click floating button on web pages (default ON).</p>
              </div>
              <button
                type="button"
                onClick={handleToggleFloatingWidget}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                  showFloatingWidget ? 'bg-indigo-600' : isDark ? 'bg-slate-800' : 'bg-slate-300'
                }`}
                title={showFloatingWidget ? 'Click to disable' : 'Click to enable'}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    showFloatingWidget ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* License Key & Account Activation */}
            <div className={`p-3.5 rounded-xl border space-y-2.5 ${
              isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <span className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-cyan-400' : 'text-indigo-600'}`}>
                Account & License Key
              </span>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Activate a purchased license key or link your email.</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={licenseInput}
                  onChange={(e) => setLicenseInput(e.target.value)}
                  placeholder="Paste License Key (e.g. LIFE-XXXX-YYYY)..."
                  className={`flex-1 text-xs p-2 rounded border focus:outline-none focus:border-indigo-500 ${
                    isDark
                      ? 'bg-slate-950 border-slate-800 text-slate-200 placeholder-slate-600'
                      : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                  }`}
                />
                <button
                  onClick={() => handleVerifyLicense()}
                  disabled={activatingLicense || !licenseInput.trim()}
                  className={`px-3.5 py-2 rounded text-xs font-bold transition flex items-center justify-center ${
                    licenseInput.trim()
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer shadow-sm'
                      : (isDark ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700' : 'bg-slate-200 text-slate-500 cursor-not-allowed border border-slate-300')
                  }`}
                >
                  {activatingLicense ? 'Checking...' : 'Activate'}
                </button>
              </div>
              <div className={`text-[10px] pt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                <span>Enter your official LynkZone license key issued upon verified payment.</span>
              </div>
            </div>

            {/* Profile Backup & Restore */}
            <div className={`p-3.5 rounded-xl border space-y-2 ${
              isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <h4 className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Backup & Restore Profile</h4>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Export your profile data as JSON or import to another computer.</p>
              <div className="flex gap-2 pt-1">
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
                  className="flex-1 py-1.5 px-3 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 flex items-center justify-center gap-1.5"
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

            {/* LynkZone WhatsApp & Manual Payments Card */}
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
              <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>💬</span> LynkZone Direct WhatsApp Support
              </span>
              <p className="text-xs text-slate-400">
                Prefer direct local payments (Easypaisa, Jazzcash, Bank Transfer, Crypto) or need instant help? Chat directly with LynkZone.
              </p>
              <a
                href={`https://wa.me/923481974606?text=${encodeURIComponent(
                  'Hello LynkZone Team! I want to inquire about AI Job Seeker Pro license & payment.'
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 px-3 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition text-decoration-none cursor-pointer"
              >
                <span>Chat with LynkZone on WhatsApp (+92 348 1974606) →</span>
              </a>
            </div>
          </div>
        )}
      </main>

      {/* Footer (Consistent with photo-tools) */}
      <footer className="px-5 py-2.5 border-t border-slate-800/80 bg-[#090d16] text-[10px] text-slate-500 flex items-center justify-between">
        <span>LynkZone • AI Job Seeker v1.0.0</span>
        <span className="flex items-center gap-1 text-slate-400">
          <ShieldCheck className="w-3 h-3 text-emerald-400" /> Safe & Local Storage
        </span>
      </footer>

      {/* ================= PRICING & UPGRADE MODAL ================= */}
      {showPricingModal && (
        <div className={`absolute inset-0 z-50 backdrop-blur-md flex flex-col p-5 overflow-y-auto ${
          isDark ? 'bg-[#090d16]/95 text-slate-100' : 'bg-white/98 text-slate-900 shadow-2xl'
        }`}>
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

          <div className="py-3 text-center">
            <h2 className={`text-base font-extrabold ${isDark ? 'text-white' : 'text-slate-900'}`}>Affordable & Fair Pricing</h2>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Land interviews 10x faster. Apply to hundreds of jobs effortlessly.
            </p>
          </div>

          {/* Pricing Cards (2 Affordable Tiers) */}
          <div className="grid grid-cols-2 gap-3 my-2">
            {/* Tier 1: Monthly Pro ($2.99 / mo) */}
            <div
              onClick={() => setPricingTier('monthly')}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                pricingTier === 'monthly'
                  ? (isDark
                      ? 'bg-gradient-to-b from-indigo-950/80 to-slate-900 border-indigo-500 shadow-md shadow-indigo-500/10'
                      : 'bg-indigo-50/70 border-indigo-500 shadow-md shadow-indigo-500/15')
                  : (isDark
                      ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm')
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[11px] font-bold ${isDark ? 'text-indigo-400' : 'text-indigo-700'}`}>Monthly Pro</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                    isDark ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-100 text-indigo-800'
                  }`}>
                    Flexible
                  </span>
                </div>
                <div className="flex items-baseline gap-1 my-1">
                  <span className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>$2.99</span>
                  <span className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>/ mo</span>
                </div>
                <p className={`text-[10px] font-medium ${isDark ? 'text-indigo-300' : 'text-indigo-700'}`}>Unlimited applications for 30 days</p>

                <ul className={`space-y-1.5 mt-3 text-[11px] ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  <li className="flex items-center gap-1.5">
                    <Check className={`w-3 h-3 flex-shrink-0 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                    <span>Unlimited Autofills</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check className={`w-3 h-3 flex-shrink-0 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                    <span>AI Question Copilot</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check className={`w-3 h-3 flex-shrink-0 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                    <span>ATS Cover Letters</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check className={`w-3 h-3 flex-shrink-0 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                    <span>Cancel Anytime</span>
                  </li>
                </ul>
              </div>

              <div className={`mt-3 pt-2 border-t ${isDark ? 'border-slate-800/60' : 'border-slate-200'}`}>
                <div className={`w-full py-1.5 text-center rounded text-[11px] font-bold ${
                  pricingTier === 'monthly'
                    ? (isDark ? 'text-indigo-300 bg-indigo-500/10' : 'text-indigo-800 bg-indigo-100')
                    : (isDark ? 'text-slate-500' : 'text-slate-500')
                }`}>
                  {pricingTier === 'monthly' ? '✓ Selected' : 'Choose Monthly'}
                </div>
              </div>
            </div>

            {/* Tier 2: Lifetime Pass ($8.99 One-Time) */}
            <div
              onClick={() => setPricingTier('lifetime')}
              className={`p-3.5 rounded-xl border relative transition-all cursor-pointer flex flex-col justify-between ${
                pricingTier === 'lifetime'
                  ? (isDark
                      ? 'bg-gradient-to-b from-amber-950/40 via-slate-900 to-slate-900 border-amber-500 shadow-md shadow-amber-500/10'
                      : 'bg-amber-50/70 border-amber-500 shadow-md shadow-amber-500/15')
                  : (isDark
                      ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm')
              }`}
            >
              <div className="absolute -top-2.5 right-3 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 text-[9px] font-extrabold px-2 py-0.5 rounded-full shadow-sm">
                BEST VALUE 🔥
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[11px] font-bold ${isDark ? 'text-amber-400' : 'text-amber-800'}`}>Lifetime Pass</span>
                </div>
                <div className="flex items-baseline gap-1 my-1">
                  <span className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>$8.99</span>
                  <span className={`text-[11px] font-bold ${isDark ? 'text-amber-400/80' : 'text-amber-700'}`}>once</span>
                </div>
                <p className={`text-[10px] font-semibold ${isDark ? 'text-amber-300/90' : 'text-amber-800'}`}>Pay once, keep forever!</p>

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
                  <li className="flex items-center gap-1.5">
                    <Check className={`w-3 h-3 flex-shrink-0 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                    <span>Priority AI Speed</span>
                  </li>
                </ul>
              </div>

              <div className={`mt-3 pt-2 border-t ${isDark ? 'border-slate-800/60' : 'border-slate-200'}`}>
                <div className={`w-full py-1.5 text-center rounded text-[11px] font-bold ${
                  pricingTier === 'lifetime'
                    ? (isDark ? 'text-amber-400 bg-amber-500/10' : 'text-amber-900 bg-amber-100')
                    : (isDark ? 'text-slate-500' : 'text-slate-500')
                }`}>
                  {pricingTier === 'lifetime' ? '✓ Selected' : 'Choose Lifetime'}
                </div>
              </div>
            </div>
          </div>

          {/* Action Button: Checkout via Stripe / Payment API */}
          <div className="mt-2 space-y-2.5">
            <button
              onClick={() => handleStartCheckout(pricingTier)}
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:brightness-110 text-slate-950 font-extrabold text-xs shadow-md shadow-orange-500/20 transition cursor-pointer flex items-center justify-center gap-2"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>
                {pricingTier === 'lifetime'
                  ? 'Proceed to Checkout — $8.99 Lifetime'
                  : 'Proceed to Checkout — $2.99 / mo'}
              </span>
            </button>

            {/* LynkZone WhatsApp Quick Buy Button */}
            <a
              href={`https://wa.me/923481974606?text=${encodeURIComponent(
                `Hello LynkZone Team! I want to purchase AI Job Seeker Pro (${
                  pricingTier === 'lifetime' ? 'Lifetime Pass $8.99' : 'Monthly Pro $2.99/mo'
                }). Please send direct payment details & license key.`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2 px-3 rounded-lg bg-emerald-600/90 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer text-decoration-none"
            >
              <span>💬</span>
              <span>Quick Buy via WhatsApp (+92 348 1974606)</span>
            </a>

            {/* License Key & Account Activation Input */}
            <div className={`p-2.5 rounded-lg border space-y-1.5 ${
              isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <span className={`text-[10px] block font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Already paid? Enter License Key or Email:
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
                  className={`px-3 py-1.5 rounded text-[11px] font-bold transition flex items-center justify-center ${
                    licenseInput.trim()
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer shadow-sm'
                      : (isDark ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700' : 'bg-slate-200 text-slate-500 cursor-not-allowed border border-slate-300')
                  }`}
                >
                  {activatingLicense ? 'Checking...' : 'Activate'}
                </button>
              </div>
              <div className={`text-[9px] ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                <span>Official license keys are issued upon verified payment.</span>
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
  function setVal(el: any, val: string) {
    if (!val) return;
    const valSetter = Object.getOwnPropertyDescriptor(el, 'value')?.set;
    const proto = Object.getPrototypeOf(el);
    const protoValSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    if (protoValSetter && valSetter !== protoValSetter) {
      protoValSetter.call(el, val);
    } else if (valSetter) {
      valSetter.call(el, val);
    } else {
      el.value = val;
    }
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  function getDesc(el: HTMLElement): string {
    const parts = [
      el.id || '',
      el.getAttribute('name') || '',
      el.getAttribute('placeholder') || '',
      el.getAttribute('aria-label') || '',
      el.getAttribute('autocomplete') || '',
      el.getAttribute('title') || '',
    ];
    if (el.id) {
      const lbl = document.querySelector(`label[for="${el.id}"]`);
      if (lbl && lbl.textContent) parts.push(lbl.textContent.trim());
    }
    const pl = el.closest('label');
    if (pl && pl.textContent) parts.push(pl.textContent.trim());

    let prev = el.previousElementSibling;
    while (prev) {
      if (prev.tagName.toLowerCase() === 'label' || prev.className.includes('label')) {
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
    const desc = getDesc(input);
    let matched = false;

    // Phone / Mobile (Check first so "Mobile" field never gets filled with email!)
    if (/phone|mobile|tel\b|cellular|contact[\s_-]?number/i.test(desc)) {
      let phoneVal = profile.personal?.phone || '';
      if ((input as HTMLInputElement).maxLength === 11 || /03\d{2}/.test(desc)) {
        phoneVal = phoneVal.replace(/^\+92\s?/, '0').replace(/\s+/g, '');
      }
      setVal(input, phoneVal);
      matched = true;
    }
    // Email (Strictly exclude mobile/phone)
    else if (/e[\s_-]?mail|email[\s_-]?address/i.test(desc) && !/phone|mobile|tel|cell/i.test(desc)) {
      setVal(input, profile.personal?.email);
      matched = true;
    }
    // User ID / CNIC / NICOP / Afghan Refugee / National ID
    else if (/cnic|nicop|afghan[\s_-]?refugee|por(?!\w)|national[\s_-]?id|identity[\s_-]?card|user[\s_-]?id/i.test(desc)) {
      let idVal = profile.personal?.cnic || profile.customAnswers?.['cnic'] || profile.customAnswers?.['user_id'] || '17301-1234567-1';
      if (/without[\s_-]?dash|no[\s_-]?dash|digits[\s_-]?only/i.test(desc)) {
        idVal = idVal.replace(/\D/g, '');
      }
      setVal(input, idVal);
      matched = true;
    }
    // First Name
    else if (/first[\s_-]?name|given[\s_-]?name|fname/i.test(desc) && !/last|full|sur/i.test(desc)) {
      setVal(input, profile.personal?.firstName);
      matched = true;
    }
    // Last Name
    else if (/last[\s_-]?name|family[\s_-]?name|surname|lname/i.test(desc) && !/first/i.test(desc)) {
      setVal(input, profile.personal?.lastName);
      matched = true;
    }
    // Full Name
    else if (/full[\s_-]?name|^name$|candidate[\s_-]?name/i.test(desc) && !/first|last|company|school/i.test(desc)) {
      setVal(input, `${profile.personal?.firstName || ''} ${profile.personal?.lastName || ''}`.trim());
      matched = true;
    }
    // LinkedIn
    else if (/linkedin/i.test(desc)) {
      setVal(input, profile.personal?.linkedIn);
      matched = true;
    }
    // GitHub
    else if (/github/i.test(desc)) {
      setVal(input, profile.personal?.github);
      matched = true;
    }
    // Portfolio / Website
    else if (/portfolio|website|personal[\s_-]?site|blog/i.test(desc)) {
      setVal(input, profile.personal?.portfolio);
      matched = true;
    }
    // Street Address
    else if (/street|address[\s_-]?line[\s_-]?1|address$/i.test(desc) && !/email/i.test(desc)) {
      setVal(input, profile.personal?.address);
      matched = true;
    }
    // City
    else if (/city|town/i.test(desc)) {
      setVal(input, profile.personal?.city);
      matched = true;
    }
    // State
    else if (/state|province|region/i.test(desc)) {
      setVal(input, profile.personal?.state);
      matched = true;
    }
    // Zip
    else if (/zip|postal|post[\s_-]?code/i.test(desc)) {
      setVal(input, profile.personal?.zipCode);
      matched = true;
    }
    // Country
    else if (/country/i.test(desc)) {
      setVal(input, profile.personal?.country);
      matched = true;
    }
    // Current Job Title
    else if (/current[\s_-]?title|job[\s_-]?title|role/i.test(desc) && !/company/i.test(desc)) {
      setVal(input, profile.work?.currentTitle);
      matched = true;
    }
    // Current Company
    else if (/current[\s_-]?company|employer/i.test(desc)) {
      setVal(input, profile.work?.currentCompany);
      matched = true;
    }
    // Years of Experience
    else if (/years[\s_-]?(of)?[\s_-]?exp|total[\s_-]?experience/i.test(desc)) {
      setVal(input, profile.work?.yearsExperience);
      matched = true;
    }
    // Salary
    else if (/salary|compensation|desired[\s_-]?pay/i.test(desc)) {
      setVal(input, profile.work?.salaryExpectations);
      matched = true;
    }
    // School
    else if (/school|university|college/i.test(desc)) {
      setVal(input, profile.education?.school);
      matched = true;
    }
    // Degree
    else if (/degree|education[\s_-]?level/i.test(desc)) {
      setVal(input, profile.education?.degree);
      matched = true;
    }
    // Major
    else if (/major|field[\s_-]?of[\s_-]?study/i.test(desc)) {
      setVal(input, profile.education?.fieldOfStudy);
      matched = true;
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
    // Location Preference / Remote
    else if (/remote|hybrid|work[\s_-]?location|workplace[\s_-]?type/i.test(desc)) {
      if (profile.work?.workLocationPreference) {
        setVal(input, profile.work.workLocationPreference);
        matched = true;
      }
    }
    // Relocation
    else if (/willing[\s_-]?to[\s_-]?relocate|relocat/i.test(desc)) {
      if (profile.work?.willingToRelocate) {
        setVal(input, profile.work.willingToRelocate);
        matched = true;
      }
    }
    // EEO Gender
    else if (/gender|sex(?!\w)/i.test(desc)) {
      if (profile.eeo?.gender && input.tagName.toLowerCase() === 'select') {
        const select = input as HTMLSelectElement;
        for (let i = 0; i < select.options.length; i++) {
          if (select.options[i].text.toLowerCase().includes(profile.eeo.gender.toLowerCase())) {
            select.selectedIndex = i;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            matched = true;
            break;
          }
        }
      }
    }
    // EEO Race
    else if (/race|ethnicity/i.test(desc)) {
      if (profile.eeo?.raceEthnicity && input.tagName.toLowerCase() === 'select') {
        const select = input as HTMLSelectElement;
        for (let i = 0; i < select.options.length; i++) {
          if (select.options[i].text.toLowerCase().includes(profile.eeo.raceEthnicity.toLowerCase())) {
            select.selectedIndex = i;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            matched = true;
            break;
          }
        }
      }
    }
    // EEO Veteran
    else if (/veteran/i.test(desc)) {
      if (input.tagName.toLowerCase() === 'select') {
        const select = input as HTMLSelectElement;
        for (let i = 0; i < select.options.length; i++) {
          if (select.options[i].text.toLowerCase().includes('not') || select.options[i].text.toLowerCase().includes('decline')) {
            select.selectedIndex = i;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            matched = true;
            break;
          }
        }
      }
    }
    // EEO Disability
    else if (/disabilit/i.test(desc)) {
      if (input.tagName.toLowerCase() === 'select') {
        const select = input as HTMLSelectElement;
        for (let i = 0; i < select.options.length; i++) {
          if (select.options[i].text.toLowerCase().includes('no') || select.options[i].text.toLowerCase().includes('decline')) {
            select.selectedIndex = i;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            matched = true;
            break;
          }
        }
      }
    }
    // Custom Answers Check
    else if (profile.customAnswers) {
      for (const [key, value] of Object.entries(profile.customAnswers)) {
        const cleanKey = key.replace(/_/g, ' ').toLowerCase();
        if (cleanKey.length > 2 && desc.includes(cleanKey)) {
          setVal(input, value as string);
          matched = true;
          break;
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
