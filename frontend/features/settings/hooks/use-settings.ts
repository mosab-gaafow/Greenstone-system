'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api-client';
import * as settingsApi from '../api/settings.api';
import type { SettingsFormValues } from '../schemas/settings.schema';

export const settingsKeys = {
  all: ['settings'] as const,
};

export function useSettings() {
  return useQuery({
    queryKey: settingsKeys.all,
    queryFn: () => settingsApi.fetchSettings(),
  });
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: SettingsFormValues) => settingsApi.updateSettings(values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: settingsKeys.all });
      toast.success('Company settings saved.');
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'The settings could not be saved.'));
    },
  });
}
