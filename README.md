# 🚀 AI Job Seeker Copilot (Chrome Extension & Backend)

An intelligent, 1-click job application autofiller, custom AI question responder, and ATS cover letter generator with modern photo-tools dark slate design.

---

## ✨ Features Included

1. **⚡ 1-Click Form Autofill**:
   - Intelligently detects and fills: First & Last Name, Email, Phone, Address, City, State, Zip, Country, LinkedIn URL, GitHub URL, Portfolio, Current Title, Company, Years of Experience, Salary Expectations, Notice Period, Education, Degree, Major, and Work Authorization questions.
   - Works across **LinkedIn Easy Apply**, **Indeed**, **Greenhouse**, **Lever**, **Workday**, and all major ATS career sites.
2. **🪄 In-Page Floating Quick Action Pill**:
   - Injected directly into job pages via **Shadow DOM** so page styles never conflict.
   - 1-click triggers immediate form autofill without opening the popup.
3. **✨ AI Custom Question Copilot ("Magic Pen")**:
   - Solves open-ended questions (*"Why do you want to work here?"*, *"Greatest strengths?"*, *"Describe a technical conflict"*).
   - Tailors responses in 3 distinct tones: **Professional**, **Confident**, or **Creative**.
4. **📝 ATS-Optimized Cover Letter Generator**:
   - Instantly writes tailored cover letters matched to the exact job description and company.
   - 1-click **Copy to Clipboard** and **Download as `.txt`**.
5. **👤 Profile & Resume Manager**:
   - Full profile manager stored locally in Chrome (`chrome.storage.local`).
   - Add/remove skills, salary expectations, and import/export profile as JSON backups.
6. **📊 Built-in Application Tracker**:
   - Automatically tracks every job you apply to with dates, company names, and status tags (*Applied*, *Screening*, *Interview*, *Offer*, *Rejected*).
   - Export all applied jobs to **CSV/Excel** anytime.
7. **💎 Built-in Pro Monetization & Paywall**:
   - Free tier includes 5 free applications/day.
   - Integrated with ExtensionPay / Stripe for \$9.99/mo Pro subscriptions.

---

## 🛠️ How to Load the Extension in Chrome (Takes 30 Seconds)

1. Open **Google Chrome** and navigate to:
   ```text
   chrome://extensions/
   ```
2. Enable **"Developer mode"** (toggle in the top-right corner).
3. Click the **"Load unpacked"** button in the top-left corner.
4. Select this directory:
   ```text
   S:\Computer\Computer Software\Build Apps\Ai Job Seaker\extension\.output\chrome-mv3
   ```
5. Pin the **AI Job Seeker** icon to your Chrome toolbar!

---

## 🏃 Running the Development Servers

### 1. Build & Watch Chrome Extension
```powershell
Set-Location 'S:\Computer\Computer Software\Build Apps\Ai Job Seaker\extension'
npm run dev
```

### 2. Run Backend API
```powershell
Set-Location 'S:\Computer\Computer Software\Build Apps\Ai Job Seaker\backend'
npm run dev
```
Backend runs at `http://localhost:3000`. Set your `GEMINI_API_KEY` in `backend/.env` for live AI responses.
