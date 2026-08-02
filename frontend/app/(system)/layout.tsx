'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/layout/app-header';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrentUser } from '@/features/auth/hooks/use-current-user';
import { LOGIN_PATH } from '@/lib/config';

const SIDEBAR_STORAGE_KEY = 'greenstone:sidebar-collapsed';

/**
 * Authenticated application layout.
 *
 * `middleware.ts` already redirected anyone without a session cookie, but a
 * cookie can be present and invalid — expired, revoked, or belonging to a
 * deactivated user. This checks the real session and sends those users to the
 * login page too.
 *
 * Neither check is security. The backend refuses every unauthorised request on
 * its own; these only stop the interface showing a shell it cannot fill.
 */
export default function SystemLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isLoading } = useCurrentUser();

  // Collapse state lives here rather than inside the sidebar, because both the
  // sidebar's own toggle and the header's toggle need to drive the same value.
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    // One-time read of a client-only preference on mount, not a props-driven
    // cascade — the case the lint rule cannot tell apart from the pattern it
    // warns about.
    if (window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === '1') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCollapsed(true);
    }
  }, []);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace(LOGIN_PATH);
    }
  }, [isLoading, user, router]);

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, next ? '1' : '0');
      return next;
    });
  }

  return (
    <div className="flex min-h-dvh">
      <AppSidebar user={user} collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />

      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader user={user} isLoading={isLoading} onToggleSidebar={toggleCollapsed} />

        <main className="flex-1">{isLoading || !user ? <LayoutSkeleton /> : children}</main>
      </div>
    </div>
  );
}

function LayoutSkeleton() {
  return (
    <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
    </div>
  );
}
