/*
# Restrict order access helper execution

1. Purpose
- Ensures the order-access helper can only be called by signed-in users.

2. Security changes
- Explicitly revokes EXECUTE from the public role and the anonymous API role.
- Keeps EXECUTE available to authenticated users, which is the only role used by the order policies.

3. Important notes
- No tables, columns, policies, or user data are deleted.
*/

REVOKE EXECUTE ON FUNCTION public.can_access_order(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_access_order(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.can_access_order(uuid) TO authenticated;
