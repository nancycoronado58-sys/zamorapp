/*
# Pre-approve stores by default

1. Changes
- The default status for new businesses (stores) changes from `pending` to `approved`, so stores appear in the app as soon as they are registered.
- Any store currently waiting in `pending` is set to `approved`.

2. Security
- No policy, grant or RLS change. Admins can still suspend or reject a store later from the admin panel.

3. Notes
- Users and products were already auto-approved by existing triggers and are not changed here.
- Running this migration again is safe: the default is simply set again and the update matches nothing new.
*/

ALTER TABLE businesses ALTER COLUMN status SET DEFAULT 'approved';

UPDATE businesses SET status = 'approved' WHERE status = 'pending';
