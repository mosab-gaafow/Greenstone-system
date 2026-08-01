import { cn } from '@/lib/utils';

/**
 * Greenstone mark.
 *
 * Inlined rather than loaded as an image so it inherits `currentColor` and
 * stays crisp at any size. Taken from `public/brand/greenstone-symbol.svg`.
 *
 * Colour comes from the parent. That matters because the mark sits on a light
 * surface in the application and on the deep green panel on the login screen.
 */
export function GreenstoneSymbol({ className }: { className?: string }) {
  return (
    <svg
      viewBox="-20 0 120 100"
      className={cn('h-8 w-auto', className)}
      role="img"
      aria-label="Greenstone"
    >
      <path
        d="M25.54 73.62 A34 34 0 0 1 68.02 21.17"
        fill="none"
        stroke="currentColor"
        strokeWidth="15"
      />
      <path
        d="M50 50 H84 A34 34 0 0 1 28.14 76.04"
        fill="none"
        stroke="currentColor"
        strokeWidth="15"
        strokeLinejoin="round"
      />
      <path
        d="M-14 61 H4 M-8 71 H9 M-14 81 H16"
        fill="none"
        stroke="currentColor"
        strokeWidth="5.5"
        opacity="0.65"
      />
    </svg>
  );
}

interface LogoProps {
  className?: string;
  /** Hides the wordmark, leaving only the mark. */
  symbolOnly?: boolean;
  /**
   * `brand` tints the mark green for light surfaces.
   * `inherit` lets it take the surrounding colour, for dark panels.
   */
  tone?: 'brand' | 'inherit';
}

export function Logo({ className, symbolOnly = false, tone = 'brand' }: LogoProps) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <GreenstoneSymbol
        className={cn(
          'h-7 w-auto shrink-0',
          tone === 'brand' && 'text-brand-600 dark:text-brand-100',
        )}
      />
      {!symbolOnly && (
        <span className="flex flex-col leading-none">
          <span className="font-heading text-[0.9375rem] font-extrabold tracking-tight">
            Greenstone
          </span>
          <span className="text-[0.6875rem] font-medium tracking-wide opacity-70">
            Management System
          </span>
        </span>
      )}
    </span>
  );
}
