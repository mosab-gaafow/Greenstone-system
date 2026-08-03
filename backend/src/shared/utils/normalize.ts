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

/**
 * Normalises a national ID for the uniqueness check.
 *
 * Uppercased, with every space removed (not just collapsed) — an ID number
 * has no meaningful internal spacing, unlike a name or address. Shared by
 * `Driver` and `VehicleOwner` (Phase 6F), both of which use the same
 * "readable value + normalised unique column" pattern for this field.
 */
export function normalizeNationalId(value: string): string {
  return value.trim().replace(/\s+/g, '').toUpperCase();
}

/**
 * Normalises a vehicle registration number for the uniqueness check.
 *
 * A plate has no meaningful separators — "KDM 293E", "kdm-293e", and
 * "KDM293E" are the same plate. Every character that is not a letter or
 * digit is stripped, not just whitespace, so a hyphen or stray punctuation
 * mark cannot slip a duplicate past the unique index (the bug that let
 * "KDM 293E" and "kdm-293e" both be created as separate Vehicle rows —
 * the previous function only removed whitespace, leaving the hyphen in
 * place).
 */
export function normalizeRegistration(value: string): string {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Formats a vehicle registration number for company-facing display.
 *
 * Uppercased and trimmed, with any run of separator characters (hyphens,
 * extra spaces, and similar) collapsed to a single space — "kdm-293e" is
 * stored and displayed as "KDM 293E", the same plate written by hand.
 */
export function formatRegistrationDisplay(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim();
}
