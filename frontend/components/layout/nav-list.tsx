'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { CurrentUser } from '@/lib/permissions';
import { visibleNavGroups, type NavItem } from './nav-items';

interface NavListProps {
  user: CurrentUser | null;
  /** Called after a link is followed, so the mobile drawer can close itself. */
  onNavigate?: () => void;
}

/**
 * The navigation list, shared by the desktop sidebar and the mobile drawer, so
 * there is only one place where navigation is defined.
 */
export function NavList({ user, onNavigate }: NavListProps) {
  const pathname = usePathname();
  const groups = visibleNavGroups(user);

  return (
    <nav className="flex flex-col gap-6" aria-label="Main">
      {groups.map((group) => (
        <div key={group.label} className="space-y-1">
          <p className="text-muted-foreground px-3 text-xs font-semibold tracking-wide uppercase">
            {group.label}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => (
              <li key={item.label}>
                <NavEntry
                  item={item}
                  isActive={isActive(pathname, item.href)}
                  {...(onNavigate ? { onNavigate } : {})}
                />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function NavEntry({
  item,
  isActive,
  onNavigate,
}: {
  item: NavItem;
  isActive: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;

  const base = cn(
    'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
    'min-h-11 sm:min-h-0 sm:py-2',
  );

  // Modules that have not been built yet are shown but not clickable, so the
  // shape of the system is visible without offering links that lead nowhere.
  if (!item.available) {
    return (
      <span
        className={cn(base, 'text-muted-foreground/60 cursor-not-allowed')}
        aria-disabled="true"
        title="Coming in a later phase"
      >
        <Icon className="size-4 shrink-0" aria-hidden />
        <span className="truncate">{item.label}</span>
        <span className="text-muted-foreground/50 ml-auto text-[0.625rem] font-normal">Soon</span>
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        base,
        isActive
          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
          : 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

function isActive(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}
