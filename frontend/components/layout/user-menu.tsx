'use client';

import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { signOut } from '@/lib/auth-client';
import { clearCsrfToken } from '@/lib/api-client';
import { LOGIN_PATH } from '@/lib/config';
import { roleLabel, type CurrentUser } from '@/lib/permissions';

export function UserMenu({ user }: { user: CurrentUser }) {
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);

    try {
      await signOut();
    } catch {
      // Even if the call fails, the safest thing is still to leave the
      // application, so the user is not left on a screen that looks signed in.
      toast.error('Sign out did not complete cleanly. Returning to the login page.');
    } finally {
      clearCsrfToken();
      // A full navigation clears every cached query from the old session.
      window.location.assign(LOGIN_PATH);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" className="h-11 gap-2.5 px-2" aria-label="Account menu">
            <Avatar className="size-8">
              <AvatarFallback className="bg-brand-50 text-brand-600 text-xs font-semibold dark:bg-brand-900 dark:text-brand-100">
                {initials(user.name)}
              </AvatarFallback>
            </Avatar>
            <span className="hidden text-left leading-tight sm:block">
              <span className="block text-sm font-medium">{user.name}</span>
              <span className="text-muted-foreground block text-xs">{roleLabel(user.role)}</span>
            </span>
          </Button>
        }
      />

      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <span className="block text-sm font-medium">{user.name}</span>
          <span className="text-muted-foreground block truncate text-xs">{user.email}</span>
          <span className="text-muted-foreground mt-1 block text-xs">{roleLabel(user.role)}</span>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          variant="destructive"
          disabled={signingOut}
          onClick={() => {
            void handleSignOut();
          }}
        >
          <LogOut className="size-4" aria-hidden />
          {signingOut ? 'Signing out…' : 'Sign out'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}
