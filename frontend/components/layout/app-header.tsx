'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import type { CurrentUser } from '@/lib/permissions';
import { MobileNav } from './mobile-nav';
import { UserMenu } from './user-menu';

interface AppHeaderProps {
  user: CurrentUser | null;
  isLoading: boolean;
}

/**
 * Application header.
 *
 * Sticky, so the menu button stays reachable while scrolling a long page on a
 * phone.
 */
export function AppHeader({ user, isLoading }: AppHeaderProps) {
  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-40 flex h-16 items-center gap-2 border-b px-4 backdrop-blur sm:px-6">
      <MobileNav user={user} />

      <div className="flex-1" />

      <ThemeToggle />

      {isLoading ? <Skeleton className="h-8 w-8 rounded-full" /> : user && <UserMenu user={user} />}
    </header>
  );
}
