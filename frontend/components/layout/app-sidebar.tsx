'use client';

import Link from 'next/link';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo, GreenstoneSymbol } from '@/components/shared/logo';
import { cn } from '@/lib/utils';
import type { CurrentUser } from '@/lib/permissions';
import { NavList } from './nav-list';
import { SidebarUser } from './sidebar-user';

interface AppSidebarProps {
  user: CurrentUser | null;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

/**
 * Desktop sidebar.
 *
 * Hidden below `lg`, where the mobile drawer takes over. Collapse state lives
 * in the layout, not here, because the header's own collapse toggle needs to
 * drive the same value.
 */
export function AppSidebar({ user, collapsed, onToggleCollapsed }: AppSidebarProps) {
  return (
    <aside
      className={cn(
        'bg-sidebar border-sidebar-border hidden shrink-0 flex-col border-r transition-[width] duration-200 lg:flex',
        collapsed ? 'w-[4.5rem]' : 'w-64',
      )}
    >
      <div
        className={cn(
          'border-sidebar-border flex h-16 items-center border-b',
          collapsed ? 'justify-center px-2' : 'px-5',
        )}
      >
        <Link href="/" className="focus-visible:ring-ring rounded-md focus-visible:ring-2">
          {collapsed ? (
            <GreenstoneSymbol className="text-brand-600 dark:text-brand-100 h-7 w-auto" />
          ) : (
            <Logo />
          )}
        </Link>
      </div>

      <div className="flex-1 overflow-x-hidden overflow-y-auto px-3 py-5">
        <NavList user={user} collapsed={collapsed} />
      </div>

      <div className="border-sidebar-border space-y-1 border-t p-2">
        {user && <SidebarUser user={user} collapsed={collapsed} />}

        <Button
          variant="ghost"
          size={collapsed ? 'icon' : 'default'}
          className="text-muted-foreground w-full justify-center gap-2 lg:justify-start"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <PanelLeftOpen className="size-4" aria-hidden />
          ) : (
            <>
              <PanelLeftClose className="size-4" aria-hidden />
              <span>Collapse</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}
