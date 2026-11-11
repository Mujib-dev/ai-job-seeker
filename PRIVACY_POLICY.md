# Privacy Policy for AI Job Seeker by LynkZone

**Product Name:** AI Job Seeker by LynkZone - 1-Click Form Autofill & AI Copilot  
**Extension ID:** `ibphjhilkjffjihjendaklhhiofallgj`  
**Developer / Organization:** LynkZone (Developer: Mujib Ur Rahman)  
**Last Updated & Effective Date:** November 11, 2026  
**Official Privacy Policy URL:** https://ai-job-seeker-backend-jspe.onrender.com/privacy  
**Contact Email:** mujiburrahman.dev@gmail.com | **WhatsApp:** +92 348 1974606  

---

### Single Purpose Statement
AI Job Seeker by LynkZone provides automated form autofill for online job applications, tailored AI response generation for job questionnaires, and application status tracking.

---

### 1. User Data Collection (What We Collect and How We Collect It)

We adhere strictly to the principle of data minimization. The Extension only collects information that is directly necessary to execute form autofilling, provide tailored career AI suggestions, and manage your usage quotas. All personal information collected is provided directly by you.

#### Categories of Collected Data:
1. **Personally Identifiable Information (PII):**
   - *Fields:* First name, last name, email address, phone/mobile number, physical street address, city, state/province, postal/ZIP code, country, and optional national identity/CNIC credentials for regional job portals.
   - *Collection Method:* Entered manually by the user into the Extension's Profile settings. We do NOT harvest personal information automatically.
2. **Professional & Employment Profile:**
   - *Fields:* Current job title, current company/employer, total years of experience, salary expectations, notice period, work authorization status, visa sponsorship requirements, remote/hybrid preference, LinkedIn profile URL, GitHub URL, portfolio URL, and Twitter handle.
   - *Collection Method:* Entered manually by the user into the Extension's Profile tabs.
3. **Educational Background:**
   - *Fields:* School/University name, degree/qualification obtained, field of study/major, skills list, and professional certifications.
   - *Collection Method:* Entered manually by the user into the Extension's Profile tabs.
4. **Website Content & Form Fields (DOM Data):**
   - *Fields:* HTML input, textarea, and select element identifiers (such as ID, name, placeholder, label text, and autocomplete attributes), current page title, and URL of the active job application tab.
   - *Collection Method:* Inspected temporarily in browser memory *strictly* when the user explicitly clicks the "Autofill" button or floating widget on an active webpage. We do NOT log, store, or transmit your overall browser browsing history.
5. **User-Generated Prompts & AI Content:**
   - *Fields:* Application questionnaire prompts (e.g., "Why do you want to work here?"), job description excerpts, custom Q&A entries, and generated cover letter drafts.
   - *Collection Method:* Pasted or typed by the user into the Extension's AI Copilot input area.
6. **Usage & Subscription Status:**
   - *Fields:* Monthly free application count (resets on the 1st of each month), timestamp of last usage, and Pro license key status.
   - *Collection Method:* Calculated and stored locally within the browser to manage the 50 free monthly application tier.

---

### 2. User Data Handling and Usage (How We Use Your Data)

Every piece of collected data is used exclusively to deliver the Extension's stated features:
- **Form Autofill Execution:** Your saved personal, employment, and education details are matched with standard form fields (name, email, phone, address, experience) on active job postings and populated into the page DOM when you click "Autofill".
- **Custom AI Response & Cover Letter Generation:** When you invoke the "Generate Answer" or "Generate Cover Letter" features, your prompt, relevant qualification bullet points, and job description excerpts are formatted into a prompt and submitted to Google Gemini API to generate professional, context-aware responses.
- **Application Tracking:** When an autofill operation succeeds, the job title, company name, URL, and application timestamp are logged to your local "Tracker" tab so you can monitor your job search pipeline.
- **Quota & License Management:** To provide 50 free monthly applications and enable optional Pro features without requiring accounts or logins.

---

### 3. User Data Storage, Retention, and Security

LynkZone is built on a **local-first architecture**:
- **Local Storage on Your Device:** All your personal profile information, work history, education, skills, custom answers, and application tracking records are stored **exclusively on your personal computer** using Chrome's secure, sandboxed `chrome.storage.local` API.
- **No Centralized Resume Database:** LynkZone does not maintain an external cloud database of candidate profiles, resumes, addresses, or job applications. Your information does not live on our servers.
- **Encryption in Transit:** Whenever data is transmitted over the internet (such as sending a question prompt to the AI endpoint or verifying a Pro license key), it is encrypted using modern industry-standard **HTTPS / TLS 1.3 protocols**.
- **Data Retention Period:** Your data remains stored in your local browser sandbox indefinitely until you edit it, clear it, or uninstall the Extension. Uninstalling the Extension permanently and irreversibly deletes all stored profile data from your machine.

---

### 4. User Data Sharing and Third-Party Disclosures (All Parties Disclosed)

> **Zero Sale of Data:** LynkZone does NOT sell, rent, lease, trade, or share your personal data with third-party advertisers, data brokers, or marketing networks. User data is never used or transferred for purposes unrelated to job application form autofilling and career assistance. User data is never used for credit evaluation, lending, or advertising.

To provide specific core functionality, the Extension communicates with the following strictly vetted third-party service providers. **The following represents all parties that user data may be shared with:**

| Third-Party Provider | Data Shared with Provider | Purpose & Function | Privacy Policy |
| :--- | :--- | :--- | :--- |
| **Google LLC**<br/>*(Google Generative AI / Gemini API)*<br/>Mountain View, CA, USA | The specific application question prompt entered by the user, relevant skills summary, job title, and pasted job description excerpts. | Used solely to process and generate natural language answers to interview questions and ATS-friendly cover letter text in real time. | Data is processed via encrypted HTTPS. Under Google Cloud Enterprise API terms, user API inputs are not retained or used to train Google AI foundation models. [Google Privacy Policy](https://policies.google.com/privacy). |
| **Stripe, Inc.**<br/>San Francisco, CA, USA | Customer email address and payment method details (card number, expiration, CVC). | Used strictly for processing optional Pro subscription and lifetime license payments if the user chooses to upgrade via card. | Payment processing occurs entirely on Stripe's PCI-DSS Level 1 certified servers. LynkZone never handles, views, or stores credit card numbers. [Stripe Privacy Policy](https://stripe.com/privacy). |
| **Render Services, Inc.**<br/>San Francisco, CA, USA | Encrypted API request payloads in transit (AI question routing and license key verification strings). | Cloud infrastructure provider hosting the secure proxy backend and official LynkZone license verification service. | Data is encrypted in transit using TLS 1.3. Server logs are transient and do not persist personal profile data. [Render Privacy Policy](https://render.com/privacy). |

**No other third parties:** Except for the three service providers explicitly listed above, no third party has access to any user data.

---

### 5. Chrome Permissions Justification & Least Privilege

The Extension requests only the minimum set of permissions necessary to function:
- `activeTab` and `scripting`: Required strictly to read form field selectors (such as inputs and labels) on the active webpage when you click "Autofill" and insert your pre-approved profile values. These permissions are inactive until you trigger an autofill action.
- `storage`: Required to persist your profile fields, custom inputs, tracker entries, and free monthly usage count locally on your browser.
- Host Permissions (`https://*/*`, `http://*/*`, `file://*/*`): Job postings and application portals are hosted across thousands of independent domains (Greenhouse, Lever, Workday, Taleo, Ashby, SmartRecruiters, Jobvite, LinkedIn, Indeed, and university portals). Host access is required so the autofill content script can run on whichever job application site you navigate to.

---

### 6. User Rights, Data Control, and Deletion Procedures

You have full and continuous sovereignty over all your data:
- **Access & Modify:** You can view, edit, or update any field in your profile at any time directly in the Extension's "Profile" tab.
- **Data Deletion:** You can delete any saved information, custom field, or tracked application at any time.
- **Complete Erasure:** To purge 100% of your data instantly, you can uninstall the Extension from Chrome (Right-click icon > "Remove from Chrome") or clear extension storage in Chrome settings (`chrome://settings/content/all`).
- **Direct Inquiries:** You can email mujiburrahman.dev@gmail.com at any time to request assistance regarding your data privacy.

---

### 7. Developer Identity and Contact Information

For any questions, concerns, verification, or feedback regarding this Privacy Policy, please contact the developer directly:
- **Developer Name:** Mujib Ur Rahman
- **Organization:** LynkZone
- **Developer Email:** mujiburrahman.dev@gmail.com
- **WhatsApp / Phone:** +92 348 1974606
- **Location:** Peshawar, Khyber Pakhtunkhwa, Pakistan
- **Hosted Privacy Policy URL:** https://ai-job-seeker-backend-jspe.onrender.com/privacy
