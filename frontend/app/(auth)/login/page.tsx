import { Suspense } from 'react';
import type { Metadata } from 'next';
import { Blockwork } from '@/components/shared/blockwork';
import { Logo } from '@/components/shared/logo';
import { Skeleton } from '@/components/ui/skeleton';
import { LoginForm } from '@/features/auth/components/login-form';

export const metadata: Metadata = {
  title: 'Sign in',
};

/**
 * Login page.
 *
 * Two surfaces. The brand panel is a deep green field textured with the
 * product Greenstone actually makes — hollow blocks in running bond — and the
 * form sits on the ordinary application surface.
 *
 * Mobile keeps the brand panel as a compact band rather than dropping it, so a
 * phone still opens on something recognisable instead of a bare white form.
 */
export default function LoginPage() {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[1.05fr_1fr]">
      <BrandPanel />

      <main className="flex flex-col px-6 py-10 sm:px-10 lg:min-h-dvh lg:py-12">
        {/* Desktop keeps the mark on the form side too, so the panel reads as
            one page rather than two unrelated halves. */}
        <div className="hidden lg:block">
          <Logo />
        </div>

        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-[22rem] py-10 lg:py-0">
            <div className="mb-8 space-y-2">
              <h1 className="font-heading text-[1.75rem] leading-none font-extrabold tracking-tight">
                Sign in
              </h1>
              <p className="text-muted-foreground text-[0.9375rem]">
                Use the details your administrator gave you.
              </p>
            </div>

            {/* useSearchParams needs a Suspense boundary while prerendering. */}
            <Suspense fallback={<Skeleton className="h-[19rem] w-full rounded-lg" />}>
              <LoginForm />
            </Suspense>
          </div>
        </div>

        <p className="text-muted-foreground/70 hidden text-xs lg:block">
          Greenstone Construction Company Limited
        </p>
      </main>
    </div>
  );
}

/**
 * The brand surface.
 *
 * Always deep green, in both themes — it is a brand surface, not a themed one.
 */
function BrandPanel() {
  return (
    <section className="bg-brand-900 relative isolate overflow-hidden text-white">
      {/*
       * The masonry is masked so it is densest behind the heading and fades
       * out toward the edges, which keeps it as texture rather than wallpaper.
       */}
      <div
        className="text-brand-500/45 pointer-events-none absolute inset-0 -z-10"
        style={{
          maskImage: 'radial-gradient(115% 85% at 12% 42%, black 8%, transparent 72%)',
          WebkitMaskImage: 'radial-gradient(115% 85% at 12% 42%, black 8%, transparent 72%)',
        }}
      >
        <Blockwork />
      </div>

      {/* Compact band on phones */}
      <div className="flex items-center gap-3 px-6 py-6 lg:hidden">
        <Logo tone="inherit" />
      </div>

      {/* Full panel from lg up */}
      <div className="hidden h-full flex-col justify-between p-12 lg:flex xl:p-16">
        <p className="text-brand-100/60 text-[0.6875rem] font-semibold tracking-[0.2em] uppercase">
          Nairobi Yard
        </p>

        <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 max-w-md space-y-5 duration-700">
          <h2 className="font-heading text-[2.75rem] leading-[1.05] font-extrabold tracking-tight text-balance xl:text-[3.25rem]">
            Everything the yard runs on.
          </h2>
          <p className="text-brand-100/80 text-lg leading-relaxed text-pretty">
            Orders, production, curing, stock, deliveries and payments — recorded once, in one
            place.
          </p>
        </div>

        <p className="text-brand-100/50 text-xs">
          Greenstone Construction Company Limited · Nairobi
        </p>
      </div>
    </section>
  );
}
