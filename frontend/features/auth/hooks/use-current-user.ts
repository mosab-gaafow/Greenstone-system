'use client';

import { useSession } from '@/lib/auth-client';
import { isRole, type CurrentUser } from '@/lib/permissions';

/**
 * The signed-in user, in Greenstone's shape.
 *
 * Reads Better Auth's session directly rather than keeping a second copy, so
 * there is nothing to drift out of date.
 */
export function useCurrentUser(): {
  user: CurrentUser | null;
  isLoading: boolean;
} {
  const { data, isPending } = useSession();

  if (isPending) {
    return { user: null, isLoading: true };
  }

  const sessionUser = data?.user;

  if (!sessionUser || !isRole(sessionUser.role)) {
    return { user: null, isLoading: false };
  }

  return {
    user: {
      id: sessionUser.id,
      name: sessionUser.name,
      email: sessionUser.email,
      role: sessionUser.role,
    },
    isLoading: false,
  };
}
