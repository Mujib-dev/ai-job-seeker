export interface CustomSectionField {
  id: string;
  label: string;
  value: string;
}

export interface DetectedField {
  id: string;
  name: string;
  label: string;
  category: 'contact' | 'links' | 'work' | 'education' | 'eeo';
  type: string;
  placeholder: string;
  currentValue?: string;
  selector?: string;
}

export interface SavedDocument {
  id: string; // 'dmc' | 'ssc_dmc' | 'hssc_dmc' | 'cnic' | 'photo' | 'resume'
  title: string;
  name: string;
  type: string;
  base64: string;
  size: number;
  uploadedAt: string;
}

export interface AcademicQualification {
  level: 'ssc' | 'hssc' | 'bachelor' | 'master' | 'other';
  degreeTitle?: string;
  boardOrUniversity?: string;
  passingYear?: string;
  totalMarks?: string;
  obtainedMarks?: string;
  percentage?: string;
  gradeOrDivision?: string;
  majorSubjects?: string;
  rollNumber?: string;
  documentFileName?: string;
  documentBase64?: string;
}

export interface UserProfile {
  personal: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    cnic?: string;
    dob?: string;
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
  qualifications?: {
    ssc?: AcademicQualification;
    hssc?: AcademicQualification;
    bachelor?: AcademicQualification;
    master?: AcademicQualification;
  };
  documents?: {
    dmc?: SavedDocument;
    sscDmc?: SavedDocument;
    hsscDmc?: SavedDocument;
    cnicDoc?: SavedDocument;
    photo?: SavedDocument;
    resume?: SavedDocument;
  };
  savedResume?: {
    name: string;
    type: string;
    base64: string;
    lastUpdated: string;
  };
  sectionCustomFields?: Record<string, CustomSectionField[]>;
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
  monthlyUsageCount: number;
  lastUsageMonth: string;
  monthlyLimit?: number; // Configurable free monthly limit (defaults to 50)
  dailyUsageCount?: number;
  lastUsageDate?: string;
  dailyLimit?: number;
}

export const DEFAULT_USER_PROFILE: UserProfile = {
  personal: {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    cnic: '',
    dob: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    linkedIn: '',
    github: '',
    portfolio: '',
    twitter: '',
  },
  work: {
    currentTitle: '',
    currentCompany: '',
    yearsExperience: '',
    noticePeriod: 'Immediate',
    salaryExpectations: '',
    workLocationPreference: 'Remote',
    willingToRelocate: 'Negotiable',
    desiredEmploymentType: 'Full-time',
    summary: '',
  },
  authorization: {
    isAuthorizedUS: true,
    needsSponsorshipUS: false,
    legallyAuthorized: true,
    sponsorshipRequired: false,
    citizenshipStatus: 'Citizen',
  },
  education: {
    school: '',
    degree: '',
    fieldOfStudy: '',
    graduationYear: '',
    gpa: '',
  },
  eeo: {
    gender: 'Decline to self-identify',
    raceEthnicity: 'Decline to self-identify',
    veteranStatus: 'I am not a protected veteran',
    disabilityStatus: 'No, I do not have a disability',
  },
  skills: [],
  certifications: [],
  qualifications: {
    ssc: {
      level: 'ssc',
      degreeTitle: 'Matric / SSC',
      boardOrUniversity: '',
      passingYear: '',
      totalMarks: '1100',
      obtainedMarks: '',
      gradeOrDivision: '',
      majorSubjects: 'Science',
      rollNumber: '',
    },
    hssc: {
      level: 'hssc',
      degreeTitle: 'FSc / HSSC',
      boardOrUniversity: '',
      passingYear: '',
      totalMarks: '1100',
      obtainedMarks: '',
      gradeOrDivision: '',
      majorSubjects: 'Pre-Engineering',
      rollNumber: '',
    },
    bachelor: {
      level: 'bachelor',
      degreeTitle: 'Bachelor / BS',
      boardOrUniversity: '',
      passingYear: '',
      totalMarks: '4.0',
      obtainedMarks: '',
      gradeOrDivision: '',
      majorSubjects: 'Computer Science',
      rollNumber: '',
    },
  },
  documents: {},
  sectionCustomFields: {},
  customAnswers: {},
};
