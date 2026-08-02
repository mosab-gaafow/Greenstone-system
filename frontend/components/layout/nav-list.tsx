'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CurrentUser } from '@/lib/permissions';
import { visibleNavGroups, type NavItem } from './nav-items';

interface NavListProps {
  user: CurrentUser | null;
  /** Called after a link is followed, so the mobile drawer can close itself. */
  onNavigate?: () => void;
  /** Icon-only rail — labels and group headings are hidden. */
  collapsed?: boolean;
}

/**
 * The navigation list, shared by the desktop sidebar and the mobile drawer, so
 * there is only one place where navigation is defined.
 */
export function NavList({ user, onNavigate, collapsed = false }: NavListProps) {
  const pathname = usePathname();
  const groups = visibleNavGroups(user);

  return (
    <nav className="flex flex-col gap-6" aria-label="Main">
      {groups.map((group) => (
        <div key={group.label} className="space-y-1">
          {!collapsed && (
            <p className="text-muted-foreground px-3 text-xs font-semibold tracking-wide uppercase">
              {group.label}
            </p>
          )}
          <ul className="space-y-0.5">
            {group.items.map((item) => (
              <li key={item.label}>
                <NavEntry
                  item={item}
                  isActive={isActive(pathname, item.href)}
                  collapsed={collapsed}
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
  collapsed,
}: {
  item: NavItem;
  isActive: boolean;
  onNavigate?: () => void;
  collapsed: boolean;
}) {
  const Icon = item.icon;

  const base = cn(
    'relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
    'min-h-11 sm:min-h-0 sm:py-2',
    collapsed && 'justify-center px-0',
  );

  // Modules that have not been built yet are shown but not clickable, so the
  // shape of the system is visible without offering links that lead nowhere.
  // Kept quiet — a muted label is enough; repeating "Soon" on every row reads
  // as noise once there are several of them.
  if (!item.available) {
    return (
      <span
        className={cn(base, 'group/soon text-muted-foreground/50 cursor-not-allowed')}
        aria-disabled="true"
        title="Coming in a later phase"
      >
        <Icon className="size-4 shrink-0" aria-hidden />
        {!collapsed && <span className="truncate">{item.label}</span>}
        {!collapsed && (
          <Lock
            className="ml-auto size-3 shrink-0 opacity-0 transition-opacity group-hover/soon:opacity-100"
            aria-hidden
          />
        )}
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={isActive ? 'page' : undefined}
      title={collapsed ? item.label : undefined}
      className={cn(
        base,
        isActive
          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
          : 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
      )}
    >
      {/* The signature active-state rail, reused for the active nav item, the
          active tab, and the focused table row — one recurring marker rather
          than a different treatment in every place. */}
      {isActive && (
        <span
          aria-hidden
          className="bg-sidebar-primary absolute inset-y-1.5 left-0 w-[3px] rounded-full"
        />
      )}
      <Icon className="size-4 shrink-0" aria-hidden />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );
}

function isActive(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}
