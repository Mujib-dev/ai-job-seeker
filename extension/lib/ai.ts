import { UserProfile } from './types';
import { API_BASE_URL } from './config';

const BACKEND_URL = API_BASE_URL;

export interface GenerateAnswerParams {
  profile: UserProfile;
  jobTitle: string;
  company: string;
  jobDescription: string;
  question: string;
  tone?: 'confident' | 'professional' | 'creative';
}

export interface GenerateCoverLetterParams {
  profile: UserProfile;
  jobTitle: string;
  company: string;
  jobDescription: string;
}

export async function generateAIAnswer(params: GenerateAnswerParams): Promise<string> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/generate-answer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (res.ok) {
      const data = await res.json();
      return data.answer;
    }
  } catch (err) {
    console.warn('Backend proxy offline, generating offline fallback:', err);
  }

  // Client-side prompt fallback if backend is offline
  return generateOfflineAnswer(params);
}

export async function generateAICoverLetter(params: GenerateCoverLetterParams): Promise<string> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/generate-cover-letter`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (res.ok) {
      const data = await res.json();
      return data.coverLetter;
    }
  } catch (err) {
    console.warn('Backend proxy offline, generating offline cover letter:', err);
  }

  return generateOfflineCoverLetter(params);
}

function generateOfflineAnswer(params: GenerateAnswerParams): string {
  const { profile, jobTitle, company, question } = params;
  const skillsList = profile.skills.slice(0, 5).join(', ');

  if (/why[\s_-]?(do[\s_-]?you[\s_-]?want[\s_-]?to[\s_-]?work|us|join)/i.test(question)) {
    return `I am highly enthusiastic about the ${jobTitle || 'role'} at ${company || 'your organization'}. Having followed your product advancements and engineering milestones, I admire your commitment to delivering high-impact, reliable solutions. With my strong foundation in ${skillsList} and ${profile.work.yearsExperience}+ years of hands-on experience, I am confident in my ability to hit the ground running and make immediate, valuable contributions to your team's objectives.`;
  }

  if (/strength|greatest[\s_-]?quality/i.test(question)) {
    return `My greatest strength is my proactive problem-solving ability combined with technical depth in ${skillsList}. In my current role as ${profile.work.currentTitle}, I take end-to-end ownership of projects, translating complex business requirements into scalable, robust architectures while collaborating closely with cross-functional stakeholders.`;
  }

  if (/challenge|conflict|difficult/i.test(question)) {
    return `When facing a challenging obstacle or differing technical viewpoints, my approach centers on data-driven decision making and open communication. I prioritize breaking down the problem into testable hypotheses, validating assumptions with empirical benchmarks, and aligning team priorities around shared business metrics and user satisfaction.`;
  }

  return `As a ${profile.work.currentTitle} with ${profile.work.yearsExperience}+ years of experience, my background in ${skillsList} directly prepares me to excel in this role at ${company || 'your team'}. I approach this challenge with rigorous attention to detail, collaborative communication, and an unwavering commitment to shipping reliable, high-quality deliverables.`;
}

function generateOfflineCoverLetter(params: GenerateCoverLetterParams): string {
  const { profile, jobTitle, company } = params;
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `${profile.personal.firstName} ${profile.personal.lastName}
${profile.personal.email} | ${profile.personal.phone}
${profile.personal.linkedIn} | ${profile.personal.city}, ${profile.personal.state}

${today}

Hiring Team
${company || 'The Hiring Organization'}

Dear Hiring Team,

I am writing to express my strong enthusiasm for the ${jobTitle || 'Open Position'} role at ${company || 'your organization'}. With over ${profile.work.yearsExperience} years of experience as a ${profile.work.currentTitle}, alongside a proven track record in ${profile.skills.slice(0, 4).join(', ')}, I am excited to bring my technical expertise and problem-solving drive to your team.

Throughout my career, I have consistently focused on delivering robust, user-centric software that drives measurable business outcomes. In my recent work, I have spearheaded the design and implementation of scalable systems, optimized performance bottlenecks, and collaborated across product and engineering disciplines to reliably meet tight milestones.

What particularly excites me about ${company || 'your organization'} is your dedication to product innovation and engineering standards. I am eager to apply my background in ${profile.skills.slice(0, 3).join(', ')} to support your continued growth, elevate user experiences, and solve critical technical challenges.

Thank you for your time and consideration. I welcome the opportunity to discuss in greater detail how my skills, background, and enthusiasm will benefit ${company || 'your team'}.

Sincerely,

${profile.personal.firstName} ${profile.personal.lastName}`;
}
