import { getSession } from '@/lib/auth';
import { loadCurrentUserProfileBundle } from '@/lib/user/profile';

export type AdminClientAccessState = {
  loading: boolean;
  isAuthed: boolean;
  isAdmin: boolean;
};

export const UNAUTHED_ADMIN_ACCESS_STATE: AdminClientAccessState = {
  loading: false,
  isAuthed: false,
  isAdmin: false,
};

export async function loadAdminClientAccessState(): Promise<AdminClientAccessState> {
  const session = await getSession();
  if (!session?.user) {
    return UNAUTHED_ADMIN_ACCESS_STATE;
  }

  const bundle = await loadCurrentUserProfileBundle();
  return {
    loading: false,
    isAuthed: true,
    isAdmin: !!bundle?.profile?.is_admin,
  };
}
