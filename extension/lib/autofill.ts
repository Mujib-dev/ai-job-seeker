import { UserProfile } from './types';

interface AutofillResult {
  totalFieldsFound: number;
  filledFieldsCount: number;
  unfilledFields: string[];
}

// Dispatches standard DOM events so modern single-page apps (React, Angular, Vue, Svelte) register the value changes
export function setNativeValue(
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  value: string | undefined | null
): boolean {
  if (!value || typeof value !== 'string' || !value.trim()) {
    return false;
  }

  const trimmed = value.trim();

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

  return true;
}

function getFieldDescriptor(el: HTMLElement): string {
  const parts: string[] = [];
  if (el.id) parts.push(el.id);
  if (el.getAttribute('name')) parts.push(el.getAttribute('name')!);
  if (el.getAttribute('placeholder')) parts.push(el.getAttribute('placeholder')!);
  if (el.getAttribute('type')) parts.push(el.getAttribute('type')!);
  if (el.getAttribute('aria-label')) parts.push(el.getAttribute('aria-label')!);
  if (el.getAttribute('autocomplete')) parts.push(el.getAttribute('autocomplete')!);
  if (el.getAttribute('title')) parts.push(el.getAttribute('title')!);
  if (el.getAttribute('data-testid')) parts.push(el.getAttribute('data-testid')!);

  // Check linked label via for="id"
  const id = el.getAttribute('id');
  if (id) {
    const label = document.querySelector(`label[for="${id}"]`);
    if (label && label.textContent) parts.push(label.textContent.trim());
  }

  // Check parent label
  const parentLabel = el.closest('label');
  if (parentLabel && parentLabel.textContent) {
    parts.push(parentLabel.textContent.trim());
  }

  // Check preceding sibling or header
  let prev = el.previousElementSibling;
  while (prev) {
    if (prev.tagName.toLowerCase() === 'label' || prev.className?.includes?.('label')) {
      parts.push(prev.textContent?.trim() || '');
      break;
    }
    prev = prev.previousElementSibling;
  }

  // Check immediate parent container's label if parent has only this single input
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

export function autofillForm(profile: UserProfile): AutofillResult {
  const inputs = Array.from(document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
    'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="image"]), textarea, select'
  ));

  let filledCount = 0;
  const unfilled: string[] = [];

  for (const input of inputs) {
    // If input is already filled by user, skip it
    if (input.value && input.value.trim().length > 0 && input.type !== 'radio' && input.type !== 'checkbox') {
      continue;
    }

    const desc = getFieldDescriptor(input);
    let matched = false;

    // Phone / Mobile (Check first so "Mobile" field never gets filled with email!)
    if (/phone|mobile|tel\b|cellular|contact[\s_-]?number/i.test(desc)) {
      let phoneVal = profile.personal?.phone || '';
      // If field specifies 11 digits (Pakistani format like 03481974606), format accordingly
      if ((input as HTMLInputElement).maxLength === 11 || /03\d{2}/.test(desc)) {
        phoneVal = phoneVal.replace(/^\+92\s?/, '0').replace(/\s+/g, '');
      }
      matched = setNativeValue(input, phoneVal);
    }
    // Email (Strictly exclude mobile/phone)
    else if ((/e[\s_-]?mail|email[\s_-]?address/i.test(desc) || (input as HTMLInputElement).type === 'email') && !/phone|mobile|tel|cell/i.test(desc)) {
      matched = setNativeValue(input, profile.personal?.email);
    }
    // User ID / CNIC / NICOP / Afghan Refugee / National ID
    else if (/cnic|nicop|afghan[\s_-]?refugee|por(?!\w)|national[\s_-]?id|identity[\s_-]?card|user[\s_-]?id/i.test(desc)) {
      let idVal = profile.personal?.cnic || profile.customAnswers?.['cnic'] || profile.customAnswers?.['user_id'] || '';
      if (idVal) {
        if (/without[\s_-]?dash|no[\s_-]?dash|digits[\s_-]?only/i.test(desc)) {
          idVal = idVal.replace(/\D/g, '');
        }
        matched = setNativeValue(input, idVal);
      }
    }
    // First Name
    else if (/first[\s_-]?name|given[\s_-]?name|fname/i.test(desc) && !/last|full|sur/i.test(desc)) {
      matched = setNativeValue(input, profile.personal?.firstName);
    }
    // Last Name
    else if (/last[\s_-]?name|family[\s_-]?name|surname|lname/i.test(desc) && !/first/i.test(desc)) {
      matched = setNativeValue(input, profile.personal?.lastName);
    }
    // Full Name
    else if (/full[\s_-]?name|^name$|candidate[\s_-]?name/i.test(desc) && !/first|last|company|school/i.test(desc)) {
      const fullName = `${profile.personal?.firstName || ''} ${profile.personal?.lastName || ''}`.trim();
      matched = setNativeValue(input, fullName);
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
    else if (/salary|compensation|desired[\s_-]?pay|expected[\s_-]?rate/i.test(desc)) {
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
      if (input.tagName.toLowerCase() === 'select') {
        const select = input as HTMLSelectElement;
        for (let i = 0; i < select.options.length; i++) {
          if (/yes/i.test(select.options[i].text) || /yes/i.test(select.options[i].value)) {
            select.selectedIndex = i;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            matched = true;
            break;
          }
        }
      }
    }
    // Sponsorship Requirements
    else if (/require[\s_-]?sponsorship|sponsorship[\s_-]?now[\s_-]?or[\s_-]?in[\s_-]?future/i.test(desc)) {
      if (input.tagName.toLowerCase() === 'select') {
        const select = input as HTMLSelectElement;
        for (let i = 0; i < select.options.length; i++) {
          if (/no/i.test(select.options[i].text) || /no/i.test(select.options[i].value)) {
            select.selectedIndex = i;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            matched = true;
            break;
          }
        }
      }
    }
    // Work Location / Remote Preference
    else if (/remote|hybrid|work[\s_-]?location|workplace[\s_-]?type/i.test(desc)) {
      matched = setNativeValue(input, profile.work?.workLocationPreference);
    }
    // Relocation
    else if (/willing[\s_-]?to[\s_-]?relocate|relocat/i.test(desc)) {
      const relocatePref = (profile.work?.willingToRelocate || '').toLowerCase();
      if (input.tagName.toLowerCase() === 'select') {
        const select = input as HTMLSelectElement;
        for (let i = 0; i < select.options.length; i++) {
          if (relocatePref && select.options[i].text.toLowerCase().includes(relocatePref)) {
            select.selectedIndex = i;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            matched = true;
            break;
          }
        }
      } else {
        matched = setNativeValue(input, profile.work?.willingToRelocate);
      }
    }
    // Gender / EEO
    else if (/gender|sex(?!\w)/i.test(desc)) {
      const genderPref = (profile.eeo?.gender || '').toLowerCase();
      if (genderPref && input.tagName.toLowerCase() === 'select') {
        const select = input as HTMLSelectElement;
        for (let i = 0; i < select.options.length; i++) {
          if (select.options[i].text.toLowerCase().includes(genderPref)) {
            select.selectedIndex = i;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            matched = true;
            break;
          }
        }
      }
    }
    // Race / Ethnicity / EEO
    else if (/race|ethnicity/i.test(desc)) {
      const racePref = (profile.eeo?.raceEthnicity || '').toLowerCase();
      if (racePref && input.tagName.toLowerCase() === 'select') {
        const select = input as HTMLSelectElement;
        for (let i = 0; i < select.options.length; i++) {
          if (select.options[i].text.toLowerCase().includes(racePref)) {
            select.selectedIndex = i;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            matched = true;
            break;
          }
        }
      }
    }
    // Veteran Status / EEO
    else if (/veteran/i.test(desc)) {
      if (input.tagName.toLowerCase() === 'select') {
        const select = input as HTMLSelectElement;
        for (let i = 0; i < select.options.length; i++) {
          if (select.options[i].text.toLowerCase().includes('not') || select.options[i].text.toLowerCase().includes('decline')) {
            select.selectedIndex = i;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            matched = true;
            break;
          }
        }
      }
    }
    // Disability Status / EEO
    else if (/disabilit/i.test(desc)) {
      if (input.tagName.toLowerCase() === 'select') {
        const select = input as HTMLSelectElement;
        for (let i = 0; i < select.options.length; i++) {
          if (select.options[i].text.toLowerCase().includes('no') || select.options[i].text.toLowerCase().includes('decline')) {
            select.selectedIndex = i;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            matched = true;
            break;
          }
        }
      }
    }
    // Password (if saved in custom answers)
    else if (((input as HTMLInputElement).type === 'password' || /password|passwd|pwd/i.test(desc)) && profile.customAnswers?.['password']) {
      matched = setNativeValue(input, profile.customAnswers['password']);
    }
    // Custom Field & Missing Input Check (Fuzzy keyword and phrase matching)
    else if (profile.customAnswers) {
      for (const [key, value] of Object.entries(profile.customAnswers)) {
        if (!value) continue;
        const cleanKey = key.replace(/_/g, ' ').toLowerCase();
        const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
        const normalizedDesc = desc.toLowerCase().replace(/[^a-z0-9]/g, '');
        const keyWords = cleanKey.split(/\s+/).filter(w => w.length > 2);

        const wordMatch = keyWords.length > 0 && keyWords.every(w => desc.includes(w));
        const substrMatch = (cleanKey.length >= 3 && desc.includes(cleanKey)) || (normalizedKey.length >= 3 && normalizedDesc.includes(normalizedKey));

        if (wordMatch || substrMatch) {
          if (setNativeValue(input, value)) {
            matched = true;
            break;
          }
        }
      }
    }

    if (matched) {
      filledCount++;
      input.style.transition = 'background-color 0.4s ease';
      input.style.backgroundColor = 'rgba(99, 102, 241, 0.12)';
      setTimeout(() => {
        input.style.backgroundColor = '';
      }, 1500);
    } else {
      if (input.getAttribute('name') || input.id) {
        unfilled.push(input.getAttribute('name') || input.id || 'unlabeled field');
      }
    }
  }

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

  // 1. Check title elements
  const h1 = document.querySelector('h1');
  if (h1) title = h1.textContent?.trim() || '';

  // 2. Check LinkedIn specifics
  const linkedInCompany = document.querySelector('.job-details-jobs-unified-top-card__company-name, .topcard__org-name-link');
  if (linkedInCompany) company = linkedInCompany.textContent?.trim() || '';

  // 3. Check Indeed specifics
  const indeedCompany = document.querySelector('[data-company-name="true"], .jobsearch-CompanyInfoContainer');
  if (indeedCompany && !company) company = indeedCompany.textContent?.trim() || '';

  // 4. Check Greenhouse / Lever
  const orgHeader = document.querySelector('.company-name, .posting-headline h2');
  if (orgHeader && !company) company = orgHeader.textContent?.trim() || '';

  // 5. Gather page description text
  const mainArticle = document.querySelector('article, [class*="job-description"], [class*="jobDescription"], #job-details, .posting-page');
  if (mainArticle) {
    description = mainArticle.textContent?.slice(0, 4000).trim() || '';
  } else {
    description = document.body.innerText.slice(0, 3000).trim();
  }

  return { title, company, description };
}
