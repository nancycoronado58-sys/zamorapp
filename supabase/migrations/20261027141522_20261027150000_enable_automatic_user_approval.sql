/*
# Enable automatic approval for new accounts

1. Purpose
- Make every newly created user immediately usable after authentication.
- Remove the approval gate that currently prevents newly registered users from entering the app.

2. Modified table
- `public.profiles.approval_status`: existing pending profiles are changed to approved, and the default for future profiles becomes approved.

3. Modified function
- `public.handle_new_user()`: explicitly writes `approval_status = 'approved'` when the auth trigger creates a profile.

4. Security
- No role, password, or administrator permissions are changed.
- The existing profile ownership policies and administrator-only moderation function remain unchanged.
- The profile trigger remains `SECURITY DEFINER` with a fixed `search_path`.

5. Important notes
1. Existing profile rows are preserved; only their approval status changes from pending to approved.
2. Password recovery and email confirmation are separate from profile approval and continue to use Supabase Auth.
*/

UPDATE public.profiles
SET approval_status = 'approved'
WHERE approval_status = 'pending';

ALTER TABLE public.profiles
  ALTER COLUMN approval_status SET DEFAULT 'approved';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, role, approval_status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer'),
    'approved'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
