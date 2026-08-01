'use client';

import Link from 'next/link';
import { Logo } from '@/components/shared/logo';
import type { CurrentUser } from '@/lib/permissions';
import { NavList } from './nav-list';

/**
 * Desktop sidebar.
 *
 * Hidden below `lg`, where the mobile drawer takes over.
 */
export function AppSidebar({ user }: { user: CurrentUser | null }) {
  return (
    <aside className="bg-sidebar border-sidebar-border hidden w-64 shrink-0 border-r lg:flex lg:flex-col">
      <div className="border-sidebar-border flex h-16 items-center border-b px-5">
        <Link href="/" className="focus-visible:ring-ring rounded-md focus-visible:ring-2">
          <Logo />
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-5">
        <NavList user={user} />
      </div>
    </aside>
  );
}
