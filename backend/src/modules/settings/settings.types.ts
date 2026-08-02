/**
 * Company settings module types.
 *
 * A singleton — one row for the whole company, read and updated, never
 * created or deleted through the API. See settings.repository.ts.
 */

export interface CompanySettingsSummary {
  companyName: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  paymentDetails: string | null;
  footerNotes: string | null;
  updatedAt: string;
}

export interface UpdateCompanySettingsInput {
  companyName?: string | null | undefined;
  address?: string | null | undefined;
  phone?: string | null | undefined;
  email?: string | null | undefined;
  paymentDetails?: string | null | undefined;
  footerNotes?: string | null | undefined;
}
