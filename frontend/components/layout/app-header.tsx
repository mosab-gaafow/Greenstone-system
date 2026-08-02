'use client';

import { Bell, PanelLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { GlobalSearch } from '@/components/shared/global-search';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import type { CurrentUser } from '@/lib/permissions';
import { MobileNav } from './mobile-nav';
import { UserMenu } from './user-menu';

interface AppHeaderProps {
  user: CurrentUser | null;
  isLoading: boolean;
  onToggleSidebar: () => void;
}

/**
 * Application header.
 *
 * Sticky, so the menu button stays reachable while scrolling a long page on a
 * phone.
 */
export function AppHeader({ user, isLoading, onToggleSidebar }: AppHeaderProps) {
  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-40 flex h-16 items-center gap-2 border-b px-4 backdrop-blur sm:px-6">
      <MobileNav user={user} />

      <Button
        variant="ghost"
        size="icon"
        className="hidden lg:inline-flex"
        onClick={onToggleSidebar}
        aria-label="Toggle sidebar"
      >
        <PanelLeft className="size-5" aria-hidden />
      </Button>

      <div className="flex flex-1 justify-start">
        <GlobalSearch user={user} />
      </div>

      {/*
       * Static for now — there is no notifications module yet
       * (`docs/implementation-plan.md` Phase 11). This is UI shell only, wired
       * up once that backend exists; it must not claim unread alerts it cannot
       * back with real data.
       */}
      <Button variant="ghost" size="icon" aria-label="Notifications">
        <Bell className="size-5" aria-hidden />
      </Button>

      <ThemeToggle />

      {isLoading ? <Skeleton className="h-8 w-8 rounded-full" /> : user && <UserMenu user={user} />}
    </header>
  );
}
