import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/shared/logo';

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6 text-center">
      <Logo />

      <div className="max-w-md space-y-2">
        <h1 className="font-heading text-2xl font-bold">Page not found</h1>
        <p className="text-muted-foreground text-pretty">
          The page you are looking for does not exist, or it has moved.
        </p>
      </div>

      <Button render={<Link href="/">Go to home</Link>} />
    </div>
  );
}
