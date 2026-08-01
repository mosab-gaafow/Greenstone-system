/**
 * Text normalisation for duplicate detection.
 *
 * A uniqueness rule is only as good as the comparison behind it. Storing the
 * value as typed and putting a unique index on it does not work: "0722 123 456"
 * and "0722123456" are the same number but different strings, so a duplicate
 * slips through by typing a space.
 *
 * Every entity that must be unique therefore stores a normalised copy of the
 * value alongside the original. The original is what the user sees; the
 * normalised copy is what the unique index is built on.
 */

/**
 * Collapses whitespace and trims.
 *
 * Applied to every stored text value, so "Kamau   Contractors " and
 * "Kamau Contractors" cannot become two different records.
 */
export function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

/**
 * Normalises a value for comparison.
 *
 * Case-insensitive, whitespace-insensitive, and treats the multiplication sign
 * as the letter x — Greenstone's product names are written "6 × 9", and someone
 * typing "6 x 9" means the same product.
 */
export function normalizeForComparison(value: string): string {
  return normalizeText(value).toLowerCase().replace(/[×✕✖]/g, 'x').replace(/\s+/g, ' ');
}

/**
 * Normalises a phone number to digits only, in international form.
 *
 * Kenyan numbers are written several ways for the same line:
 *
 *   0722123456      →  254722123456
 *   +254 722 123456 →  254722123456
 *   254-722-123456  →  254722123456
 *
 * All three collapse to one value, so they can no longer be entered as three
 * separate customers.
 *
 * A number that does not look Kenyan keeps its own digits, so an international
 * supplier or customer is not mangled.
 */
export function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, '');

  if (digits.length === 0) {
    return '';
  }

  // Local form: 0722123456 → 254722123456
  if (digits.startsWith('0')) {
    return `254${digits.slice(1)}`;
  }

  // Already international, with or without a leading +.
  return digits;
}

/**
 * Normalises an email for comparison.
 *
 * Lowercased only. The local part of an address is technically case-sensitive,
 * but no real mail provider treats it that way, and two records differing only
 * by capitals are a duplicate in practice.
 */
export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}
