'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageContainer } from '@/components/layout/page-container';
import { useCurrentUser } from '@/features/auth/hooks/use-current-user';
import { roleLabel } from '@/lib/permissions';

/**
 * Home page.
 *
 * Deliberately contains no business data. The dashboard with real figures is
 * built in Phase 11, and the modules it summarises do not exist yet.
 */
export default function HomePage() {
  const { user } = useCurrentUser();

  return (
    <PageContainer
      title={user ? `Welcome, ${user.name.split(' ')[0]}` : 'Welcome'}
      description="The Greenstone Management System."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Name" value={user?.name ?? '—'} />
            <Row label="Email" value={user?.email ?? '—'} />
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Role</span>
              {user && <Badge variant="secondary">{roleLabel(user.role)}</Badge>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Getting started</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-2 text-sm">
            <p>
              Sign-in, user accounts, roles and permissions are ready. The business modules are
              added one phase at a time.
            </p>
            <p>
              Items marked <span className="font-medium">Soon</span> in the menu are not built yet.
            </p>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate font-medium">{value}</span>
    </div>
  );
}
