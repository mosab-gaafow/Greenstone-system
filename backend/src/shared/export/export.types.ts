/** Alignment for Excel columns. */
export type ColAlign = 'left' | 'right' | 'center';

/** Value format for Excel cells. */
export type ColFormat = 'KES' | 'int' | 'decimal' | 'date' | 'text';

/** Describes one export column for Excel/CSV generation. */
export interface ExportColumn {
  key: string;
  header: string;
  width?: number;
  align?: ColAlign;
  format?: ColFormat;
}

export type ExportFormat = 'xlsx' | 'csv' | 'pdf';

/** Normalised query params the gateway extracts from the request. */
export interface ExportRequest {
  source: string;
  format: ExportFormat;
  search: string | undefined;
  from: string | undefined;
  to: string | undefined;
  status: string | undefined;
  customerId: string | undefined;
  orderStatus: string | undefined;
  invoiceStatus: string | undefined;
  paymentStatus: string | undefined;
  paymentMethod: string | undefined;
  receiptStatus: string | undefined;
  category: string | undefined;
  salaryType: string | undefined;
  movementType: string | undefined;
  supplierId: string | undefined;
  balanceFilter: string | undefined;
  limit: number | undefined;
  groupBy: string | undefined;
}

/** Standard shape every data source must return. */
export interface ExportData<T = Record<string, unknown>> {
  rows: T[];
  columns: ExportColumn[];
  /** Optional title for the document. */
  title: string;
  /** Optional subtitle (e.g. period label). */
  subtitle?: string;
  /** Optional summary row at the bottom. */
  totals?: Record<string, string | number>;
}
