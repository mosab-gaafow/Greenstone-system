/**
 * Company settings types.
 *
 * A singleton — one record for the whole company. There is no create,
 * delete, or list; only read and update.
 */

export interface CompanySettings {
  companyName: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  paymentDetails: string | null;
  footerNotes: string | null;
  updatedAt: string;
}
