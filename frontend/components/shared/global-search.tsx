'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { visibleNavGroups } from '@/components/layout/nav-items';
import type { CurrentUser } from '@/lib/permissions';

/**
 * Jump-to-page search, opened with the header button, `/`, or `⌘K`.
 *
 * Scoped to navigation for now — it only jumps to pages that exist. Searching
 * business records (a specific customer, a specific product) belongs here
 * later, once there is more than two modules' worth of records to jump to.
 */
export function GlobalSearch({ user }: { user: CurrentUser | null }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const groups = visibleNavGroups(user)
    .map((group) => ({ ...group, items: group.items.filter((item) => item.available) }))
    .filter((group) => group.items.length > 0);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;

      if ((event.key === 'k' && (event.metaKey || event.ctrlKey)) || (event.key === '/' && !isTyping)) {
        event.preventDefault();
        setOpen((value) => !value);
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <>
      <Button
        variant="outline"
        className="text-muted-foreground hidden h-9 w-64 justify-start gap-2 px-3 font-normal sm:flex"
        onClick={() => {
          setOpen(true);
        }}
      >
        <Search className="size-4" aria-hidden />
        Search
        <kbd className="bg-muted ml-auto rounded-md border px-1.5 py-0.5 text-[0.6875rem] font-medium">
          ⌘K
        </kbd>
      </Button>

      <Button
        variant="ghost"
        size="icon"
        aria-label="Search"
        className="sm:hidden"
        onClick={() => {
          setOpen(true);
        }}
      >
        <Search className="size-5" aria-hidden />
      </Button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Jump to a page"
        description="Search Greenstone pages"
      >
        <CommandInput placeholder="Jump to a page…" />
        <CommandList>
          <CommandEmpty>Nothing found.</CommandEmpty>
          {groups.map((group) => (
            <CommandGroup key={group.label} heading={group.label}>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <CommandItem
                    key={item.href}
                    value={item.label}
                    onSelect={() => {
                      go(item.href);
                    }}
                  >
                    <Icon className="size-4" aria-hidden />
                    {item.label}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
