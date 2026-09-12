export const COMPANY_PROFILE_KEY = 'safework-company-profile-v1';

export type CompanyProfile = {
  name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  registration: string;
  logoDataUrl: string;
};

export const EMPTY_COMPANY_PROFILE: CompanyProfile = {
  name: '',
  address: '',
  phone: '',
  email: '',
  website: '',
  registration: '',
  logoDataUrl: '',
};

export function readCompanyProfile(): CompanyProfile {
  if (typeof window === 'undefined') return EMPTY_COMPANY_PROFILE;
  try {
    return { ...EMPTY_COMPANY_PROFILE, ...JSON.parse(window.localStorage.getItem(COMPANY_PROFILE_KEY) || '{}') };
  } catch {
    return EMPTY_COMPANY_PROFILE;
  }
}
