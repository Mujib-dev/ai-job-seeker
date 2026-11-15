import { AcademicQualification } from './types';

export interface ParsedDmcResult {
  qualification: AcademicQualification;
  extractedCount: number;
  extractedFields: Record<string, string>;
}

const BISE_BOARDS = [
  'Peshawar', 'Mardan', 'Swat', 'Abbottabad', 'Kohat', 'Bannu', 'Malakand', 'D.I. Khan', 'DI Khan',
  'Islamabad', 'Federal', 'Lahore', 'Rawalpindi', 'Faisalabad', 'Gujranwala', 'Multan', 'Sargodha',
  'Bahawalpur', 'Sahiwal', 'Karachi', 'Hyderabad', 'Sukkur', 'Larkana', 'Mirpurkhas', 'Quetta', 'AJK'
];

/**
 * Parses DMC (Detailed Marks Certificate) text and returns structured academic details.
 */
export function parseDmcText(rawText: string): ParsedDmcResult {
  const clean = rawText.replace(/\r\n/g, '\n').replace(/\t/g, ' ');
  const lower = clean.toLowerCase();
  const extractedFields: Record<string, string> = {};
  let count = 0;

  // 1. Detect qualification level
  let level: 'ssc' | 'hssc' | 'bachelor' = 'ssc';
  let defaultTitle = 'Matric / SSC';

  if (
    /higher\s+secondary|hssc|\bfsc\b|f\.sc|\bics\b|i\.c\.s|\bfa\b|f\.a|\bintermediate\b|12th\s*class|xii\b/i.test(lower)
  ) {
    level = 'hssc';
    defaultTitle = 'HSSC / Intermediate';
  } else if (
    /bachelor|\bbs\b|b\.s|b\.sc|\bmba\b|\bmsc\b|degree\s+certificate|transcript|semester|cgpa/i.test(lower) &&
    !/higher\s+secondary|secondary\s+school/i.test(lower)
  ) {
    level = 'bachelor';
    defaultTitle = 'Bachelor / BS';
  } else {
    level = 'ssc';
    defaultTitle = 'Matric / SSC';
  }

  // 2. Detect Board / University
  let boardOrUniversity = '';
  // Check common BISE boards
  for (const b of BISE_BOARDS) {
    const regex = new RegExp(`(?:bise|board|education)\\s*(?:of)?\\s*(?:intermediate\\s*(?:and)?\\s*secondary)?\\s*.*\\b${b}\\b|\\b${b}\\s*(?:board|bise)\\b`, 'i');
    if (regex.test(clean)) {
      boardOrUniversity = b.toLowerCase().includes('federal') || b.toLowerCase().includes('islamabad')
        ? 'FBISE Islamabad'
        : `BISE ${b}`;
      break;
    }
  }

  if (!boardOrUniversity) {
    const boardMatch = clean.match(/(?:board\s+of\s+intermediate\s+and\s+secondary\s+education|bise)\s*([a-zA-Z\s.-]+)/i);
    if (boardMatch) {
      boardOrUniversity = `BISE ${boardMatch[1].trim().split('\n')[0].trim()}`;
    }
  }

  if (!boardOrUniversity && level === 'bachelor') {
    const uniMatch = clean.match(/(?:university\s+of\s+[A-Za-z\s]+|[A-Za-z\s]+\s+university)/i);
    if (uniMatch) {
      boardOrUniversity = uniMatch[0].trim();
    }
  }

  if (boardOrUniversity) {
    extractedFields['Board / University'] = boardOrUniversity;
    count++;
  }

  // 3. Roll Number
  let rollNumber = '';
  const rollMatch = clean.match(/(?:roll\s*(?:no|number)?[.:\s]*)\s*(\d{4,8})/i);
  if (rollMatch) {
    rollNumber = rollMatch[1].trim();
    extractedFields['Roll Number'] = rollNumber;
    count++;
  }

  // 4. Passing Year / Session
  let passingYear = '';
  const sessionMatch = clean.match(/(?:annual|supply|supplementary|session|year|held\s*in)[\s:-]*([12][09]\d{2})/i);
  if (sessionMatch) {
    passingYear = sessionMatch[1].trim();
  } else {
    const yearMatch = clean.match(/\b(200\d|201\d|202\d)\b/);
    if (yearMatch) {
      passingYear = yearMatch[1].trim();
    }
  }
  if (passingYear) {
    extractedFields['Passing Year'] = passingYear;
    count++;
  }

  // 5. Total Marks & Obtained Marks
  let totalMarks = level === 'bachelor' ? '4.0' : '1100';
  let obtainedMarks = '';

  // Pattern: "Marks Obtained: 948 / 1100" or "Total Marks: 1100 ... Marks Obtained: 948"
  const slashMatch = clean.match(/(\d{3,4})\s*\/\s*(\d{3,4})/);
  if (slashMatch) {
    const n1 = parseInt(slashMatch[1], 10);
    const n2 = parseInt(slashMatch[2], 10);
    if (n1 <= n2 && n2 >= 500 && n2 <= 1200) {
      obtainedMarks = String(n1);
      totalMarks = String(n2);
    }
  }

  if (!obtainedMarks) {
    const obtainedMatch = clean.match(/(?:marks\s+obtained|obtained\s*marks|marks\s*secured|obtained)[\s:=-]*(\d{3,4})/i);
    if (obtainedMatch) {
      obtainedMarks = obtainedMatch[1].trim();
    }
  }

  const totalMatch = clean.match(/(?:total\s*marks|maximum\s*marks|max\s*marks)[\s:=-]*(\d{3,4})/i);
  if (totalMatch) {
    totalMarks = totalMatch[1].trim();
  }

  if (obtainedMarks) {
    extractedFields['Obtained Marks'] = obtainedMarks;
    extractedFields['Total Marks'] = totalMarks;
    count += 2;
  }

  // 6. Percentage
  let percentage = '';
  if (obtainedMarks && totalMarks && !isNaN(Number(obtainedMarks)) && !isNaN(Number(totalMarks))) {
    const pct = ((Number(obtainedMarks) / Number(totalMarks)) * 100).toFixed(2);
    percentage = `${pct}%`;
    extractedFields['Percentage'] = percentage;
    count++;
  } else {
    const pctMatch = clean.match(/(\d{2}(?:\.\d{1,2})?)\s*%/);
    if (pctMatch) {
      percentage = `${pctMatch[1]}%`;
      extractedFields['Percentage'] = percentage;
      count++;
    }
  }

  // 7. Grade / Division
  let gradeOrDivision = '';
  const gradeMatch = clean.match(/(?:grade|grade\s*awarded|grade\s*obtained)[\s:=-]*([A-Za-z0-9+-]{1,3})/i);
  if (gradeMatch) {
    gradeOrDivision = gradeMatch[1].toUpperCase().trim();
  } else if (percentage) {
    const num = parseFloat(percentage);
    if (num >= 80) gradeOrDivision = 'A1';
    else if (num >= 70) gradeOrDivision = 'A';
    else if (num >= 60) gradeOrDivision = 'B';
    else if (num >= 50) gradeOrDivision = 'C';
    else gradeOrDivision = 'Pass';
  }
  if (gradeOrDivision) {
    extractedFields['Grade / Division'] = gradeOrDivision;
    count++;
  }

  // 8. Major / Group
  let majorSubjects = '';
  if (/pre[\s_-]?engineering/i.test(lower)) majorSubjects = 'Pre-Engineering';
  else if (/pre[\s_-]?medical/i.test(lower)) majorSubjects = 'Pre-Medical';
  else if (/computer\s*science|\bics\b/i.test(lower)) majorSubjects = 'Computer Science';
  else if (/science/i.test(lower)) majorSubjects = 'Science';
  else if (/humanities|arts|\bfa\b/i.test(lower)) majorSubjects = 'Arts / Humanities';
  else if (/general/i.test(lower)) majorSubjects = 'General Science';

  if (majorSubjects) {
    extractedFields['Group / Major'] = majorSubjects;
    count++;
  }

  const qualification: AcademicQualification = {
    level,
    degreeTitle: defaultTitle,
    boardOrUniversity,
    passingYear,
    totalMarks,
    obtainedMarks,
    percentage,
    gradeOrDivision,
    majorSubjects,
    rollNumber,
  };

  return {
    qualification,
    extractedCount: count,
    extractedFields,
  };
}
