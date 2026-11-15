import { UserProfile } from './types';

export interface ParsedResumeResult {
  updatedProfile: UserProfile;
  extractedCount: number;
  extractedFields: Record<string, string>;
  skillsFound: string[];
}

/**
 * Extracts plain text from a File object.
 * Supports .txt, .md, .rtf, .csv, .pdf, and .docx files directly in the browser.
 */
export async function extractTextFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();

  // Plain text formats
  if (name.endsWith('.txt') || name.endsWith('.md') || name.endsWith('.rtf') || name.endsWith('.csv') || name.endsWith('.json')) {
    return await file.text();
  }

  // PDF format - client side stream parsing
  if (name.endsWith('.pdf')) {
    try {
      const buffer = await file.arrayBuffer();
      const pdfText = await extractTextFromPdfBuffer(buffer);
      if (pdfText && pdfText.trim().length > 50) {
        return pdfText;
      }
    } catch (e) {
      console.warn('PDF stream extraction fallback:', e);
    }
    // Fallback: read as raw text and extract visible printable strings
    const raw = await file.text();
    return cleanRawPdfStrings(raw);
  }

  // DOCX format - PKZip extraction of word/document.xml
  if (name.endsWith('.docx')) {
    try {
      const buffer = await file.arrayBuffer();
      const docxText = await extractTextFromDocxBuffer(buffer);
      if (docxText && docxText.trim().length > 50) {
        return docxText;
      }
    } catch (e) {
      console.warn('DOCX extraction fallback:', e);
    }
  }

  // General fallback
  return await file.text();
}

/**
 * Parses text streams inside a PDF ArrayBuffer without heavy external libraries.
 */
async function extractTextFromPdfBuffer(buffer: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(buffer);
  const textChunks: string[] = [];
  const textDecoder = new TextDecoder('latin1');
  const fullStr = textDecoder.decode(bytes);

  // Match all stream blocks: stream\r?\n ... endstream
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match: RegExpExecArray | null;

  while ((match = streamRegex.exec(fullStr)) !== null) {
    const rawStream = match[1];
    let streamText = '';

    // Check if stream looks like compressed FlateDecode (zlib header 0x78)
    const streamStartPos = match.index + match[0].indexOf(rawStream);
    const streamBytes = bytes.subarray(streamStartPos, streamStartPos + rawStream.length);

    if (streamBytes.length > 2 && streamBytes[0] === 0x78) {
      try {
        if (typeof DecompressionStream !== 'undefined') {
          const ds = new DecompressionStream('deflate');
          const writer = ds.writable.getWriter();
          writer.write(streamBytes);
          writer.close();
          const decompressedBuffer = await new Response(ds.readable).arrayBuffer();
          streamText = new TextDecoder('utf-8').decode(decompressedBuffer);
        }
      } catch {
        // Fallback to raw string if decompression fails
        streamText = rawStream;
      }
    } else {
      streamText = rawStream;
    }

    if (streamText) {
      // Extract literal text inside parentheses in PDF text operators: (Text) Tj, [(Text1) (Text2)] TJ
      const literalMatches = streamText.match(/\(([^()]*)\)\s*T[jJ]/g);
      if (literalMatches) {
        for (const m of literalMatches) {
          const content = m.replace(/^\(/, '').replace(/\)\s*T[jJ]$/, '');
          if (content.length > 1) {
            textChunks.push(unescapePdfString(content));
          }
        }
      }

      // Extract array strings: [(T1) 20 (T2)] TJ
      const arrayMatches = streamText.match(/\[(.*?)\]\s*TJ/g);
      if (arrayMatches) {
        for (const m of arrayMatches) {
          const inParens = m.match(/\(([^()]*)\)/g);
          if (inParens) {
            const joined = inParens.map((p) => p.slice(1, -1)).join('');
            if (joined.length > 1) {
              textChunks.push(unescapePdfString(joined));
            }
          }
        }
      }
    }
  }

  if (textChunks.length > 0) {
    return textChunks.join(' ');
  }

  return cleanRawPdfStrings(fullStr);
}

function unescapePdfString(str: string): string {
  return str
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\');
}

function cleanRawPdfStrings(raw: string): string {
  // Extract visible ASCII words of 3+ letters
  const matches = raw.match(/[A-Za-z0-9@._:\-+/#\s]{4,}/g) || [];
  return matches
    .filter((chunk) => !chunk.includes('obj') && !chunk.includes('endobj') && !chunk.includes('Filter') && !chunk.includes('xref'))
    .join(' ');
}

/**
 * Extracts text from a .docx ArrayBuffer by extracting word/document.xml.
 */
async function extractTextFromDocxBuffer(buffer: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(buffer);
  const textDecoder = new TextDecoder('latin1');
  const fullStr = textDecoder.decode(bytes);

  // Search for word/document.xml entry in ZIP
  const docXmlIndex = fullStr.indexOf('word/document.xml');
  if (docXmlIndex === -1) return '';

  // Look for text elements <w:t>...</w:t> if uncompressed or partially visible
  const xmlTextMatches = fullStr.match(/<w:t[^>]*>(.*?)<\/w:t>/g);
  if (xmlTextMatches && xmlTextMatches.length > 0) {
    return xmlTextMatches.map((m) => m.replace(/<[^>]+>/g, '')).join(' ');
  }

  // Decompress stream if possible
  return cleanRawPdfStrings(fullStr);
}

/**
 * Comprehensive dictionary of tech and professional skills
 */
const SKILL_KEYWORDS = [
  'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', '.NET', 'Go', 'Golang', 'Rust', 'PHP', 'Ruby', 'Swift', 'Kotlin', 'Dart',
  'React', 'React.js', 'React Native', 'Next.js', 'Vue', 'Vue.js', 'Nuxt', 'Angular', 'Svelte',
  'Node.js', 'Express', 'Express.js', 'NestJS', 'Django', 'Flask', 'FastAPI', 'Spring Boot', 'Laravel', 'Ruby on Rails', 'ASP.NET',
  'HTML', 'HTML5', 'CSS', 'CSS3', 'Tailwind CSS', 'Tailwind', 'Bootstrap', 'Sass', 'SCSS', 'Material UI', 'Chakra UI',
  'SQL', 'MySQL', 'PostgreSQL', 'Postgres', 'MongoDB', 'Redis', 'SQLite', 'DynamoDB', 'Supabase', 'Firebase', 'GraphQL', 'REST API',
  'Docker', 'Kubernetes', 'AWS', 'Amazon Web Services', 'Azure', 'GCP', 'Google Cloud', 'Linux', 'Ubuntu', 'Git', 'GitHub', 'GitLab', 'CI/CD', 'Terraform',
  'Microservices', 'System Design', 'Agile', 'Scrum', 'Jira', 'Figma', 'Adobe XD', 'UI/UX',
  'Machine Learning', 'Deep Learning', 'Artificial Intelligence', 'AI', 'NLP', 'Computer Vision', 'Pandas', 'NumPy', 'TensorFlow', 'PyTorch', 'Scikit-learn', 'LLM', 'LangChain',
  'Unit Testing', 'Jest', 'Cypress', 'Playwright', 'Selenium', 'Selenium WebDriver', 'Webpack', 'Vite'
];

/**
 * Common job titles for intelligent title matching
 */
const COMMON_TITLES = [
  'Senior Software Engineer', 'Software Engineer', 'Full Stack Developer', 'Frontend Developer', 'Backend Developer',
  'Lead Software Engineer', 'Staff Software Engineer', 'Principal Engineer', 'DevOps Engineer', 'Cloud Architect',
  'Data Scientist', 'Data Analyst', 'Machine Learning Engineer', 'AI Engineer', 'Product Manager', 'Project Manager',
  'UI/UX Designer', 'Product Designer', 'Mobile Developer', 'iOS Developer', 'Android Developer',
  'QA Engineer', 'Automation Engineer', 'Systems Engineer', 'Solutions Architect', 'Cybersecurity Analyst',
  'Technical Lead', 'Engineering Manager', 'Scrum Master', 'Business Analyst', 'Database Administrator'
];

/**
 * Parses CV / Resume text and extracts key candidate information:
 * Name, Email, Phone, LinkedIn, GitHub, Portfolio, Job Title, Company,
 * Education (School, Degree, Field of Study, Year), and Skills.
 */
export function parseResumeText(rawText: string, currentProfile: UserProfile): ParsedResumeResult {
  const updated: UserProfile = JSON.parse(JSON.stringify(currentProfile));
  const extractedFields: Record<string, string> = {};
  let count = 0;

  if (!rawText || rawText.trim().length === 0) {
    return { updatedProfile: updated, extractedCount: 0, extractedFields, skillsFound: [] };
  }

  const cleanText = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = cleanText.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);

  // 1. Extract Email
  const emailRegex = /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/i;
  const emailMatch = cleanText.match(emailRegex);
  if (emailMatch) {
    const email = emailMatch[0].toLowerCase();
    updated.personal.email = email;
    extractedFields['Email'] = email;
    count++;
  }

  // 2. Extract Phone Number
  const phoneRegex = /(?:(?:\+|00)\d{1,3}[\s.-]?)?(?:\(?\d{2,5}\)?[\s.-]?)?\d{3,4}[\s.-]?\d{3,5}/;
  const phoneMatch = cleanText.match(phoneRegex);
  if (phoneMatch && phoneMatch[0].replace(/\D/g, '').length >= 8) {
    const phone = phoneMatch[0].trim();
    updated.personal.phone = phone;
    extractedFields['Phone'] = phone;
    count++;
  }

  // 2b. Extract CNIC / National ID
  const cnicRegex = /\b(\d{5}[-\s]?\d{7}[-\s]?\d{1})\b/;
  const cnicMatch = cleanText.match(cnicRegex);
  if (cnicMatch) {
    const cnic = cnicMatch[1].replace(/\s+/g, '-');
    updated.personal.cnic = cnic;
    extractedFields['CNIC / ID'] = cnic;
    count++;
  }

  // 2c. Extract Date of Birth (DOB)
  const dobRegex = /(?:dob|date\s+of\s+birth|birth\s*date|born):\s*([0-9a-zA-Z\s,/-]{6,25})/i;
  const dobMatch = cleanText.match(dobRegex);
  if (dobMatch) {
    const rawDob = dobMatch[1].trim();
    updated.personal.dob = rawDob;
    extractedFields['Date of Birth'] = rawDob;
    count++;
  }

  // 3. Extract Links: LinkedIn, GitHub, Portfolio
  const linkedinRegex = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9_-]+)/i;
  const linkedinMatch = cleanText.match(linkedinRegex);
  if (linkedinMatch) {
    const linkedin = linkedinMatch[0].startsWith('http') ? linkedinMatch[0] : `https://${linkedinMatch[0]}`;
    updated.personal.linkedIn = linkedin;
    extractedFields['LinkedIn'] = linkedin;
    count++;
  }

  const githubRegex = /(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_-]+)/i;
  const githubMatch = cleanText.match(githubRegex);
  if (githubMatch) {
    const github = githubMatch[0].startsWith('http') ? githubMatch[0] : `https://${githubMatch[0]}`;
    updated.personal.github = github;
    extractedFields['GitHub'] = github;
    count++;
  }

  const portfolioRegex = /https?:\/\/(?!.*(?:linkedin|github|twitter|x\.com|facebook|instagram))[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?/i;
  const portfolioMatch = cleanText.match(portfolioRegex);
  if (portfolioMatch) {
    const port = portfolioMatch[0].trim();
    updated.personal.portfolio = port;
    extractedFields['Portfolio'] = port;
    count++;
  }

  // 4. Extract Candidate Full Name
  // Typically appears in the top 5 non-empty lines, before email/phone
  for (let i = 0; i < Math.min(lines.length, 6); i++) {
    const line = lines[i];
    // Skip headers, emails, phones, URLs
    if (
      emailRegex.test(line) ||
      phoneRegex.test(line) ||
      /resume|curriculum|vitae|page|contact|profile|summary|experience|objective|developer|engineer/i.test(line)
    ) {
      continue;
    }

    const words = line.split(/\s+/).filter((w) => /^[A-Z][a-zA-Z'-]+$/.test(w));
    if (words.length >= 2 && words.length <= 4) {
      const firstName = words[0];
      const lastName = words.slice(1).join(' ');
      updated.personal.firstName = firstName;
      updated.personal.lastName = lastName;
      extractedFields['Full Name'] = `${firstName} ${lastName}`;
      count += 2;
      break;
    }
  }

  // 5. Extract Job Title
  for (const title of COMMON_TITLES) {
    const regex = new RegExp(`\\b${title.replace(/\s+/g, '\\s+')}\\b`, 'i');
    if (regex.test(cleanText)) {
      updated.work.currentTitle = title;
      extractedFields['Job Title'] = title;
      count++;
      break;
    }
  }

  // 6. Extract Company Name (e.g. "at Google", "Company: ABC", or line after Title)
  const companyRegex = /(?:at|@|company:\s*|employer:\s*)([A-Z][a-zA-Z0-9&.\s]{2,25})/i;
  const companyMatch = cleanText.match(companyRegex);
  if (companyMatch) {
    const company = companyMatch[1].trim();
    if (!/present|current|experience|education|skills/i.test(company)) {
      updated.work.currentCompany = company;
      extractedFields['Company'] = company;
      count++;
    }
  }

  // 7. Extract Years of Experience
  const expRegex = /(\d+)\+?\s*(?:years|yrs)(?:\s*of)?\s*experience/i;
  const expMatch = cleanText.match(expRegex);
  if (expMatch) {
    const years = expMatch[1];
    updated.work.yearsExperience = years;
    extractedFields['Years Experience'] = years;
    count++;
  }

  // 8. Extract Education: University, Degree, Field of Study, Graduation Year
  const eduKeywords = ['University', 'College', 'Institute', 'Academy', 'Polytechnic'];
  for (const line of lines) {
    if (eduKeywords.some((k) => line.includes(k))) {
      const cleanSchool = line.replace(/^(education|degree|institution):\s*/i, '').trim();
      if (cleanSchool.length < 80) {
        updated.education.school = cleanSchool;
        extractedFields['University'] = cleanSchool;
        count++;
        break;
      }
    }
  }

  // Degree
  const degreeRegex = /\b(Bachelor(?:'s)?(?:\s+of\s+[A-Za-z]+)?|Master(?:'s)?(?:\s+of\s+[A-Za-z]+)?|PhD|Doctorate|B\.S\.|M\.S\.|B\.Sc|M\.Sc|B\.Tech|M\.Tech|Associate(?:\s+Degree)?)\b/i;
  const degreeMatch = cleanText.match(degreeRegex);
  if (degreeMatch) {
    const degree = degreeMatch[0].trim();
    updated.education.degree = degree;
    extractedFields['Degree'] = degree;
    count++;
  }

  // Major / Field of Study
  const majorRegex = /\b(Computer Science|Software Engineering|Information Technology|Electrical Engineering|Data Science|Computer Engineering|Artificial Intelligence|Business Administration|Graphic Design)\b/i;
  const majorMatch = cleanText.match(majorRegex);
  if (majorMatch) {
    const major = majorMatch[0].trim();
    updated.education.fieldOfStudy = major;
    extractedFields['Major'] = major;
    count++;
  }

  // Graduation Year (e.g. 2018 - 2024)
  const yearRegex = /\b(201\d|202\d)\b/g;
  const yearMatches = cleanText.match(yearRegex);
  if (yearMatches && yearMatches.length > 0) {
    const latestYear = yearMatches[yearMatches.length - 1];
    updated.education.graduationYear = latestYear;
    extractedFields['Graduation Year'] = latestYear;
    count++;
  }

  // 9. Extract Skills (from our dictionary of 80+ skills)
  const skillsFound: string[] = [];
  const lowerText = cleanText.toLowerCase();

  for (const skill of SKILL_KEYWORDS) {
    const escaped = skill.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    const skillRegex = new RegExp(`(?:^|[\\s,;()•|/])${escaped}(?:$|[\\s,;()•|/])`, 'i');
    if (skillRegex.test(lowerText) || skillRegex.test(cleanText)) {
      skillsFound.push(skill);
    }
  }

  if (skillsFound.length > 0) {
    const merged = Array.from(new Set([...(updated.skills || []), ...skillsFound]));
    updated.skills = merged;
    extractedFields['Skills'] = `${skillsFound.length} skills found (${skillsFound.slice(0, 5).join(', ')}...)`;
    count += skillsFound.length;
  }

  // 10. Extract Summary / Profile paragraph if available
  const summaryHeaderRegex = /(?:Professional\s+Summary|Executive\s+Summary|Summary|About\s+Me|Profile)\s*\n+([\s\S]{50,400}?)(?:\n\s*\n|\bExperience\b|\bEducation\b|\bSkills\b)/i;
  const summaryMatch = cleanText.match(summaryHeaderRegex);
  if (summaryMatch) {
    const summary = summaryMatch[1].replace(/\n+/g, ' ').trim();
    if (summary.length > 30) {
      updated.work.summary = summary;
      extractedFields['Summary'] = summary.slice(0, 60) + '...';
      count++;
    }
  }

  return {
    updatedProfile: updated,
    extractedCount: count,
    extractedFields,
    skillsFound,
  };
}
