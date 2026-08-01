'use client';

import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Milliseconds to wait after typing stops before searching. */
  delay?: number;
}

/**
 * Debounced search box.
 *
 * The delay matters on a phone: without it every keystroke becomes a request,
 * which is slow on a weak connection and expensive on mobile data.
 */
export function SearchInput({
  value,
  onChange,
  placeholder = 'Search',
  delay = 350,
}: SearchInputProps) {
  const [draft, setDraft] = useState(value);
  const [lastValue, setLastValue] = useState(value);

  // Keep in step when the value changes from outside, such as the back button
  // or a "clear filters" action.
  //
  // Adjusted during render rather than in an effect: React handles this without
  // a second pass, whereas setting state inside an effect causes a cascading
  // re-render.
  if (value !== lastValue) {
    setLastValue(value);
    setDraft(value);
  }

  useEffect(() => {
    if (draft === value) {
      return;
    }

    const timer = setTimeout(() => {
      onChange(draft);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [draft, delay, onChange, value]);

  return (
    <div className="relative w-full">
      <Search
        className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
        aria-hidden
      />
      <Input
        type="search"
        inputMode="search"
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value);
        }}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-11 pr-10 pl-9"
      />
      {draft && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute top-1/2 right-1 size-8 -translate-y-1/2"
          onClick={() => {
            setDraft('');
            onChange('');
          }}
          aria-label="Clear search"
        >
          <X className="size-4" aria-hidden />
        </Button>
      )}
    </div>
  );
}
