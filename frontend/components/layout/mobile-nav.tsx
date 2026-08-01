'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Logo } from '@/components/shared/logo';
import type { CurrentUser } from '@/lib/permissions';
import { NavList } from './nav-list';

/**
 * Mobile navigation drawer.
 *
 * Shown below `lg`. Closes itself after a link is followed, which is what a
 * user expects on a phone.
 */
export function MobileNav({ user }: { user: CurrentUser | null }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
            <Menu className="size-5" aria-hidden />
          </Button>
        }
      />

      <SheetContent side="left" className="bg-sidebar w-[17rem] p-0">
        <SheetTitle className="sr-only">Main menu</SheetTitle>

        <div className="border-sidebar-border flex h-16 items-center border-b px-5">
          <Link
            href="/"
            onClick={() => {
              setOpen(false);
            }}
          >
            <Logo />
          </Link>
        </div>

        <div className="overflow-y-auto px-3 py-5">
          <NavList
            user={user}
            onNavigate={() => {
              setOpen(false);
            }}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
