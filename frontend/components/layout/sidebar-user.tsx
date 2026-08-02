'use client';

import { ChevronsUpDown } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { roleLabel, type CurrentUser } from '@/lib/permissions';
import { UserMenuContent, initials } from './user-menu';

/**
 * Identity block pinned at the bottom of the desktop sidebar, above the
 * collapse toggle — opens the same sign-out menu as the header's user button,
 * via the shared `UserMenuContent`.
 */
export function SidebarUser({ user, collapsed }: { user: CurrentUser; collapsed: boolean }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label="Account menu"
            className="hover:bg-sidebar-accent focus-visible:ring-ring flex w-full items-center gap-2.5 rounded-lg p-2 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            <Avatar className="size-8 shrink-0">
              <AvatarFallback className="bg-accent text-accent-foreground text-xs font-semibold">
                {initials(user.name)}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <>
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block truncate text-sm font-medium">{user.name}</span>
                  <span className="text-muted-foreground block truncate text-xs">
                    {roleLabel(user.role)}
                  </span>
                </span>
                <ChevronsUpDown className="text-muted-foreground size-4 shrink-0" aria-hidden />
              </>
            )}
          </button>
        }
      />

      <UserMenuContent user={user} />
    </DropdownMenu>
  );
}
