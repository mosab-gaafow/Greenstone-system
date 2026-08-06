import { API_BASE_URL } from '@/lib/config';
import { api, type PaginationMeta } from '@/lib/api-client';
import type { Expense, ExpenseDetail } from '../types/expense.types';

export function evidenceDownloadUrl(id: string): string { return `${API_BASE_URL}/expenses/${id}/evidence`; }

export async function fetchExpenses(f: { page: number; pageSize: number; search?: string; category?: string; paymentMethod?: string }) {
  const { data, meta } = await api.get<Expense[]>('/expenses', { query: f });
  return { expenses: data, meta: meta as unknown as PaginationMeta };
}

export async function fetchExpense(id: string) { const { data } = await api.get<ExpenseDetail>(`/expenses/${id}`); return data; }

export async function createExpense(input: FormData) {
  const { data } = await api.post<ExpenseDetail>('/expenses', input);
  return data;
}

export async function updateExpense(id: string, input: Record<string, unknown>) {
  const { data } = await api.patch<ExpenseDetail>(`/expenses/${id}`, input);
  return data;
}
