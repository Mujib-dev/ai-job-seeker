export interface UserProfile {
  personal: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    cnic?: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    linkedIn: string;
    github: string;
    portfolio: string;
    twitter?: string;
  };
  work: {
    currentTitle: string;
    currentCompany: string;
    yearsExperience: string;
    noticePeriod: string;
    salaryExpectations: string;
    workLocationPreference: string;
    willingToRelocate: string;
    desiredEmploymentType: string;
    summary: string;
  };
  authorization: {
    isAuthorizedUS: boolean;
    needsSponsorshipUS: boolean;
    legallyAuthorized: boolean;
    sponsorshipRequired: boolean;
    citizenshipStatus: string;
  };
  education: {
    school: string;
    degree: string;
    fieldOfStudy: string;
    graduationYear: string;
    gpa: string;
  };
  eeo: {
    gender: string;
    raceEthnicity: string;
    veteranStatus: string;
    disabilityStatus: string;
  };
  skills: string[];
  certifications: string[];
  customAnswers: Record<string, string>;
}

export interface JobApplication {
  id: string;
  jobTitle: string;
  company: string;
  url: string;
  appliedDate: string;
  status: 'Applied' | 'Screening' | 'Interview' | 'Offer' | 'Rejected';
  notes?: string;
}

export interface UserSubscription {
  isPro: boolean;
  dailyUsageCount: number;
  lastUsageDate: string;
  dailyLimit?: number; // Configurable free daily limit (defaults to 5)
}

export const DEFAULT_USER_PROFILE: UserProfile = {
  personal: {
    firstName: 'Mujib',
    lastName: 'Ur Rahman',
    email: 'mujiburrahman.dev@gmail.com',
    phone: '+92 348 1974606',
    cnic: '17301-1234567-1',
    address: 'LynkZone Tech Center',
    city: 'Peshawar',
    state: 'KP',
    zipCode: '25000',
    country: 'Pakistan',
    linkedIn: 'https://linkedin.com/in/mujiburrahman',
    github: 'https://github.com/mujiburrahman',
    portfolio: 'https://lynkzone.dev',
    twitter: 'https://x.com/mujiburrahman',
  },
  work: {
    currentTitle: 'Lead Software Engineer',
    currentCompany: 'LynkZone',
    yearsExperience: '5',
    noticePeriod: 'Immediate',
    salaryExpectations: 'Negotiable',
    workLocationPreference: 'Remote',
    willingToRelocate: 'Negotiable',
    desiredEmploymentType: 'Full-time',
    summary: 'Senior software engineer and founder of LynkZone specializing in full-stack web and mobile development, AI integration, and high-performance software.',
  },
  authorization: {
    isAuthorizedUS: true,
    needsSponsorshipUS: false,
    legallyAuthorized: true,
    sponsorshipRequired: false,
    citizenshipStatus: 'Citizen',
  },
  education: {
    school: 'University of California, Berkeley',
    degree: "Bachelor of Science",
    fieldOfStudy: 'Computer Science',
    graduationYear: '2020',
    gpa: '3.8',
  },
  eeo: {
    gender: 'Decline to self-identify',
    raceEthnicity: 'Decline to self-identify',
    veteranStatus: 'I am not a protected veteran',
    disabilityStatus: 'No, I do not have a disability',
  },
  skills: [
    'React', 'TypeScript', 'Node.js', 'Next.js', 'Tailwind CSS',
    'Python', 'PostgreSQL', 'Docker', 'AWS', 'RESTful APIs', 'GraphQL'
  ],
  certifications: [
    'AWS Certified Solutions Architect',
    'Professional Scrum Master (PSM I)'
  ],
  customAnswers: {
    why_us: "I have closely followed your company's rapid growth and admired your commitment to user-centric engineering excellence. My background in building responsive web applications and high-availability systems directly aligns with the technical goals of this team.",
    strengths: "My greatest strength is my ability to rapidly bridge product vision with clean, reliable architecture, translating ambiguous user requirements into high-performance software while fostering collaboration across engineering and product teams.",
    conflict: "In my previous role, our team had conflicting opinions regarding whether to adopt a microservices vs. modular monolith architecture. I organized an empirical benchmarking spike with defined latency and maintainability metrics, presenting objective data that helped our team reach a unified, confident consensus."
  },
};
