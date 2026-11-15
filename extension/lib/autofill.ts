import { UserProfile, DetectedField } from './types';

export interface AutofillResult {
  totalFieldsFound: number;
  filledFieldsCount: number;
  unfilledFields: DetectedField[];
}

// Dispatches standard DOM events so modern frameworks (React, Angular, Vue, Svelte, Workday) register value changes
export function setNativeValue(
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  value: string | undefined | null
): boolean {
  if (!value || typeof value !== 'string' || !value.trim()) {
    return false;
  }

  const trimmed = value.trim();

  try {
    element.focus();
  } catch {}

  // Handle <select> dropdowns
  if (element.tagName.toLowerCase() === 'select') {
    const select = element as HTMLSelectElement;
    const lower = trimmed.toLowerCase();
    let found = false;

    // 1. Exact match on value or text
    for (let i = 0; i < select.options.length; i++) {
      const opt = select.options[i];
      if (opt.value.toLowerCase() === lower || opt.text.toLowerCase() === lower) {
        select.selectedIndex = i;
        found = true;
        break;
      }
    }

    // 2. Substring match on text
    if (!found) {
      for (let i = 0; i < select.options.length; i++) {
        const opt = select.options[i];
        if (opt.text.toLowerCase().includes(lower) || lower.includes(opt.text.toLowerCase())) {
          select.selectedIndex = i;
          found = true;
          break;
        }
      }
    }

    select.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    select.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    try {
      select.blur();
    } catch {}
    return found;
  }

  // 1. Reset React 16+ internal value tracker so React tracks the programmatic update
  const tracker = (element as any)._valueTracker;
  if (tracker) {
    tracker.setValue('');
  }

  // 2. Use prototype descriptor setter to bypass framework intercepts
  const valueSetter = Object.getOwnPropertyDescriptor(element, 'value')?.set;
  const prototype = Object.getPrototypeOf(element);
  const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;

  if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
    prototypeValueSetter.call(element, trimmed);
  } else if (valueSetter) {
    valueSetter.call(element, trimmed);
  } else {
    element.value = trimmed;
  }

  // 3. Dispatch standard bubbling & composed input/change events
  element.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  element.dispatchEvent(new Event('change', { bubbles: true, composed: true }));

  // Support Flatpickr calendar instances
  if ((element as any)._flatpickr) {
    try {
      (element as any)._flatpickr.setDate(trimmed, true);
    } catch {}
  }

  try {
    element.blur();
  } catch {}

  return true;
}

/**
 * Formats any raw Date of Birth string into the required format of the target input.
 * HTML5 <input type="date"> requires YYYY-MM-DD.
 * Text inputs format according to placeholder (DD/MM/YYYY or MM/DD/YYYY).
 */
export function formatDobValue(dobVal: string, input: HTMLElement, desc: string): string {
  if (!dobVal || !dobVal.trim()) return '';
  const trimmed = dobVal.trim();

  let year = '';
  let month = '';
  let day = '';

  const isoMatch = trimmed.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  const dmyMatch = trimmed.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);

  if (isoMatch) {
    year = isoMatch[1];
    month = isoMatch[2].padStart(2, '0');
    day = isoMatch[3].padStart(2, '0');
  } else if (dmyMatch) {
    const p1 = parseInt(dmyMatch[1], 10);
    const p2 = parseInt(dmyMatch[2], 10);
    year = dmyMatch[3];
    if (p1 > 12) {
      day = String(p1).padStart(2, '0');
      month = String(p2).padStart(2, '0');
    } else if (p2 > 12) {
      month = String(p1).padStart(2, '0');
      day = String(p2).padStart(2, '0');
    } else {
      // Default to DD/MM/YYYY
      day = String(p1).padStart(2, '0');
      month = String(p2).padStart(2, '0');
    }
  } else {
    const parsed = Date.parse(trimmed);
    if (!isNaN(parsed)) {
      const d = new Date(parsed);
      year = String(d.getFullYear());
      month = String(d.getMonth() + 1).padStart(2, '0');
      day = String(d.getDate()).padStart(2, '0');
    }
  }

  if (!year || !month || !day) return trimmed;

  const inputType = input.getAttribute('type')?.toLowerCase();
  if (inputType === 'date') {
    return `${year}-${month}-${day}`;
  }

  const d = desc.toLowerCase();
  if (/mm[\s_/-]?dd[\s_/-]?yyyy|mm-dd-yyyy/i.test(d)) {
    return `${month}/${day}/${year}`;
  }
  if (/dd[\s_/-]?mm[\s_/-]?yyyy|dd-mm-yyyy/i.test(d)) {
    return `${day}/${month}/${year}`;
  }

  return `${year}-${month}-${day}`;
}

// Automatically categorizes any input into the specific area where it is needed
export function categorizeField(desc: string): 'contact' | 'links' | 'work' | 'education' | 'eeo' {
  const d = desc.toLowerCase();
  if (/school|university|college|degree|major|gpa|graduation|education|institution|discipline|field[\s_-]?of[\s_-]?study/i.test(d)) {
    return 'education';
  }
  if (/linkedin|github|portfolio|website|twitter|x\.com|blog|social|personal[\s_-]?site|repo/i.test(d)) {
    return 'links';
  }
  if (/job|title|company|employer|experience|salary|notice|work|current|role|ctc|compensation|organization|department|pin|security|key|manager|industry/i.test(d)) {
    return 'work';
  }
  if (/gender|sex\b|race|ethnicity|veteran|disabilit|marital|pronoun|nationality|citizenship/i.test(d)) {
    return 'eeo';
  }
  return 'contact'; // default: contact & personal information (e.g. names, email, phone, address, cnic, father name)
}

function cleanLabelText(text: string): string {
  return text
    .replace(/[*:]/g, '')
    .replace(/\s*\(required\)/i, '')
    .replace(/\s*\(optional\)/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatIdentifierToWords(id: string): string {
  return id
    .replace(/[-_]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

// Extracts clean, human-readable label from an element
export function getCleanFieldLabel(el: HTMLElement): string {
  // 1. Linked label <label for="id">
  if (el.id) {
    try {
      const lbl = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (lbl && lbl.textContent?.trim()) {
        return cleanLabelText(lbl.textContent);
      }
    } catch {}
  }

  // 1b. Check if element is an alternate input (e.g. Flatpickr altInput) whose previous sibling input has a label
  if (el.previousElementSibling && el.previousElementSibling.tagName?.toLowerCase() === 'input') {
    const prevEl = el.previousElementSibling as HTMLElement;
    if (prevEl.id) {
      try {
        const lbl = document.querySelector(`label[for="${CSS.escape(prevEl.id)}"]`);
        if (lbl && lbl.textContent?.trim()) {
          return cleanLabelText(lbl.textContent);
        }
      } catch {}
    }
  }

  // 2. Parent label enclosing input
  const parentLbl = el.closest('label');
  if (parentLbl && parentLbl.textContent?.trim()) {
    return cleanLabelText(parentLbl.textContent);
  }

  // 3. aria-labelledby
  const labelledBy = el.getAttribute('aria-labelledby');
  if (labelledBy) {
    const target = document.getElementById(labelledBy);
    if (target && target.textContent?.trim()) {
      return cleanLabelText(target.textContent);
    }
  }

  // 4. aria-label
  const ariaLabel = el.getAttribute('aria-label');
  if (ariaLabel && ariaLabel.trim()) {
    return cleanLabelText(ariaLabel);
  }

  // 5. Preceding sibling label
  let prev = el.previousElementSibling;
  while (prev) {
    if (prev.tagName.toLowerCase() === 'label' || prev.className?.includes?.('label') || prev.className?.includes?.('title')) {
      if (prev.textContent?.trim()) return cleanLabelText(prev.textContent);
    }
    prev = prev.previousElementSibling;
  }

  // 6. Closest container label (.form-group, .field, etc.)
  const container = el.closest('.form-group, .field, [class*="form-group"], [class*="field"], [class*="input"], fieldset, p, tr');
  if (container) {
    const containerLbl = container.querySelector('label, .label, .control-label, span[class*="label"], strong');
    if (containerLbl && containerLbl.textContent?.trim()) {
      return cleanLabelText(containerLbl.textContent);
    }
  }

  // 7. placeholder
  const placeholder = el.getAttribute('placeholder');
  if (placeholder && placeholder.trim() && !placeholder.includes('http')) {
    return cleanLabelText(placeholder);
  }

  // 8. title
  const title = el.getAttribute('title');
  if (title && title.trim()) {
    return cleanLabelText(title);
  }

  // 9. name or id converted to Title Case
  const rawName = el.getAttribute('name') || el.id || '';
  if (rawName) {
    return formatIdentifierToWords(rawName);
  }

  return 'Input Field';
}

export function getFieldDescriptor(el: HTMLElement): string {
  const parts: string[] = [];
  if (el.id) parts.push(el.id);
  if (el.getAttribute('name')) parts.push(el.getAttribute('name')!);
  if (el.getAttribute('placeholder')) parts.push(el.getAttribute('placeholder')!);
  if (el.getAttribute('type')) parts.push(el.getAttribute('type')!);
  if (el.getAttribute('aria-label')) parts.push(el.getAttribute('aria-label')!);
  if (el.getAttribute('autocomplete')) parts.push(el.getAttribute('autocomplete')!);
  if (el.getAttribute('title')) parts.push(el.getAttribute('title')!);
  if (el.getAttribute('data-testid')) parts.push(el.getAttribute('data-testid')!);

  // Linked label via for="id"
  const id = el.getAttribute('id');
  if (id) {
    try {
      const label = document.querySelector(`label[for="${CSS.escape(id)}"]`);
      if (label && label.textContent) parts.push(label.textContent.trim());
    } catch {}
  }

  // Parent label
  const parentLabel = el.closest('label');
  if (parentLabel && parentLabel.textContent) {
    parts.push(parentLabel.textContent.trim());
  }

  // Preceding sibling or header
  let prev = el.previousElementSibling;
  while (prev) {
    if (prev.tagName.toLowerCase() === 'label' || prev.className?.includes?.('label')) {
      parts.push(prev.textContent?.trim() || '');
      break;
    }
    prev = prev.previousElementSibling;
  }

  // Preceding sibling input (e.g. original hidden input behind Flatpickr altInput)
  if (el.previousElementSibling && el.previousElementSibling.tagName?.toLowerCase() === 'input') {
    const prevInput = el.previousElementSibling as HTMLElement;
    if (prevInput.id) parts.push(prevInput.id);
    if (prevInput.getAttribute('name')) parts.push(prevInput.getAttribute('name')!);
  }

  // Flatpickr calendar instance integration
  if ((el as any)._flatpickr?.input) {
    const orig = (el as any)._flatpickr.input;
    if (orig.id) parts.push(orig.id);
    if (orig.getAttribute('name')) parts.push(orig.getAttribute('name')!);
  }

  // Immediate parent container label
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

// Combines all custom inputs saved by the user across customAnswers and sectionCustomFields
function getMergedCustomEntries(profile: UserProfile): Array<{ label: string; value: string }> {
  const map = new Map<string, string>();

  // 1. From customAnswers
  if (profile.customAnswers) {
    for (const [k, v] of Object.entries(profile.customAnswers)) {
      if (v && typeof v === 'string' && v.trim()) {
        map.set(k.replace(/_/g, ' ').toLowerCase().trim(), v.trim());
      }
    }
  }

  // 2. From sectionCustomFields
  if (profile.sectionCustomFields) {
    for (const fields of Object.values(profile.sectionCustomFields)) {
      if (Array.isArray(fields)) {
        for (const f of fields) {
          if (f?.label && f?.value && typeof f.value === 'string' && f.value.trim()) {
            map.set(f.label.toLowerCase().trim(), f.value.trim());
          }
        }
      }
    }
  }

  return Array.from(map.entries()).map(([label, value]) => ({ label, value }));
}

// Auto-detects all unfilled fields on the page so the user can easily fill and add them
export function detectUnfilledFields(profile: UserProfile): DetectedField[] {
  const inputs = Array.from(document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
    'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="image"]), textarea, select'
  ));

  const results: DetectedField[] = [];
  const seenLabels = new Set<string>();

  for (let idx = 0; idx < inputs.length; idx++) {
    const input = inputs[idx];

    // If input already has a filled value, skip it
    if (input.value && input.value.trim().length > 0 && input.type !== 'radio' && input.type !== 'checkbox') {
      continue;
    }

    const desc = getFieldDescriptor(input);
    const cleanLabel = getCleanFieldLabel(input);
    const category = categorizeField(desc + ' ' + cleanLabel);

    const dedupKey = cleanLabel.toLowerCase();
    if (seenLabels.has(dedupKey)) continue;
    seenLabels.add(dedupKey);

    let selector = '';
    if (input.id) {
      selector = `#${CSS.escape(input.id)}`;
    } else if (input.getAttribute('name')) {
      selector = `[name="${CSS.escape(input.getAttribute('name')!)}"]`;
    } else {
      selector = `input:nth-of-type(${idx + 1})`;
    }

    results.push({
      id: input.id || `field_${idx}_${Date.now()}`,
      name: input.getAttribute('name') || input.id || cleanLabel,
      label: cleanLabel,
      category,
      type: input.getAttribute('type') || input.tagName.toLowerCase(),
      placeholder: input.getAttribute('placeholder') || '',
      selector,
    });
  }

  return results.slice(0, 15);
}

export function autofillForm(profile: UserProfile): AutofillResult {
  const inputs = Array.from(document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
    'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="image"]), textarea, select'
  ));

  const customEntries = getMergedCustomEntries(profile);
  let filledCount = 0;

  for (const input of inputs) {
    // If input is already filled by user, skip it
    if (input.value && input.value.trim().length > 0 && input.type !== 'radio' && input.type !== 'checkbox') {
      continue;
    }

    const desc = getFieldDescriptor(input);
    const cleanLabel = getCleanFieldLabel(input).toLowerCase();
    let matched = false;

    // Phone / Mobile (Check first so "Mobile" field never gets filled with email!)
    if (/phone|mobile|tel\b|cellular|contact[\s_-]?number/i.test(desc)) {
      let phoneVal = profile.personal?.phone || '';
      if ((input as HTMLInputElement).maxLength === 11 || /03\d{2}/.test(desc)) {
        phoneVal = phoneVal.replace(/^\+92\s?/, '0').replace(/\s+/g, '');
      }
      matched = setNativeValue(input, phoneVal);
    }
    // Email (Strictly exclude mobile/phone/cnic)
    else if ((/e[\s_-]?mail|email[\s_-]?address/i.test(desc) || (input as HTMLInputElement).type === 'email') && !/phone|mobile|tel|cell|cnic/i.test(desc)) {
      matched = setNativeValue(input, profile.personal?.email);
    }
    // Date of Birth (DOB) - evaluated BEFORE generic ID/CNIC so "DOB as per CNIC" fills DOB!
    else if (
      (/date[\s_-]?of[\s_-]?birth|birth[\s_-]?date|\bdob\b|birthday/i.test(desc) ||
       (input as HTMLInputElement).type === 'date' ||
       input.getAttribute('name') === 'dob' ||
       input.id === 'dob' ||
       cleanLabel.includes('date of birth') ||
       cleanLabel.includes('birth date') ||
       cleanLabel === 'dob') &&
      !/expiry|issue|start|end|graduat/i.test(desc)
    ) {
      const rawDob = profile.personal?.dob || profile.customAnswers?.['dob'] || profile.customAnswers?.['date_of_birth'] || '';
      if (rawDob) {
        const formatted = formatDobValue(rawDob, input, desc);
        matched = setNativeValue(input, formatted);
      }
    }
    // First Name
    else if (
      (cleanLabel === 'first name' || (/first[\s_-]?name|given[\s_-]?name|fname/i.test(desc) && cleanLabel !== 'name')) &&
      !/last|sur|family|company|school/i.test(desc)
    ) {
      matched = setNativeValue(input, profile.personal?.firstName);
    }
    // Last Name
    else if (
      (/last[\s_-]?name|family[\s_-]?name|surname|lname/i.test(desc) || cleanLabel === 'last name') &&
      !/first/i.test(desc)
    ) {
      matched = setNativeValue(input, profile.personal?.lastName);
    }
    // Full Name / Candidate Name / Name (MUST NOT match CNIC even if placeholder says "First Name as per CNIC"!)
    else if (
      (/full[\s_-]?name|candidate[\s_-]?name|applicant[\s_-]?name|legal[\s_-]?name/i.test(desc) ||
       cleanLabel === 'name' ||
       cleanLabel === 'full name' ||
       cleanLabel === 'candidate name' ||
       cleanLabel === 'applicant name' ||
       (/^name$/i.test(input.getAttribute('name') || '') || /^name$/i.test(input.id || '')) ||
       (/\bname\b/i.test(cleanLabel) && !/user|father|mother|spouse|company|school|sur/i.test(cleanLabel))) &&
      !/father|mother|spouse|company|school|file|user[\s_-]?name/i.test(desc.replace(/as[\s_-]?per[\s_-]?cnic/gi, ''))
    ) {
      const fullName = `${profile.personal?.firstName || ''} ${profile.personal?.lastName || ''}`.trim() || profile.personal?.firstName;
      matched = setNativeValue(input, fullName);
    }
    // Confirm CNIC Number
    else if (/confirm[\s_-]?cnic|c_cnic|re[\s_-]?enter[\s_-]?cnic/i.test(desc)) {
      let idVal = profile.personal?.cnic || profile.customAnswers?.['cnic'] || '';
      if (idVal) {
        if (/without[\s_-]?dash|no[\s_-]?dash|digits[\s_-]?only/i.test(desc) || (input as HTMLInputElement).maxLength === 13) {
          idVal = idVal.replace(/\D/g, '');
        }
        matched = setNativeValue(input, idVal);
      }
    }
    // User ID / CNIC / NICOP / Afghan Refugee / National ID
    // STRICT GUARD: Exclude if cleanLabel is Name / DOB or if "as per cnic" was just an instruction!
    else if (
      /(\bcnic\b|\bnicop\b|afghan[\s_-]?refugee|por(?!\w)|national[\s_-]?id|identity[\s_-]?card|user[\s_-]?id)/i.test(
        desc.replace(/as[\s_-]?per[\s_-]?cnic/gi, '')
      ) &&
      !/as[\s_-]?per[\s_-]?cnic/i.test(cleanLabel) &&
      !/\b(name|birth|dob|date|email|phone)\b/i.test(cleanLabel)
    ) {
      let idVal = profile.personal?.cnic || profile.customAnswers?.['cnic'] || profile.customAnswers?.['user_id'] || '';
      if (idVal) {
        if (/without[\s_-]?dash|no[\s_-]?dash|digits[\s_-]?only/i.test(desc) || (input as HTMLInputElement).maxLength === 13) {
          idVal = idVal.replace(/\D/g, '');
        }
        matched = setNativeValue(input, idVal);
      }
    }
    // Confirm Password
    else if (/confirm[\s_-]?password|c_password|repeat[\s_-]?password/i.test(desc)) {
      const pwd = profile.customAnswers?.['password'] || profile.customAnswers?.['confirm_password'] || '';
      if (pwd) matched = setNativeValue(input, pwd);
    }
    // Password
    else if (((input as HTMLInputElement).type === 'password' || /password|passwd|pwd/i.test(desc)) && !/confirm|c_pass/i.test(desc)) {
      const pwd = profile.customAnswers?.['password'] || '';
      if (pwd) matched = setNativeValue(input, pwd);
    }
    // LinkedIn
    else if (/linkedin/i.test(desc)) {
      matched = setNativeValue(input, profile.personal?.linkedIn);
    }
    // GitHub
    else if (/github/i.test(desc)) {
      matched = setNativeValue(input, profile.personal?.github);
    }
    // Twitter / X
    else if (/twitter|x\.com/i.test(desc)) {
      matched = setNativeValue(input, profile.personal?.twitter);
    }
    // Website / Portfolio
    else if (/portfolio|website|personal[\s_-]?site|blog|web[\s_-]?page/i.test(desc)) {
      matched = setNativeValue(input, profile.personal?.portfolio);
    }
    // Street Address
    else if (/street|address[\s_-]?line[\s_-]?1|address$/i.test(desc) && !/email/i.test(desc)) {
      matched = setNativeValue(input, profile.personal?.address);
    }
    // City
    else if (/city|town|municipality/i.test(desc)) {
      matched = setNativeValue(input, profile.personal?.city);
    }
    // State / Province
    else if (/state|province|region/i.test(desc)) {
      matched = setNativeValue(input, profile.personal?.state);
    }
    // Zip / Postal code
    else if (/zip|postal|post[\s_-]?code/i.test(desc)) {
      matched = setNativeValue(input, profile.personal?.zipCode);
    }
    // Country
    else if (/country/i.test(desc)) {
      matched = setNativeValue(input, profile.personal?.country);
    }
    // Current Job Title
    else if (/current[\s_-]?title|job[\s_-]?title|headline|role/i.test(desc) && !/company/i.test(desc)) {
      matched = setNativeValue(input, profile.work?.currentTitle);
    }
    // Current Company
    else if (/current[\s_-]?company|employer|most[\s_-]?recent[\s_-]?company/i.test(desc)) {
      matched = setNativeValue(input, profile.work?.currentCompany);
    }
    // Years of Experience
    else if (/years[\s_-]?(of)?[\s_-]?exp|total[\s_-]?experience/i.test(desc)) {
      matched = setNativeValue(input, profile.work?.yearsExperience);
    }
    // Salary Expectations
    else if (/salary|compensation|desired[\s_-]?pay|expected[\s_-]?rate|ctc/i.test(desc)) {
      matched = setNativeValue(input, profile.work?.salaryExpectations);
    }
    // Notice Period
    else if (/notice[\s_-]?period|start[\s_-]?date|availability/i.test(desc)) {
      matched = setNativeValue(input, profile.work?.noticePeriod);
    }
    // Education / School
    else if (/school|university|college|institution/i.test(desc)) {
      matched = setNativeValue(input, profile.education?.school);
    }
    // Degree
    else if (/degree|education[\s_-]?level/i.test(desc)) {
      matched = setNativeValue(input, profile.education?.degree);
    }
    // Field of Study / Major
    else if (/major|field[\s_-]?of[\s_-]?study|discipline/i.test(desc)) {
      matched = setNativeValue(input, profile.education?.fieldOfStudy);
    }
    // Work Authorization Radios/Selects
    else if (/legally[\s_-]?authorized|authorized[\s_-]?to[\s_-]?work/i.test(desc)) {
      matched = setNativeValue(input, 'Yes');
    }
    // Sponsorship Requirements
    else if (/require[\s_-]?sponsorship|sponsorship[\s_-]?now[\s_-]?or[\s_-]?in[\s_-]?future/i.test(desc)) {
      matched = setNativeValue(input, 'No');
    }
    // Work Location / Remote Preference
    else if (/remote|hybrid|work[\s_-]?location|workplace[\s_-]?type/i.test(desc)) {
      matched = setNativeValue(input, profile.work?.workLocationPreference);
    }
    // Relocation
    else if (/willing[\s_-]?to[\s_-]?relocate|relocat/i.test(desc)) {
      matched = setNativeValue(input, profile.work?.willingToRelocate);
    }
    // Gender / EEO
    else if (/gender|sex(?!\w)/i.test(desc)) {
      matched = setNativeValue(input, profile.eeo?.gender || 'Decline to self-identify');
    }
    // Race / Ethnicity / EEO
    else if (/race|ethnicity/i.test(desc)) {
      matched = setNativeValue(input, profile.eeo?.raceEthnicity || 'Decline to self-identify');
    }
    // Veteran Status / EEO
    else if (/veteran/i.test(desc)) {
      matched = setNativeValue(input, profile.eeo?.veteranStatus || 'I am not a protected veteran');
    }
    // Disability Status / EEO
    else if (/disabilit/i.test(desc)) {
      matched = setNativeValue(input, profile.eeo?.disabilityStatus || 'No, I do not have a disability');
    }

    // Custom Fields Matching (Matches both customAnswers and sectionCustomFields)
    if (!matched && customEntries.length > 0) {
      for (const entry of customEntries) {
        const l = entry.label;
        const val = entry.value;
        if (!val) continue;

        // 1. Direct descriptor or exact cleanLabel match
        if (cleanLabel === l || (l.length >= 4 && (desc.includes(l) || cleanLabel.includes(l)))) {
          matched = setNativeValue(input, val);
          if (matched) break;
        }

        // 2. PIN / Password / Security Key matching
        if (/pin|security|key/i.test(desc) && /pin|security|key/i.test(l)) {
          matched = setNativeValue(input, val);
          if (matched) break;
        }

        // 3. Multi-token match: NEVER match single generic words like 'name', 'date', 'user', 'card'
        const tokens = l.split(/\s+/).filter(w => w.length >= 4 && !/^(name|date|text|user|info|card)$/i.test(w));
        if (tokens.length > 0 && tokens.every(t => desc.includes(t) || cleanLabel.includes(t))) {
          matched = setNativeValue(input, val);
          if (matched) break;
        }
      }
    }

    if (matched) {
      filledCount++;
      input.style.transition = 'background-color 0.4s ease';
      input.style.backgroundColor = 'rgba(99, 102, 241, 0.15)';
      setTimeout(() => {
        input.style.backgroundColor = '';
      }, 1500);
    }
  }

  const unfilled = detectUnfilledFields(profile);

  return {
    totalFieldsFound: inputs.length,
    filledFieldsCount: filledCount,
    unfilledFields: unfilled,
  };
}

// Extracts current job description from the page
export function extractPageJobContext(): { title: string; company: string; description: string } {
  let title = '';
  let company = '';
  let description = '';

  const h1 = document.querySelector('h1');
  if (h1) title = h1.textContent?.trim() || '';

  const linkedInCompany = document.querySelector('.job-details-jobs-unified-top-card__company-name, .topcard__org-name-link');
  if (linkedInCompany) company = linkedInCompany.textContent?.trim() || '';

  const indeedCompany = document.querySelector('[data-company-name="true"], .jobsearch-CompanyInfoContainer');
  if (indeedCompany && !company) company = indeedCompany.textContent?.trim() || '';

  const orgHeader = document.querySelector('.company-name, .posting-headline h2');
  if (orgHeader && !company) company = orgHeader.textContent?.trim() || '';

  const mainArticle = document.querySelector('article, [class*="job-description"], [class*="jobDescription"], #job-details, .posting-page');
  if (mainArticle) {
    description = mainArticle.textContent?.slice(0, 4000).trim() || '';
  } else {
    description = document.body.innerText.slice(0, 3000).trim();
  }

  return { title, company, description };
}
