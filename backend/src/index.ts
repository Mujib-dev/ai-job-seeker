import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import Stripe from 'stripe';
import {
  saveSubscription,
  getSubscriptionByEmail,
  getSubscriptionByLicense,
  getAllSubscriptions,
  generateLicenseKey,
  UserSubscriptionRecord,
} from './db.js';

dotenv.config();

const app = new Hono();

// Allow requests from all Chrome extensions & local dev
app.use(
  '/*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'x-user-id', 'stripe-signature'],
  })
);

const geminiApiKey = process.env.GEMINI_API_KEY || 'DEMO_KEY';
const genAI = new GoogleGenerativeAI(geminiApiKey);

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;
const port = Number(process.env.PORT) || 3000;

// 1. Local Test Job Application Form
app.get('/privacy', (c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Privacy Policy - AI Job Seeker by LynkZone</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #0b0f19;
      color: #e2e8f0;
      margin: 0;
      padding: 40px 20px;
      line-height: 1.7;
    }
    .container {
      max-width: 840px;
      margin: 0 auto;
      background: #0f172a;
      padding: 44px;
      border-radius: 18px;
      border: 1px solid #1e293b;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
    }
    .badge {
      display: inline-block;
      background: rgba(14, 165, 233, 0.15);
      color: #38bdf8;
      border: 1px solid rgba(14, 165, 233, 0.35);
      padding: 4px 12px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      margin-bottom: 16px;
    }
    h1 { color: #ffffff; margin-top: 0; font-size: 28px; font-weight: 800; }
    h2 { color: #38bdf8; font-size: 20px; margin-top: 36px; margin-bottom: 12px; border-bottom: 1px solid #1e293b; padding-bottom: 8px; }
    h3 { color: #818cf8; font-size: 16px; margin-top: 20px; margin-bottom: 8px; }
    p, li { color: #cbd5e1; font-size: 14px; }
    ul, ol { padding-left: 24px; margin-top: 8px; margin-bottom: 16px; }
    li { margin-bottom: 6px; }
    strong { color: #ffffff; }
    code { background: #0b0f19; padding: 2px 6px; border-radius: 4px; font-family: monospace; color: #38bdf8; font-size: 13px; border: 1px solid #1e293b; }
    .table-wrapper { overflow-x: auto; margin: 16px 0; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; }
    th { background: #1e293b; color: #38bdf8; padding: 12px; border: 1px solid #334155; }
    td { padding: 12px; border: 1px solid #334155; color: #cbd5e1; vertical-align: top; }
    tr:nth-child(even) { background: rgba(30, 41, 59, 0.4); }
    .highlight-box {
      background: rgba(99, 102, 241, 0.1);
      border-left: 4px solid #6366f1;
      padding: 16px 20px;
      border-radius: 0 12px 12px 0;
      margin: 20px 0;
    }
    .footer {
      margin-top: 44px;
      padding-top: 24px;
      border-top: 1px solid #1e293b;
      font-size: 13px;
      color: #94a3b8;
    }
    a { color: #38bdf8; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <div class="badge">Official Chrome Web Store Privacy Policy</div>
    <h1>Privacy Policy for AI Job Seeker by LynkZone</h1>
    <p>
      <strong>Product Name:</strong> AI Job Seeker by LynkZone - 1-Click Form Autofill & AI Copilot<br />
      <strong>Extension ID:</strong> <code>ibphjhilkjffjihjendaklhhiofallgj</code><br />
      <strong>Developer / Entity:</strong> LynkZone (Developer: Mujib Ur Rahman)<br />
      <strong>Last Updated & Effective Date:</strong> November 11, 2026<br />
      <strong>Contact Email:</strong> <a href="mailto:mujiburrahman.dev@gmail.com">mujiburrahman.dev@gmail.com</a> | <strong>WhatsApp Support:</strong> +92 348 1974606
    </p>

    <div class="highlight-box">
      <strong>Core Purpose & Commitment:</strong> AI Job Seeker by LynkZone is designed to assist job seekers with a single primary function: efficiently automating repetitive form-filling on job application web pages and providing optional AI-powered assistance for job questions and cover letters. We believe your career information is deeply personal. <strong>We do not sell, rent, monetize, trade, or transfer your personal data to any third-party brokers, advertisers, or marketers.</strong>
    </div>

    <!-- SECTION 1 -->
    <h2>1. User Data Collection (What We Collect and How We Collect It)</h2>
    <p>We believe in data minimization. The Extension only collects information that is directly necessary to execute form autofilling, provide tailored career AI suggestions, and manage your usage quotas. All personal information collected is provided directly by you.</p>

    <h3>A. Categories of Collected Data</h3>
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Data Category</th>
            <th>Specific Data Fields</th>
            <th>Collection Method</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Personal Identification Information (PII)</strong></td>
            <td>First name, last name, email address, phone/mobile number, physical street address, city, state/province, postal/ZIP code, country, and optional national identity/CNIC credentials for regional job portals.</td>
            <td>Entered manually by the user into the Extension's Profile settings. Never collected automatically without user input.</td>
          </tr>
          <tr>
            <td><strong>Professional & Employment Profile</strong></td>
            <td>Current job title, current company/employer, total years of experience, salary expectations, notice period, work authorization status, visa sponsorship requirements, remote/hybrid preference, LinkedIn profile URL, GitHub URL, portfolio URL, and Twitter handle.</td>
            <td>Entered manually by the user into the Extension's Profile tabs.</td>
          </tr>
          <tr>
            <td><strong>Educational Background</strong></td>
            <td>School/University name, degree/qualification obtained, field of study/major, skills list, and professional certifications.</td>
            <td>Entered manually by the user into the Extension's Profile tabs.</td>
          </tr>
          <tr>
            <td><strong>Website Content & Form Fields (DOM Data)</strong></td>
            <td>HTML input, textarea, and select element identifiers (such as ID, name, placeholder, label text, and autocomplete attributes), current page title, and URL of the active job application tab.</td>
            <td>Inspected temporarily in browser memory <em>strictly</em> when the user explicitly clicks the "Autofill" button or floating widget on an active webpage.</td>
          </tr>
          <tr>
            <td><strong>User-Generated Prompts & AI Content</strong></td>
            <td>Application questionnaire prompts (e.g., "Why do you want to work here?"), job description excerpts, custom Q&A entries, and generated cover letter drafts.</td>
            <td>Pasted or typed by the user into the Extension's AI Copilot input area.</td>
          </tr>
          <tr>
            <td><strong>Usage & Subscription Status</strong></td>
            <td>Monthly free application count (resets on the 1st of each month), timestamp of last usage, and Pro license key status.</td>
            <td>Calculated and stored locally within the browser to manage the 50 free monthly application tier.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- SECTION 2 -->
    <h2>2. User Data Handling and Usage (How We Use Your Data)</h2>
    <p>Every piece of collected data is used exclusively to deliver the Extension's stated features. Specifically, user data is handled in the following manners:</p>
    <ul>
      <li><strong>Form Autofill Execution:</strong> Your saved personal, employment, and education details are matched with standard form fields (name, email, phone, address, experience) on active job postings and populated into the page DOM when you click "Autofill".</li>
      <li><strong>Custom AI Response & Cover Letter Generation:</strong> When you invoke the "Generate Answer" or "Generate Cover Letter" features, your prompt, relevant qualification bullet points, and job description excerpts are formatted into a prompt and submitted to Google Gemini API to generate professional, context-aware responses.</li>
      <li><strong>Application Tracking:</strong> When an autofill operation succeeds, the job title, company name, URL, and application timestamp are logged to your local "Tracker" tab so you can monitor your job search pipeline.</li>
      <li><strong>Quota & License Management:</strong> To provide 50 free monthly applications and enable optional Pro features without requiring accounts or logins.</li>
    </ul>

    <!-- SECTION 3 -->
    <h2>3. User Data Storage, Retention, and Security</h2>
    <p>LynkZone is built on a <strong>local-first architecture</strong>:</p>
    <ul>
      <li><strong>Local Storage on Your Device:</strong> All your personal profile information, work history, education, skills, custom answers, and application tracking records are stored <strong>exclusively on your personal computer</strong> using Chrome's secure, sandboxed <code>chrome.storage.local</code> API.</li>
      <li><strong>No Centralized Resume Database:</strong> LynkZone does not maintain an external cloud database of candidate profiles, resumes, addresses, or job applications. Your information does not live on our servers.</li>
      <li><strong>Encryption in Transit:</strong> Whenever data is transmitted over the internet (such as sending a question prompt to the AI endpoint or verifying a Pro license key), it is encrypted using modern industry-standard <strong>HTTPS / TLS 1.3 protocols</strong>.</li>
      <li><strong>Data Retention Period:</strong> Your data remains stored in your local browser sandbox indefinitely until you edit it, clear it, or uninstall the Extension. Uninstalling the Extension permanently and irreversibly deletes all stored profile data from your machine.</li>
    </ul>

    <!-- SECTION 4 -->
    <h2>4. User Data Sharing and Third-Party Disclosures</h2>
    <div class="highlight-box">
      <strong>Zero Sale of Data:</strong> LynkZone does NOT sell, rent, lease, trade, or share your personal data with third-party advertisers, data brokers, or marketing networks. User data is never used or transferred for purposes unrelated to job application form autofilling and career assistance. User data is never used for credit evaluation, lending, or advertising.
    </div>

    <p>To provide specific core functionality, the Extension communicates with the following strictly vetted third-party service providers. <strong>The following represents all parties that user data may be shared with:</strong></p>

    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Third-Party Provider</th>
            <th>Data Shared with Provider</th>
            <th>Purpose & Function</th>
            <th>Privacy Policy & Security</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <strong>Google LLC</strong><br />
              <em>(Google Generative AI / Gemini API)</em><br />
              Mountain View, CA, USA
            </td>
            <td>The specific application question prompt entered by the user, relevant skills summary, job title, and pasted job description excerpts.</td>
            <td>Used solely to process and generate natural language answers to interview questions and ATS-friendly cover letter text in real time.</td>
            <td>Data is processed via encrypted HTTPS. Under Google Cloud Enterprise API terms, user API inputs are not retained or used to train Google AI foundation models. <a href="https://policies.google.com/privacy" target="_blank" rel="noopener">Google Privacy Policy</a>.</td>
          </tr>
          <tr>
            <td>
              <strong>Stripe, Inc.</strong><br />
              San Francisco, CA, USA
            </td>
            <td>Customer email address and payment method details (card number, expiration, CVC).</td>
            <td>Used strictly for processing optional Pro subscription and lifetime license payments if the user chooses to upgrade via card.</td>
            <td>Payment processing occurs entirely on Stripe's PCI-DSS Level 1 certified servers. LynkZone never handles, views, or stores your credit card numbers. <a href="https://stripe.com/privacy" target="_blank" rel="noopener">Stripe Privacy Policy</a>.</td>
          </tr>
          <tr>
            <td>
              <strong>Render Services, Inc.</strong><br />
              San Francisco, CA, USA
            </td>
            <td>Encrypted API request payloads in transit (AI question routing and license key verification strings).</td>
            <td>Cloud infrastructure provider hosting the secure proxy backend and official LynkZone license verification service.</td>
            <td>Data is encrypted in transit using TLS 1.3. Server logs are transient and do not persist personal profile data. <a href="https://render.com/privacy" target="_blank" rel="noopener">Render Privacy Policy</a>.</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p><strong>No other third parties:</strong> Except for the three service providers explicitly listed above, no third party has access to any user data.</p>

    <!-- SECTION 5 -->
    <h2>5. Chrome Permissions Justification & Least Privilege</h2>
    <p>The Extension requests only the minimum set of permissions necessary to function:</p>
    <ul>
      <li><code>activeTab</code> and <code>scripting</code>: Required strictly to read form field selectors (such as inputs and labels) on the active webpage when you click "Autofill" and insert your pre-approved profile values. These permissions are inactive until you trigger an autofill action.</li>
      <li><code>storage</code>: Required to persist your profile fields, custom inputs, tracker entries, and free monthly usage count locally on your browser.</li>
      <li>Host Permissions (<code>https://*/*</code>, <code>http://*/*</code>, <code>file://*/*</code>): Job postings and application portals are hosted across thousands of independent domains (Greenhouse, Lever, Workday, Taleo, Ashby, SmartRecruiters, Jobvite, LinkedIn, Indeed, and university portals). Host access is required so the autofill content script can run on whichever job application site you navigate to.</li>
    </ul>

    <!-- SECTION 6 -->
    <h2>6. User Rights, Data Control, and Deletion Procedures</h2>
    <p>You have full and continuous sovereignty over all your data:</p>
    <ul>
      <li><strong>Access & Modify:</strong> You can view, edit, or update any field in your profile at any time directly in the Extension's "Profile" tab.</li>
      <li><strong>Data Deletion:</strong> You can delete any saved information, custom field, or tracked application at any time.</li>
      <li><strong>Complete Erasure:</strong> To purge 100% of your data instantly, you can uninstall the Extension from Chrome (Right-click icon > "Remove from Chrome") or clear extension storage in Chrome settings (<code>chrome://settings/content/all</code>).</li>
      <li><strong>Direct Inquiries:</strong> You can email <a href="mailto:mujiburrahman.dev@gmail.com">mujiburrahman.dev@gmail.com</a> at any time to request assistance regarding your data privacy.</li>
    </ul>

    <!-- SECTION 7 -->
    <h2>7. Developer Identity and Contact Information</h2>
    <p>For any questions, concerns, verification, or feedback regarding this Privacy Policy, please contact the developer directly:</p>
    <ul>
      <li><strong>Developer Name:</strong> Mujib Ur Rahman</li>
      <li><strong>Organization:</strong> LynkZone</li>
      <li><strong>Developer Email:</strong> <a href="mailto:mujiburrahman.dev@gmail.com">mujiburrahman.dev@gmail.com</a></li>
      <li><strong>WhatsApp / Phone:</strong> +92 348 1974606</li>
      <li><strong>Location:</strong> Peshawar, Khyber Pakhtunkhwa, Pakistan</li>
      <li><strong>Hosted Privacy Policy URL:</strong> <a href="https://ai-job-seeker-backend-jspe.onrender.com/privacy">https://ai-job-seeker-backend-jspe.onrender.com/privacy</a></li>
    </ul>

    <div class="footer">
      &copy; 2026 LynkZone. All rights reserved. | AI Job Seeker is committed to user data privacy, security, and full compliance with Google Chrome Web Store Program Policies.
    </div>
  </div>
</body>
</html>
  `);
});

// 1. Local Test Job Application Form
app.get('/test', (c) => {
  try {
    const candidatePaths = [
      path.resolve(process.cwd(), '../test-job-form.html'),
      path.resolve(process.cwd(), 'test-job-form.html'),
      'S:\\Computer\\Computer Software\\Build Apps\\Ai Job Seaker\\test-job-form.html',
    ];
    let content = '';
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        content = fs.readFileSync(p, 'utf-8');
        break;
      }
    }
    if (!content) {
      return c.text('test-job-form.html not found on disk', 404);
    }
    return c.html(content);
  } catch (err: any) {
    return c.text('Failed to load test job form: ' + err.message, 500);
  }
});

app.get('/', (c) => {
  return c.redirect('/test');
});

// 2. Health & Status Endpoint
app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'AI Job Seeker Backend API',
    stripeConfigured: Boolean(stripe),
    geminiConfigured: geminiApiKey !== 'DEMO_KEY',
    timestamp: new Date().toISOString(),
  });
});

// 3. AI Custom Question Answer Endpoint
app.post('/api/generate-answer', async (c) => {
  try {
    const body = await c.req.json();
    const { profile, jobTitle, company, jobDescription, question, tone = 'professional' } = body;

    if (!question) {
      return c.json({ error: 'Question is required' }, 400);
    }

    if (geminiApiKey === 'DEMO_KEY') {
      return c.json({
        answer: `As a ${profile?.work?.currentTitle || 'Software Engineer'} with ${profile?.work?.yearsExperience || '5'}+ years of experience, my background in ${profile?.skills?.slice(0, 4).join(', ') || 'modern engineering'} prepares me to immediately deliver high-impact results for the ${jobTitle || 'role'} at ${company || 'your team'}. I approach this with disciplined technical execution, proactive cross-functional communication, and a focus on measurable user and business outcomes.`,
      });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `
You are an expert executive career coach helping a candidate apply for a job.
Candidate Profile:
- Name: ${profile?.personal?.firstName} ${profile?.personal?.lastName}
- Current Title: ${profile?.work?.currentTitle} at ${profile?.work?.currentCompany} (${profile?.work?.yearsExperience} years exp)
- Top Skills: ${profile?.skills?.join(', ')}
- Career Summary: ${profile?.work?.summary}
- Education: ${profile?.education?.degree} in ${profile?.education?.fieldOfStudy} from ${profile?.education?.school}

Target Job:
- Title: ${jobTitle}
- Company: ${company}
- Job Description Snippet: ${jobDescription?.slice(0, 1500) || 'Relevant industry role'}

Application Question to Answer:
"${question}"

Tone: ${tone} (e.g. professional, confident, concise)

Instructions:
1. Write a compelling, concise first-person answer (1-2 paragraphs max).
2. Tailor it specifically to the target company and position.
3. Highlight tangible experience and technical competencies from the candidate's profile.
4. Do NOT use generic buzzwords or hollow fluff. Answer directly and persuasively.
    `;

    const result = await model.generateContent(prompt);
    const answer = result.response.text();

    return c.json({ answer });
  } catch (error: any) {
    console.error('Error generating AI answer:', error);
    return c.json({ error: 'Failed to generate answer', details: error.message }, 500);
  }
});

// 4. AI Cover Letter Generator Endpoint
app.post('/api/generate-cover-letter', async (c) => {
  try {
    const body = await c.req.json();
    const { profile, jobTitle, company, jobDescription } = body;

    const today = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    if (geminiApiKey === 'DEMO_KEY') {
      return c.json({
        coverLetter: `${profile?.personal?.firstName || 'Candidate'} ${profile?.personal?.lastName || ''}
${profile?.personal?.email || 'email@example.com'} | ${profile?.personal?.phone || ''}
${profile?.personal?.linkedIn || ''}

${today}

Hiring Team
${company || 'The Hiring Organization'}

Dear Hiring Team,

I am writing to express my strong enthusiasm for the ${jobTitle || 'Open Position'} role at ${company || 'your organization'}. With over ${profile?.work?.yearsExperience || '5'} years of experience as a ${profile?.work?.currentTitle || 'Software Engineer'}, alongside a proven track record in ${profile?.skills?.slice(0, 4).join(', ') || 'modern software development'}, I am excited to bring my technical expertise and problem-solving drive to your team.

Throughout my career, I have consistently focused on delivering robust, user-centric software that drives measurable business outcomes. In my recent work, I have spearheaded the design and implementation of scalable systems, optimized performance bottlenecks, and collaborated across product and engineering disciplines to reliably meet tight milestones.

What particularly excites me about ${company || 'your organization'} is your dedication to product innovation and engineering standards. I am eager to apply my background in ${profile?.skills?.slice(0, 3).join(', ') || 'core technologies'} to support your continued growth, elevate user experiences, and solve critical technical challenges.

Thank you for your time and consideration. I welcome the opportunity to discuss in greater detail how my skills, background, and enthusiasm will benefit ${company || 'your team'}.

Sincerely,

${profile?.personal?.firstName || 'Candidate'} ${profile?.personal?.lastName || ''}`,
      });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `
Generate a tailored, ATS-friendly professional cover letter.
Candidate Profile:
- Full Name: ${profile?.personal?.firstName} ${profile?.personal?.lastName}
- Current Title: ${profile?.work?.currentTitle} (${profile?.work?.yearsExperience} years exp)
- Skills: ${profile?.skills?.join(', ')}
- Summary: ${profile?.work?.summary}
- Contact: ${profile?.personal?.email} | ${profile?.personal?.phone} | ${profile?.personal?.city}, ${profile?.personal?.state}

Target Role:
- Title: ${jobTitle}
- Company: ${company}
- Job Description: ${jobDescription?.slice(0, 2000) || 'Relevant industry opening'}

Write a 3-paragraph, modern, confident cover letter that clearly illustrates why the candidate is a strong fit.
`;

    const result = await model.generateContent(prompt);
    const coverLetter = result.response.text();

    return c.json({ coverLetter });
  } catch (error: any) {
    console.error('Error generating cover letter:', error);
    return c.json({ error: 'Failed to generate cover letter', details: error.message }, 500);
  }
});

// ==========================================
// 5. SECURE PAYMENT & SUBSCRIPTION SYSTEM (REAL DATA ONLY)
// ==========================================

// 5A. Create Checkout Session (Stripe Live or Direct WhatsApp Order)
app.post('/api/create-checkout-session', async (c) => {
  try {
    const { email, planType = 'lifetime' } = await c.req.json();
    const userEmail = (email || '').trim().toLowerCase();

    if (!userEmail || !userEmail.includes('@')) {
      return c.json({ error: 'Valid customer email is required for payment receipt.' }, 400);
    }

    const baseUrl = process.env.BASE_URL || `http://localhost:${port}`;
    const isLifetime = planType === 'lifetime';

    // Real Stripe Checkout Session
    if (stripe) {
      const session = await (stripe.checkout.sessions.create as any)({
        payment_method_types: ['card'],
        customer_email: userEmail,
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: isLifetime ? 'AI Job Seeker Pro — Lifetime Pass' : 'AI Job Seeker Pro — Monthly Subscription',
                description: isLifetime
                  ? 'Unlimited 1-Click Form Autofills, ATS Cover Letters & AI Copilot forever.'
                  : 'Unlimited Autofills and AI Copilot billed monthly.',
              },
              unit_amount: isLifetime ? 899 : 299, // $8.99 or $2.99 in cents
              recurring: isLifetime ? undefined : { interval: 'month' },
            },
            quantity: 1,
          },
        ],
        mode: isLifetime ? 'payment' : 'subscription',
        success_url: `${baseUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/test`,
        metadata: { userEmail, planType },
      });

      return c.json({ checkoutUrl: session.url });
    }

    // If Stripe is not yet configured with live keys, reject dummy transactions
    // and guide the user to verified LynkZone direct WhatsApp purchase
    const whatsappText = encodeURIComponent(
      `Hello LynkZone! I would like to purchase AI Job Seeker Pro (${
        isLifetime ? 'Lifetime Pass $8.99' : 'Monthly Pro $2.99'
      }). My account email is: ${userEmail}. Please send official payment details and issue my license key.`
    );

    return c.json(
      {
        error: 'STRIPE_OFFLINE',
        message: 'Direct card checkout requires live Stripe setup. For instant purchase, use LynkZone WhatsApp (+92 348 1974606).',
        whatsappUrl: `https://wa.me/923481974606?text=${whatsappText}`,
      },
      400
    );
  } catch (err: any) {
    console.error('Checkout error:', err);
    return c.json({ error: err.message }, 500);
  }
});

// 5B. Payment Success Page — Strictly Verifies Real Stripe Payment Session
app.get('/payment-success', async (c) => {
  const sessionId = c.req.query('session_id');

  if (!sessionId) {
    return c.html(`
      <!DOCTYPE html>
      <html lang="en">
      <head><meta charset="UTF-8"><title>Payment Verification Failed</title><style>body{background:#0b0f19;color:#f1f5f9;font-family:sans-serif;padding:40px;text-align:center;}</style></head>
      <body>
        <h1 style="color:#ef4444;">Payment Verification Required</h1>
        <p>No valid checkout session identifier was provided. Dummy or manual access is not permitted.</p>
        <p>If you made a payment via WhatsApp, please enter your license key directly in the extension popup.</p>
        <a href="/test" style="color:#38bdf8;">Return to Job Form</a>
      </body>
      </html>
    `, 400);
  }

  if (!stripe) {
    return c.html(`
      <!DOCTYPE html>
      <html lang="en">
      <head><meta charset="UTF-8"><title>Stripe Not Configured</title><style>body{background:#0b0f19;color:#f1f5f9;font-family:sans-serif;padding:40px;text-align:center;}</style></head>
      <body>
        <h1 style="color:#f59e0b;">Stripe Credentials Required</h1>
        <p>Stripe is not configured on this server to verify sessions.</p>
      </body>
      </html>
    `, 400);
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      return c.html(`
        <!DOCTYPE html>
        <html lang="en">
        <head><meta charset="UTF-8"><title>Payment Incomplete</title><style>body{background:#0b0f19;color:#f1f5f9;font-family:sans-serif;padding:40px;text-align:center;}</style></head>
        <body>
          <h1 style="color:#ef4444;">Payment Unconfirmed</h1>
          <p>Status: ${session.payment_status}. Payment has not been finalized.</p>
        </body>
        </html>
      `, 400);
    }

    const email = (session.customer_email || session.metadata?.userEmail || '').toLowerCase();
    const plan = (session.metadata?.planType as any) || 'lifetime';

    let record = getSubscriptionByEmail(email);
    if (!record) {
      const licenseKey = generateLicenseKey(plan);
      record = {
        email,
        isPro: true,
        plan,
        status: 'active',
        licenseKey,
        stripeCustomerId: session.customer as string,
        stripeSessionId: session.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      saveSubscription(record);
    }

    return c.html(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Payment Successful - LynkZone AI Job Seeker Pro</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #0b0f19;
      color: #f1f5f9;
      margin: 0;
      padding: 40px 20px;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 90vh;
    }
    .card {
      width: 100%;
      max-width: 460px;
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 16px;
      padding: 32px;
      text-align: center;
      box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5);
    }
    .icon {
      width: 56px;
      height: 56px;
      background: rgba(16, 185, 129, 0.15);
      color: #10b981;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px auto;
      font-size: 24px;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }
    h1 { font-size: 22px; color: #fff; margin: 0 0 8px 0; }
    p { color: #94a3b8; font-size: 13px; line-height: 1.5; margin: 0 0 24px 0; }
    .license-box {
      background: #0b0f19;
      border: 1px dashed #6366f1;
      padding: 16px;
      border-radius: 12px;
      margin-bottom: 24px;
      text-align: left;
    }
    .license-label { font-size: 11px; color: #818cf8; font-weight: 600; margin-bottom: 4px; }
    .license-key { font-family: monospace; font-size: 16px; font-weight: 700; color: #38bdf8; word-break: break-all; }
    .btn {
      display: inline-block;
      width: 100%;
      box-sizing: border-box;
      padding: 12px;
      background: linear-gradient(135deg, #4f46e5, #06b6d4);
      color: white;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 700;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✓</div>
    <h1>Payment Verified!</h1>
    <p>Your payment via Stripe was verified successfully. Your Pro license is now active.</p>

    <div class="license-box">
      <div class="license-label">YOUR OFFICIAL PRO LICENSE KEY:</div>
      <div class="license-key" id="licKey">${record.licenseKey}</div>
      <div style="font-size: 11px; color: #64748b; margin-top: 6px;">Tied to account: ${record.email}</div>
    </div>

    <a href="/test" class="btn">Test Extension on Job Form →</a>
    <div style="font-size: 11px; color: #64748b; margin-top: 14px;">
      Open your AI Job Seeker extension popup and paste your license key to activate Pro.
    </div>
  </div>
</body>
</html>
    `);
  } catch (err: any) {
    return c.html(`<h1>Error Verifying Payment</h1><p>${err.message}</p>`, 500);
  }
});

// 5B. Verify Admin Master Security Key
app.post('/api/admin/verify-key', async (c) => {
  try {
    const { adminKey } = await c.req.json();
    const expectedKey = process.env.ADMIN_SECRET_KEY || 'LynkZoneSecure2026!';
    if (!adminKey || adminKey !== expectedKey) {
      await new Promise((r) => setTimeout(r, 600)); // anti-bruteforce delay
      return c.json({ valid: false, error: 'Unauthorized: Invalid Master Security Key.' }, 401);
    }
    return c.json({ valid: true });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// 5C. Admin Endpoint to Issue Real Paid Licenses (For WhatsApp / Local Banking Orders)
app.post('/api/admin/issue-license', async (c) => {
  try {
    const { adminKey, email, planType = 'lifetime' } = await c.req.json();
    const expectedKey = process.env.ADMIN_SECRET_KEY || 'LynkZoneSecure2026!';

    if (!adminKey || adminKey !== expectedKey) {
      return c.json({ error: 'Unauthorized: Invalid admin key.' }, 401);
    }

    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return c.json({ error: 'Valid customer email is required.' }, 400);
    }

    const licenseKey = generateLicenseKey(planType);
    const record: UserSubscriptionRecord = {
      email: cleanEmail,
      isPro: true,
      plan: planType,
      status: 'active',
      licenseKey,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveSubscription(record);

    return c.json({
      success: true,
      message: `License successfully issued for ${cleanEmail}`,
      licenseKey,
      plan: planType,
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// 5D. Admin Endpoint to List All Active Issued Licenses
app.post('/api/admin/list-licenses', async (c) => {
  try {
    const { adminKey } = await c.req.json();
    const expectedKey = process.env.ADMIN_SECRET_KEY || 'LynkZoneSecure2026!';
    if (!adminKey || adminKey !== expectedKey) {
      return c.json({ error: 'Unauthorized: Invalid admin key.' }, 401);
    }
    const all = getAllSubscriptions();
    return c.json({ subscriptions: all });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// 5E. LynkZone WhatsApp Admin Web Portal (Gated Behind Master Security PIN)
app.get('/admin', (c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>LynkZone Admin Portal - Protected Security Area</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #0b0f19;
      color: #f1f5f9;
      margin: 0;
      padding: 30px 20px;
      display: flex;
      justify-content: center;
      min-height: 100vh;
      box-sizing: border-box;
    }
    .wrapper {
      width: 100%;
      max-width: 680px;
    }
    .card {
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 16px;
      padding: 28px;
      box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5);
      margin-bottom: 24px;
    }
    .badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      background: rgba(16, 185, 129, 0.15);
      color: #10b981;
      border: 1px solid rgba(16, 185, 129, 0.3);
      margin-bottom: 12px;
    }
    h1 { font-size: 20px; margin: 0 0 6px 0; color: #fff; }
    p { color: #94a3b8; font-size: 13px; margin: 0 0 20px 0; }
    .form-group { margin-bottom: 14px; }
    label { display: block; font-size: 11px; color: #cbd5e1; margin-bottom: 5px; font-weight: 600; }
    input, select {
      width: 100%;
      box-sizing: border-box;
      padding: 10px 12px;
      background: #0b0f19;
      border: 1px solid #334155;
      border-radius: 8px;
      color: #fff;
      font-size: 13px;
    }
    input:focus, select:focus {
      outline: none;
      border-color: #6366f1;
    }
    .btn {
      width: 100%;
      padding: 12px;
      background: linear-gradient(135deg, #10b981, #06b6d4);
      border: none;
      border-radius: 8px;
      color: white;
      font-weight: 700;
      font-size: 14px;
      cursor: pointer;
      margin-top: 10px;
      transition: opacity 0.2s;
    }
    .btn:hover { opacity: 0.9; }
    .result-card {
      display: none;
      background: #0b0f19;
      border: 1px dashed #10b981;
      padding: 20px;
      border-radius: 12px;
      margin-top: 20px;
      animation: fadeIn 0.3s ease;
    }
    .key-box {
      font-family: monospace;
      font-size: 18px;
      font-weight: 800;
      color: #38bdf8;
      background: #0f172a;
      padding: 10px 14px;
      border-radius: 8px;
      border: 1px solid #1e293b;
      margin: 10px 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .copy-btn {
      padding: 8px 14px;
      background: #10b981;
      color: white;
      border: none;
      border-radius: 6px;
      font-weight: 600;
      font-size: 12px;
      cursor: pointer;
    }
    .table-container {
      margin-top: 10px;
      max-height: 240px;
      overflow-y: auto;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    th, td {
      padding: 10px 12px;
      text-align: left;
      border-bottom: 1px solid #1e293b;
    }
    th { color: #94a3b8; font-weight: 600; }
    td { color: #e2e8f0; }
    .status-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 9999px;
      font-size: 10px;
      font-weight: 700;
      background: rgba(16, 185, 129, 0.2);
      color: #34d399;
    }
  </style>
</head>
<body>
  <!-- ================= SCREEN 1: LOCKED SECURITY GATE ================= -->
  <div id="loginGateCard" class="card" style="width: 100%; max-width: 440px; margin: 40px auto; text-align: center;">
    <div style="width: 56px; height: 56px; background: rgba(99,102,241,0.15); border: 1px solid rgba(99,102,241,0.3); border-radius: 16px; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center; font-size: 28px;">
      🛡️
    </div>
    <h2 style="font-size: 20px; color: #fff; margin: 0 0 6px;">LynkZone Admin Portal</h2>
    <p style="color: #94a3b8; font-size: 12px; margin-bottom: 22px;">Restricted security area. Please enter your Master Security PIN to unlock.</p>

    <form id="authForm">
      <div class="form-group" style="text-align: left;">
        <label>Master Security PIN / Key</label>
        <input type="password" id="authPinInput" placeholder="Enter Admin Security PIN..." required autofocus />
      </div>
      <div id="authErrorMsg" style="display: none; color: #ef4444; font-size: 12px; margin-bottom: 12px; padding: 10px; background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.3); border-radius: 8px;"></div>
      <button type="submit" id="authSubmitBtn" class="btn" style="background: linear-gradient(135deg, #6366f1, #8b5cf6);">
        🔒 Authenticate & Unlock Portal
      </button>
    </form>
  </div>

  <!-- ================= SCREEN 2: AUTHENTICATED DASHBOARD (HIDDEN UNTIL UNLOCKED) ================= -->
  <div id="adminDashboard" class="wrapper" style="display: none;">
    <!-- Top Bar with Authenticated Badge & Logout -->
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding: 10px 16px; background: #0f172a; border: 1px solid #1e293b; border-radius: 12px;">
      <div style="display: flex; items-center: center; gap: 8px;">
        <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #10b981; box-shadow: 0 0 8px #10b981; margin-top: 4px;"></span>
        <span style="font-size: 12px; font-weight: 700; color: #10b981;">LynkZone Master Admin • Authenticated Session</span>
      </div>
      <button type="button" id="logoutBtn" style="background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.3); color: #f87171; font-size: 11px; font-weight: 600; padding: 4px 12px; border-radius: 6px; cursor: pointer;">
        🚪 Lock / Log Out
      </button>
    </div>

    <div class="card">
      <span class="badge">WhatsApp Order Activation</span>
      <h1>Issue Pro License</h1>
      <p>When a customer pays via Easypaisa, JazzCash, or Bank, issue their verified Pro license here in 1 click.</p>

      <form id="issueForm">
        <div class="form-group">
          <label>Customer Email Address (from WhatsApp)</label>
          <input type="email" id="customerEmail" placeholder="customer@example.com" required />
        </div>

        <div class="form-group">
          <label>Plan Purchased</label>
          <select id="planType">
            <option value="lifetime">Lifetime Pass — $8.99 (Rs. 2,500 / one-time)</option>
            <option value="monthly">Monthly Pro — $2.99 (Rs. 850 / month)</option>
          </select>
        </div>

        <button type="submit" id="submitBtn" class="btn">⚡ Generate & Issue Pro License</button>
      </form>

      <!-- Output Card with 1-Click WhatsApp Template -->
      <div id="resultBox" class="result-card">
        <div style="font-size: 12px; font-weight: 700; color: #10b981; text-transform: uppercase;">
          ✓ License Generated & Saved Successfully!
        </div>

        <div class="key-box">
          <span id="displayKey">LIFE-XXXX-XXXX</span>
          <button type="button" class="copy-btn" id="copyKeyOnlyBtn">Copy Key</button>
        </div>

        <div style="margin-top: 14px;">
          <label style="color: #94a3b8;">WhatsApp Ready Reply Message:</label>
          <textarea id="replyText" rows="6" readonly style="width: 100%; box-sizing: border-box; background: #070a13; border: 1px solid #1e293b; color: #cbd5e1; font-size: 11px; padding: 10px; border-radius: 8px; resize: none; font-family: sans-serif;"></textarea>
          <button type="button" id="copyReplyBtn" class="btn" style="background: #25D366; margin-top: 8px;">
            💬 Copy Pre-Formatted WhatsApp Message
          </button>
        </div>
      </div>
    </div>

    <!-- Recent Active Licenses Table -->
    <div class="card">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <h3 style="font-size: 15px; margin: 0; color: #fff;">Active Issued Licenses</h3>
        <button type="button" id="refreshBtn" style="background: none; border: 1px solid #334155; color: #38bdf8; font-size: 11px; padding: 4px 10px; border-radius: 6px; cursor: pointer;">
          ↻ Refresh List
        </button>
      </div>

      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Customer Email</th>
              <th>Plan</th>
              <th>License Key</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody id="licensesTbody">
            <tr><td colspan="4" style="text-align:center; color:#64748b;">Loading active licenses...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <script>
    const loginGateCard = document.getElementById('loginGateCard');
    const adminDashboard = document.getElementById('adminDashboard');
    const authForm = document.getElementById('authForm');
    const authPinInput = document.getElementById('authPinInput');
    const authErrorMsg = document.getElementById('authErrorMsg');
    const authSubmitBtn = document.getElementById('authSubmitBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    const form = document.getElementById('issueForm');
    const resultBox = document.getElementById('resultBox');
    const displayKey = document.getElementById('displayKey');
    const replyText = document.getElementById('replyText');
    const copyReplyBtn = document.getElementById('copyReplyBtn');
    const copyKeyOnlyBtn = document.getElementById('copyKeyOnlyBtn');
    const refreshBtn = document.getElementById('refreshBtn');
    const licensesTbody = document.getElementById('licensesTbody');

    function getSavedKey() {
      return sessionStorage.getItem('lynkzone_admin_pin') || '';
    }

    function setSavedKey(key) {
      sessionStorage.setItem('lynkzone_admin_pin', key);
    }

    function clearSavedKey() {
      sessionStorage.removeItem('lynkzone_admin_pin');
    }

    async function verifyAndUnlock(pin) {
      authSubmitBtn.innerText = 'Verifying...';
      authSubmitBtn.disabled = true;
      authErrorMsg.style.display = 'none';

      try {
        const res = await fetch('/api/admin/verify-key', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ adminKey: pin })
        });
        const data = await res.json();

        if (res.ok && data.valid) {
          setSavedKey(pin);
          loginGateCard.style.display = 'none';
          adminDashboard.style.display = 'block';
          loadLicenses();
        } else {
          authErrorMsg.innerText = '❌ Access Denied: Invalid Master Security PIN.';
          authErrorMsg.style.display = 'block';
          clearSavedKey();
        }
      } catch (err) {
        authErrorMsg.innerText = '❌ Server connection error.';
        authErrorMsg.style.display = 'block';
      } finally {
        authSubmitBtn.innerText = '🔒 Authenticate & Unlock Portal';
        authSubmitBtn.disabled = false;
      }
    }

    authForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const pin = authPinInput.value.trim();
      if (pin) verifyAndUnlock(pin);
    });

    logoutBtn.addEventListener('click', () => {
      clearSavedKey();
      adminDashboard.style.display = 'none';
      loginGateCard.style.display = 'block';
      authPinInput.value = '';
    });

    async function loadLicenses() {
      const adminKey = getSavedKey();
      if (!adminKey) return;

      try {
        const res = await fetch('/api/admin/list-licenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ adminKey })
        });
        const data = await res.json();
        if (data.subscriptions && data.subscriptions.length > 0) {
          licensesTbody.innerHTML = data.subscriptions.map(s => \`
            <tr>
              <td>\${s.email}</td>
              <td style="text-transform: capitalize;">\${s.plan}</td>
              <td style="font-family: monospace; color: #38bdf8; font-weight: 600;">\${s.licenseKey}</td>
              <td><span class="status-badge">Active</span></td>
            </tr>
          \`).join('');
        } else {
          licensesTbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#64748b;">No licenses issued yet.</td></tr>';
        }
      } catch (err) {
        licensesTbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#ef4444;">Could not load licenses.</td></tr>';
      }
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const adminKey = getSavedKey();
      const email = document.getElementById('customerEmail').value;
      const planType = document.getElementById('planType').value;
      const submitBtn = document.getElementById('submitBtn');

      if (!adminKey) {
        alert('Session expired. Please log in again.');
        logoutBtn.click();
        return;
      }

      submitBtn.innerText = 'Issuing...';
      submitBtn.disabled = true;

      try {
        const res = await fetch('/api/admin/issue-license', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ adminKey, email, planType })
        });
        const data = await res.json();

        if (res.ok && data.success) {
          displayKey.innerText = data.licenseKey;
          const planLabel = planType === 'lifetime' ? 'Lifetime Pass (No Recurring Fees)' : 'Monthly Pro Subscription';

          const message =
\`🎉 Salam! Your payment to LynkZone has been confirmed.
Here are your official AI Job Seeker Pro license details:

🔑 License Key: \${data.licenseKey}
📧 Registered Email: \${email}
👑 Plan: \${planLabel}

How to Activate in 10 seconds:
1. Click the AI Job Seeker extension icon in your Chrome toolbar.
2. Click "Settings" (or tap "Upgrade").
3. Enter your License Key above and click "Activate".

Enjoy unlimited 1-click job autofills and AI Copilot! If you ever need help, feel free to message LynkZone directly here. 🚀\`;

          replyText.value = message;
          resultBox.style.display = 'block';
          form.reset();
          loadLicenses();
        } else {
          alert('Error: ' + (data.error || 'Failed to issue license'));
        }
      } catch (err) {
        alert('Server connection error');
      } finally {
        submitBtn.innerText = '⚡ Generate & Issue Pro License';
        submitBtn.disabled = false;
      }
    });

    copyReplyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(replyText.value);
      copyReplyBtn.innerText = '✓ Copied to Clipboard! Paste in WhatsApp';
      setTimeout(() => { copyReplyBtn.innerText = '💬 Copy Pre-Formatted WhatsApp Message'; }, 2500);
    });

    copyKeyOnlyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(displayKey.innerText);
      copyKeyOnlyBtn.innerText = 'Copied!';
      setTimeout(() => { copyKeyOnlyBtn.innerText = 'Copy Key'; }, 2000);
    });

    refreshBtn.addEventListener('click', loadLicenses);

    // Auto-login if session already has valid key
    const savedPin = getSavedKey();
    if (savedPin) {
      verifyAndUnlock(savedPin);
    }
  </script>
</body>
</html>
  `);
});

// 5E. Verify License Key or Account Email API
app.post('/api/verify-license', async (c) => {
  try {
    const { licenseKey, email } = await c.req.json();

    if (licenseKey) {
      const match = getSubscriptionByLicense(licenseKey);
      if (match) {
        return c.json({
          valid: true,
          plan: match.plan,
          isPro: match.isPro,
          email: match.email,
        });
      }
    }

    if (email) {
      const match = getSubscriptionByEmail(email);
      if (match && match.isPro) {
        return c.json({
          valid: true,
          plan: match.plan,
          isPro: match.isPro,
          email: match.email,
        });
      }
    }

    return c.json({ valid: false, error: 'Invalid license key or email address.' }, 404);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// 5F. Get Subscription Status API
app.get('/api/user/subscription-status', (c) => {
  const email = c.req.query('email');
  const license = c.req.query('license');

  if (license) {
    const record = getSubscriptionByLicense(license);
    if (record) {
      return c.json({ isPro: record.isPro, plan: record.plan, status: record.status });
    }
  }

  if (email) {
    const record = getSubscriptionByEmail(email);
    if (record) {
      return c.json({ isPro: record.isPro, plan: record.plan, status: record.status });
    }
  }

  return c.json({ isPro: false, plan: 'free', status: 'trial' });
});

// 5G. Live Stripe Webhook Listener
app.post('/api/webhooks/stripe', async (c) => {
  try {
    const body = await c.req.text();
    console.log('[Stripe Webhook] Received webhook call');

    // In production with live Stripe key:
    if (stripe && process.env.STRIPE_WEBHOOK_SECRET) {
      const sig = c.req.header('stripe-signature') || '';
      const event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        const email = session.customer_email || session.metadata?.userEmail || '';
        const plan = (session.metadata?.planType as any) || 'lifetime';
        const license = generateLicenseKey(plan);

        saveSubscription({
          email,
          isPro: true,
          plan,
          status: 'active',
          licenseKey: license,
          stripeCustomerId: session.customer as string,
          stripeSessionId: session.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }

    return c.json({ received: true });
  } catch (err: any) {
    console.error('Webhook error:', err);
    return c.json({ error: err.message }, 400);
  }
});

console.log(`AI Job Seeker Backend API running at http://localhost:${port}`);
serve({
  fetch: app.fetch,
  port,
});
