import { api } from '@/lib/api-client';
import type { CompanySettings } from '../types/settings.types';
import type { SettingsFormValues } from '../schemas/settings.schema';

export async function fetchSettings(): Promise<CompanySettings> {
  const { data } = await api.get<CompanySettings>('/settings');
  return data;
}

export async function updateSettings(values: SettingsFormValues): Promise<CompanySettings> {
  const { data } = await api.patch<CompanySettings>('/settings', normalise(values));
  return data;
}

/** An empty optional field clears the value, so it is sent as null. */
function normalise(values: SettingsFormValues) {
  return {
    companyName: values.companyName?.trim() ? values.companyName.trim() : null,
    address: values.address?.trim() ? values.address.trim() : null,
    phone: values.phone?.trim() ? values.phone.trim() : null,
    email: values.email?.trim() ? values.email.trim() : null,
    paymentDetails: values.paymentDetails?.trim() ? values.paymentDetails.trim() : null,
    footerNotes: values.footerNotes?.trim() ? values.footerNotes.trim() : null,
  };
}
