import { API_BASE_URL } from '@/lib/config';
import { api, type PaginationMeta } from '@/lib/api-client';
import type { Salary, SalaryDetail } from '../types/salary.types';

export function evidenceDownloadUrl(id: string): string { return `${API_BASE_URL}/salaries/${id}/evidence`; }

export async function fetchSalaries(f: Record<string, string | number | boolean | undefined>) {
  const { data, meta } = await api.get<Salary[]>('/salaries', { query: f as Record<string, string | number | boolean | undefined> });
  return { salaries: data, meta: meta as unknown as PaginationMeta };
}
export async function fetchSalary(id: string) { const { data } = await api.get<SalaryDetail>(`/salaries/${id}`); return data; }
export async function createSalary(input: FormData) { const { data } = await api.post<SalaryDetail>('/salaries', input); return data; }
export async function approveSalary(id: string) { const { data } = await api.post<SalaryDetail>(`/salaries/${id}/approve`, {}); return data; }
export async function correctSalary(id: string, input: Record<string, unknown>) { const { data } = await api.post<SalaryDetail>(`/salaries/${id}/correct`, input); return data; }
export async function reverseSalary(id: string, reason: string) { const { data } = await api.post<SalaryDetail>(`/salaries/${id}/reverse`, { reason }); return data; }
export async function updateSalary(id: string, input: Record<string, unknown>) { const { data } = await api.patch<SalaryDetail>(`/salaries/${id}`, input); return data; }
