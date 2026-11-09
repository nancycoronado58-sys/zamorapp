-- Switch currency system from PEN (Peruvian Sol) to VES (Venezuelan Bolívar / REF.)
-- REF. 23 means $23 — prices are stored in USD-equivalent base units.

-- First drop the old constraint so we can update rows freely
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_preferred_currency_check;

-- Migrate existing rows from PEN to VES
UPDATE public.profiles SET preferred_currency = 'VES' WHERE preferred_currency = 'PEN';

-- Set new default and add updated constraint
ALTER TABLE public.profiles
  ALTER COLUMN preferred_currency SET DEFAULT 'VES';

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_preferred_currency_check
  CHECK (preferred_currency IN ('VES','USD','EUR'));

-- Orders currency column
UPDATE public.orders SET currency = 'VES' WHERE currency = 'PEN';
ALTER TABLE public.orders
  ALTER COLUMN currency SET DEFAULT 'VES';
