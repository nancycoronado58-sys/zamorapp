/*
# Add user approval moderation

1. Purpose
- Adds a server-managed approval state to user profiles.
- Existing users are preserved as approved so current accounts continue working.
- New profiles default to pending and can be reviewed by an administrator.

2. Modified tables
- `profiles.approval_status`: pending, approved, or rejected.

3. Security
- Regular authenticated users may update only their personal profile fields.
- Approval status cannot be changed directly from the browser.
- Administrators use the protected `set_profile_approval` function.

4. Important notes
- No existing rows are deleted or renamed.
- The existing administrator remains approved.
*/

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'pending';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_approval_status_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_approval_status_check
      CHECK (approval_status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

UPDATE public.profiles
SET approval_status = 'approved'
WHERE approval_status = 'pending';

ALTER TABLE public.profiles
  ALTER COLUMN approval_status SET DEFAULT 'pending';

REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (display_name, phone, avatar_url, preferred_language, preferred_currency)
  ON public.profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.set_profile_approval(
  p_profile_id uuid,
  p_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_status NOT IN ('pending', 'approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid approval status';
  END IF;

  UPDATE public.profiles
  SET approval_status = p_status
  WHERE id = p_profile_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_profile_approval(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_profile_approval(uuid, text) TO authenticated;
