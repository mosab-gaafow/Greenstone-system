import { useQuery } from '@tanstack/react-query';
import { fetchDashboard } from '../api/dashboard.api';

export function useDashboard(from: string, to: string) {
  return useQuery({
    queryKey: ['dashboard', from, to],
    queryFn: () => fetchDashboard(from, to),
    enabled: !!from && !!to,
    refetchInterval: 30_000,
    placeholderData: (prev) => prev,
  });
}
