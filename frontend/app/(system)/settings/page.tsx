'use client';

import { Settings as SettingsIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/data-display/empty-state';
import { ApiError } from '@/lib/api-client';
import { SettingsForm } from '@/features/settings/components/settings-form';
import { useSettings, useUpdateSettings } from '@/features/settings/hooks/use-settings';

export default function SettingsPage() {
  const query = useSettings();
  const updateSettings = useUpdateSettings();

  return (
    <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        icon={SettingsIcon}
        title="Company settings"
        description="Company details used on future documents. Real information can be entered at any time."
      />

      <div className="max-w-2xl">
        {query.isPending ? (
          <Card>
            <CardContent className="space-y-4">
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        ) : query.isError ? (
          query.error instanceof ApiError && query.error.status === 403 ? (
            <EmptyState
              icon={SettingsIcon}
              title="You don't have access to this page"
              description="Company settings are only available to Admin and Super Admin."
            />
          ) : (
            <EmptyState
              icon={SettingsIcon}
              title="The settings could not be loaded"
              description="Check your connection and try again."
            />
          )
        ) : (
          <Card>
            <CardContent>
              <SettingsForm
                settings={query.data}
                pending={updateSettings.isPending}
                onSubmit={(values) => updateSettings.mutateAsync(values)}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
