BEGIN;

DROP POLICY IF EXISTS announcements_admin_select ON public.announcements;
DROP POLICY IF EXISTS announcements_admin_insert ON public.announcements;
DROP POLICY IF EXISTS announcements_admin_update ON public.announcements;
DROP POLICY IF EXISTS announcements_admin_delete ON public.announcements;

CREATE POLICY announcements_admin_select
ON public.announcements
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.users
    WHERE public.users.id = auth.uid()
      AND public.users.is_admin = true
  )
);

CREATE POLICY announcements_admin_insert
ON public.announcements
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.users
    WHERE public.users.id = auth.uid()
      AND public.users.is_admin = true
  )
);

CREATE POLICY announcements_admin_update
ON public.announcements
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.users
    WHERE public.users.id = auth.uid()
      AND public.users.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.users
    WHERE public.users.id = auth.uid()
      AND public.users.is_admin = true
  )
);

CREATE POLICY announcements_admin_delete
ON public.announcements
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.users
    WHERE public.users.id = auth.uid()
      AND public.users.is_admin = true
  )
);

COMMIT;
