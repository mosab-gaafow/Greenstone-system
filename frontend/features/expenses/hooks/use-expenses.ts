import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { fetchExpenses, fetchExpense, createExpense, updateExpense } from '../api/expenses.api';

export const expenseKeys = {
  all: ['expenses'] as const,
  lists: () => [...expenseKeys.all, 'list'] as const,
  list: (f: Record<string, unknown>) => [...expenseKeys.lists(), f] as const,
  details: () => [...expenseKeys.all, 'detail'] as const,
  detail: (id: string) => [...expenseKeys.details(), id] as const,
};

export function useExpenses(f: { page: number; pageSize: number; search?: string; category?: string; paymentMethod?: string }) {
  return useQuery({ queryKey: expenseKeys.list(f), queryFn: () => fetchExpenses(f), placeholderData: (prev) => prev });
}

export function useExpense(id: string) {
  return useQuery({ queryKey: expenseKeys.detail(id), queryFn: () => fetchExpense(id), enabled: !!id });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) => createExpense(formData),
    onSuccess: () => { qc.invalidateQueries({ queryKey: expenseKeys.all }); toast.success('Expense recorded.'); },
    onError: (e: Error) => toast.error(e.message ?? 'Could not record expense.'),
  });
}

export function useUpdateExpense(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Record<string, unknown>) => updateExpense(id, input),
    onSuccess: () => { qc.invalidateQueries({ queryKey: expenseKeys.all }); toast.success('Expense updated.'); },
    onError: (e: Error) => toast.error(e.message ?? 'Could not update expense.'),
  });
}
