import { UserProfile, CustomSectionField } from './types';
import { categorizeField } from './autofill';

/**
 * Escapes a field value for RFC 4180 compliant CSV output.
 * Wraps values with commas, quotes, or newlines in double quotes, escaping existing quotes.
 */
function escapeCsv(value: string | number | boolean | undefined | null): string {
  if (value === undefined || value === null) return '""';
  const str = String(value);
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Exports the entire UserProfile into an Excel-friendly CSV format
 * with UTF-8 BOM (\uFEFF) so Microsoft Excel opens it seamlessly
 * with clean columns, correct accents, and no encoding artifacts.
 */
export function generateProfileExcelCsv(profile: UserProfile): string {
  const BOM = '\uFEFF';
  const header = ['Category', 'Field Name', 'Field Key', 'Your Value', 'Notes / Instructions'].map(escapeCsv).join(',');

  const rows: string[][] = [
    // --- Contact Information ---
    ['Contact', 'First Name', 'firstName', profile.personal.firstName || '', 'Your first name (e.g. John)'],
    ['Contact', 'Last Name', 'lastName', profile.personal.lastName || '', 'Your last name (e.g. Doe)'],
    ['Contact', 'Email Address', 'email', profile.personal.email || '', 'Professional contact email'],
    ['Contact', 'Phone Number', 'phone', profile.personal.phone || '', 'Mobile / WhatsApp phone number'],
    ['Contact', 'CNIC / National ID', 'cnic', profile.personal.cnic || '', 'National ID / CNIC / Passport number'],
    ['Contact', 'Date of Birth (YYYY-MM-DD)', 'dob', profile.personal.dob || '', 'e.g. 1998-05-24 or 24/05/1998'],
    ['Contact', 'Street Address', 'address', profile.personal.address || '', 'House / Street address'],
    ['Contact', 'City', 'city', profile.personal.city || '', 'Current city'],
    ['Contact', 'State / Province', 'state', profile.personal.state || '', 'State / Province / Region'],
    ['Contact', 'ZIP / Postal Code', 'zipCode', profile.personal.zipCode || '', 'Postal or ZIP code'],
    ['Contact', 'Country', 'country', profile.personal.country || '', 'Current country of residence'],

    // --- Links & Socials ---
    ['Links', 'LinkedIn Profile URL', 'linkedIn', profile.personal.linkedIn || '', 'e.g. https://linkedin.com/in/username'],
    ['Links', 'GitHub Profile URL', 'github', profile.personal.github || '', 'e.g. https://github.com/username'],
    ['Links', 'Portfolio / Website', 'portfolio', profile.personal.portfolio || '', 'Personal website or portfolio'],
    ['Links', 'Twitter / X Profile', 'twitter', profile.personal.twitter || '', 'e.g. https://x.com/username'],

    // --- Work Experience ---
    ['Work', 'Current / Recent Job Title', 'currentTitle', profile.work.currentTitle || '', 'e.g. Senior Software Engineer'],
    ['Work', 'Current Employer / Company', 'currentCompany', profile.work.currentCompany || '', 'Current or most recent company'],
    ['Work', 'Years of Experience', 'yearsExperience', profile.work.yearsExperience || '', 'Total years of relevant experience (e.g. 5)'],
    ['Work', 'Notice Period', 'noticePeriod', profile.work.noticePeriod || 'Immediate', 'e.g. Immediate, 2 weeks, 1 month'],
    ['Work', 'Expected / Current Salary', 'salaryExpectations', profile.work.salaryExpectations || '', 'e.g. $120,000 / $10k monthly'],
    ['Work', 'Work Location Preference', 'workLocationPreference', profile.work.workLocationPreference || 'Remote', 'Remote, Hybrid, or On-site'],
    ['Work', 'Desired Employment Type', 'desiredEmploymentType', profile.work.desiredEmploymentType || 'Full-time', 'Full-time, Part-time, or Contract'],
    ['Work', 'Willing to Relocate', 'willingToRelocate', profile.work.willingToRelocate || 'Negotiable', 'Yes, No, or Negotiable'],
    ['Work', 'Professional Summary', 'summary', profile.work.summary || '', 'Brief 2-3 sentence overview of your career'],

    // --- Education ---
    ['Education', 'School / University', 'school', profile.education.school || '', 'Highest institution attended'],
    ['Education', 'Degree / Level', 'degree', profile.education.degree || '', 'e.g. Bachelor of Science, Master of Science'],
    ['Education', 'Field of Study / Major', 'fieldOfStudy', profile.education.fieldOfStudy || '', 'e.g. Computer Science, Software Engineering'],
    ['Education', 'Graduation Year', 'graduationYear', profile.education.graduationYear || '', 'Year of graduation (e.g. 2023)'],
    ['Education', 'GPA / Grade', 'gpa', profile.education.gpa || '', 'e.g. 3.8 / 4.0 or First Class'],

    // --- Work Authorization ---
    ['Work', 'Legally Authorized to Work', 'legallyAuthorized', profile.authorization.legallyAuthorized ? 'Yes' : 'No', 'Yes or No'],
    ['Work', 'Requires Visa Sponsorship', 'sponsorshipRequired', profile.authorization.sponsorshipRequired ? 'Yes' : 'No', 'Yes or No'],
    ['Work', 'Citizenship Status', 'citizenshipStatus', profile.authorization.citizenshipStatus || 'Citizen', 'Citizen, Permanent Resident, etc.'],

    // --- Equal Employment Opportunity (EEO) ---
    ['EEO', 'Gender', 'gender', profile.eeo.gender || 'Decline to self-identify', 'Male, Female, Non-Binary, or Decline to self-identify'],
    ['EEO', 'Race / Ethnicity', 'raceEthnicity', profile.eeo.raceEthnicity || 'Decline to self-identify', 'Your race/ethnicity or Decline to self-identify'],
    ['EEO', 'Veteran Status', 'veteranStatus', profile.eeo.veteranStatus || 'I am not a protected veteran', 'Protected veteran status'],
    ['EEO', 'Disability Status', 'disabilityStatus', profile.eeo.disabilityStatus || 'No, I do not have a disability', 'Disability status'],

    // --- Skills & Certifications ---
    ['Work', 'Skills (comma-separated)', 'skills', (profile.skills || []).join(', '), 'e.g. React, TypeScript, Node.js, Python, AWS'],
    ['Education', 'Certifications (comma-separated)', 'certifications', (profile.certifications || []).join(', '), 'e.g. AWS Certified Developer, PMP'],
  ];

  // Append existing section custom fields
  if (profile.sectionCustomFields) {
    for (const [section, fields] of Object.entries(profile.sectionCustomFields)) {
      if (!Array.isArray(fields)) continue;
      const displaySection = section.charAt(0).toUpperCase() + section.slice(1);
      for (const f of fields) {
        if (!f.label) continue;
        const key = f.label.toLowerCase().replace(/[^a-z0-9]+/g, '_');
        rows.push([displaySection, f.label, key, f.value || '', 'Custom field in ' + displaySection]);
      }
    }
  }

  // Append existing custom answers not already included
  if (profile.customAnswers) {
    const existingKeys = new Set(rows.map((r) => r[2].toLowerCase()));
    for (const [key, val] of Object.entries(profile.customAnswers)) {
      if (!existingKeys.has(key.toLowerCase()) && val) {
        const readable = key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        const cat = categorizeField(readable);
        const catName = cat.charAt(0).toUpperCase() + cat.slice(1);
        rows.push([catName, readable, key, val, 'Saved custom answer']);
      }
    }
  }

  // Append blank custom placeholder rows for user to add anything in Excel
  rows.push(['Contact', 'Father Name', 'father_name', '', 'Example: Type your father name']);
  rows.push(['Contact', 'Master Security PIN / Key', 'master_security_pin', '', 'Example: Security PIN / Key']);
  rows.push(['Work', 'Portfolio Project 1', 'project_1', '', 'Example: Any extra custom field']);

  const csvContent = BOM + header + '\r\n' + rows.map((row) => row.map(escapeCsv).join(',')).join('\r\n');
  return csvContent;
}

/**
 * Initiates browser download of the user profile CSV file for Microsoft Excel.
 */
export function downloadProfileExcel(profile: UserProfile, filename = 'LynkZone_Job_Seeker_Profile.csv'): void {
  const csv = generateProfileExcelCsv(profile);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Robust RFC 4180 CSV parser that properly parses quoted strings, commas,
 * escaped quotes (""), and multiline content.
 */
export function parseCsvRows(csvText: string): string[][] {
  const clean = csvText.replace(/^\uFEFF/, ''); // strip BOM if present
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    const nextChar = clean[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        // Escaped quote: "" -> "
        currentField += '"';
        i++; // skip next quote
      } else {
        // Toggle quote state
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      // End of field
      currentRow.push(currentField.trim());
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      // End of line
      if (char === '\r' && nextChar === '\n') i++; // handle CRLF
      currentRow.push(currentField.trim());
      if (currentRow.some((f) => f.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  // Add leftover field and row
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((f) => f.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Parses an exported/filled Excel CSV file, maps all fields into their
 * respective profile categories (contact, work, education, links, eeo, custom),
 * and returns the updated UserProfile and count of imported fields.
 */
export function parseExcelProfile(
  csvText: string,
  currentProfile: UserProfile
): { updatedProfile: UserProfile; count: number; messages: string[] } {
  const rows = parseCsvRows(csvText);
  if (rows.length < 2) {
    throw new Error('CSV file appears empty or missing header rows.');
  }

  // Detect header columns
  const header = rows[0].map((h) => h.toLowerCase().trim());
  let catIdx = header.findIndex((h) => h.includes('category') || h.includes('section'));
  let nameIdx = header.findIndex((h) => h.includes('field name') || h.includes('name') || h.includes('label'));
  let keyIdx = header.findIndex((h) => h.includes('field key') || h.includes('key'));
  let valIdx = header.findIndex((h) => h.includes('value') || h.includes('your value') || h.includes('answer'));

  // Fallbacks if header doesn't match exactly
  if (valIdx === -1) valIdx = 3;
  if (keyIdx === -1) keyIdx = 2;
  if (nameIdx === -1) nameIdx = 1;
  if (catIdx === -1) catIdx = 0;

  const updated: UserProfile = JSON.parse(JSON.stringify(currentProfile));
  let count = 0;
  const messages: string[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const categoryRaw = (row[catIdx] || '').trim();
    const fieldName = (row[nameIdx] || '').trim();
    const fieldKey = (row[keyIdx] || '').trim().toLowerCase();
    const val = (row[valIdx] || '').trim();

    // Skip empty values or template instructions
    if (!val || val.toLowerCase().startsWith('example:') || val.toLowerCase().startsWith('type your')) {
      continue;
    }

    const normKey = fieldKey.replace(/[^a-z0-9]/g, '');
    const normName = fieldName.toLowerCase().replace(/[^a-z0-9]/g, '');

    // 1. Personal / Contact
    if (normKey === 'firstname' || normName.includes('firstname')) {
      updated.personal.firstName = val;
      count++;
    } else if (normKey === 'lastname' || normName.includes('lastname')) {
      updated.personal.lastName = val;
      count++;
    } else if (normKey === 'email' || normName.includes('email')) {
      updated.personal.email = val;
      count++;
    } else if (normKey === 'phone' || normName.includes('phone') || normName.includes('mobile')) {
      updated.personal.phone = val;
      count++;
    } else if (normKey === 'cnic' || normName.includes('cnic') || normName.includes('nationalid')) {
      updated.personal.cnic = val;
      count++;
    } else if (normKey === 'dob' || normName.includes('dateofbirth') || normName.includes('birthdate') || normName === 'dob') {
      updated.personal.dob = val;
      count++;
    } else if (normKey === 'address' || normName.includes('address')) {
      updated.personal.address = val;
      count++;
    } else if (normKey === 'city' || normName.includes('city')) {
      updated.personal.city = val;
      count++;
    } else if (normKey === 'state' || normName.includes('state') || normName.includes('province')) {
      updated.personal.state = val;
      count++;
    } else if (normKey === 'zipcode' || normKey === 'postalcode' || normName.includes('zip') || normName.includes('postal')) {
      updated.personal.zipCode = val;
      count++;
    } else if (normKey === 'country' || normName.includes('country')) {
      updated.personal.country = val;
      count++;
    }
    // 2. Links
    else if (normKey === 'linkedin' || normName.includes('linkedin')) {
      updated.personal.linkedIn = val;
      count++;
    } else if (normKey === 'github' || normName.includes('github')) {
      updated.personal.github = val;
      count++;
    } else if (normKey === 'portfolio' || normKey === 'website' || normName.includes('portfolio') || normName.includes('website')) {
      updated.personal.portfolio = val;
      count++;
    } else if (normKey === 'twitter' || normKey === 'x' || normName.includes('twitter')) {
      updated.personal.twitter = val;
      count++;
    }
    // 3. Work Experience
    else if (normKey === 'currenttitle' || normKey === 'jobtitle' || normName.includes('jobtitle') || normName.includes('currenttitle')) {
      updated.work.currentTitle = val;
      count++;
    } else if (normKey === 'currentcompany' || normKey === 'company' || normKey === 'employer' || normName.includes('company') || normName.includes('employer')) {
      updated.work.currentCompany = val;
      count++;
    } else if (normKey === 'yearsexperience' || normKey === 'experience' || normName.includes('yearsofexperience') || normName.includes('experience')) {
      updated.work.yearsExperience = val;
      count++;
    } else if (normKey === 'noticeperiod' || normName.includes('noticeperiod')) {
      updated.work.noticePeriod = val;
      count++;
    } else if (normKey === 'salaryexpectations' || normKey === 'salary' || normName.includes('salary')) {
      updated.work.salaryExpectations = val;
      count++;
    } else if (normKey === 'worklocationpreference' || normName.includes('locationpreference')) {
      updated.work.workLocationPreference = val;
      count++;
    } else if (normKey === 'desiredemploymenttype' || normName.includes('employmenttype')) {
      updated.work.desiredEmploymentType = val;
      count++;
    } else if (normKey === 'willingtorelocate' || normName.includes('relocate')) {
      updated.work.willingToRelocate = val;
      count++;
    } else if (normKey === 'summary' || normName.includes('summary')) {
      updated.work.summary = val;
      count++;
    }
    // 4. Education
    else if (normKey === 'school' || normKey === 'university' || normKey === 'college' || normName.includes('university') || normName.includes('school')) {
      updated.education.school = val;
      count++;
    } else if (normKey === 'degree' || normName.includes('degree')) {
      updated.education.degree = val;
      count++;
    } else if (normKey === 'fieldofstudy' || normKey === 'major' || normName.includes('fieldofstudy') || normName.includes('major')) {
      updated.education.fieldOfStudy = val;
      count++;
    } else if (normKey === 'graduationyear' || normName.includes('graduationyear')) {
      updated.education.graduationYear = val;
      count++;
    } else if (normKey === 'gpa' || normName.includes('gpa') || normName.includes('grade')) {
      updated.education.gpa = val;
      count++;
    }
    // 5. Work Authorization
    else if (normKey === 'legallyauthorized' || normName.includes('legallyauthorized')) {
      updated.authorization.legallyAuthorized = /yes|true|1/i.test(val);
      count++;
    } else if (normKey === 'sponsorshiprequired' || normName.includes('sponsorship')) {
      updated.authorization.sponsorshipRequired = /yes|true|1/i.test(val);
      count++;
    } else if (normKey === 'citizenshipstatus' || normName.includes('citizenship')) {
      updated.authorization.citizenshipStatus = val;
      count++;
    }
    // 6. EEO
    else if (normKey === 'gender' || normName.includes('gender')) {
      updated.eeo.gender = val;
      count++;
    } else if (normKey === 'raceethnicity' || normKey === 'race' || normName.includes('race') || normName.includes('ethnicity')) {
      updated.eeo.raceEthnicity = val;
      count++;
    } else if (normKey === 'veteranstatus' || normName.includes('veteran')) {
      updated.eeo.veteranStatus = val;
      count++;
    } else if (normKey === 'disabilitystatus' || normName.includes('disability')) {
      updated.eeo.disabilityStatus = val;
      count++;
    }
    // 7. Skills & Certifications
    else if (normKey === 'skills' || normName.includes('skills')) {
      const parsedSkills = val.split(/[,;\n]/).map((s) => s.trim()).filter((s) => s.length > 0);
      if (parsedSkills.length > 0) {
        const unique = Array.from(new Set([...(updated.skills || []), ...parsedSkills]));
        updated.skills = unique;
        count++;
      }
    } else if (normKey === 'certifications' || normName.includes('certifications')) {
      const parsedCerts = val.split(/[,;\n]/).map((s) => s.trim()).filter((s) => s.length > 0);
      if (parsedCerts.length > 0) {
        const unique = Array.from(new Set([...(updated.certifications || []), ...parsedCerts]));
        updated.certifications = unique;
        count++;
      }
    }
    // 8. Custom Field -> Auto-arranged into specific section!
    else {
      const label = fieldName || fieldKey || 'Custom Field';
      let targetSection = 'contact';
      const catLower = categoryRaw.toLowerCase();

      if (catLower.includes('work') || catLower.includes('job') || catLower.includes('career')) {
        targetSection = 'work';
      } else if (catLower.includes('edu') || catLower.includes('school') || catLower.includes('academ')) {
        targetSection = 'education';
      } else if (catLower.includes('link') || catLower.includes('social') || catLower.includes('web')) {
        targetSection = 'links';
      } else if (catLower.includes('eeo') || catLower.includes('demo') || catLower.includes('diversity') || catLower.includes('equal') || catLower.includes('opportunity')) {
        targetSection = 'eeo';
      } else {
        targetSection = categorizeField(label);
      }

      if (!updated.sectionCustomFields) updated.sectionCustomFields = {};
      if (!updated.sectionCustomFields[targetSection]) updated.sectionCustomFields[targetSection] = [];

      // Avoid duplicate labels in the same section
      const existingIdx = updated.sectionCustomFields[targetSection].findIndex(
        (f) => f.label.toLowerCase() === label.toLowerCase()
      );
      if (existingIdx >= 0) {
        updated.sectionCustomFields[targetSection][existingIdx].value = val;
      } else {
        const id = `f_excel_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
        updated.sectionCustomFields[targetSection].push({ id, label, value: val });
      }

      // Also record in customAnswers
      const cleanKey = (fieldKey || label).toLowerCase().replace(/[^a-z0-9]+/g, '_');
      if (!updated.customAnswers) updated.customAnswers = {};
      updated.customAnswers[cleanKey] = val;

      count++;
    }
  }

  return { updatedProfile: updated, count, messages };
}
