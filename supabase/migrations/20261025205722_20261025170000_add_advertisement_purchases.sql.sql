/*
# Add weekly advertisement purchases

1. New Tables
- `advertisement_purchases`
- `id`: unique purchase identifier.
- `buyer_id`: signed-in account that requested the advertising slot; filled from the active session.
- `business_name`: business name shown in the advertising request.
- `business_description`: short description for the advertising request.
- `website_url`: optional destination for the advertisement.
- `amount`: fixed weekly package price in USD-equivalent units.
- `currency`: display currency selected by the buyer.
- `payment_method`: existing manual payment method used by checkout.
- `payment_receipt_url`: uploaded payment receipt.
- `status`: payment and moderation state.
- `starts_at`, `expires_at`, `created_at`, `updated_at`: lifecycle timestamps.

2. Security
- Enable RLS on `advertisement_purchases`.
- Signed-in buyers can read and edit only their own request details and receipt.
- Administrators can read all advertising requests.
- The browser cannot set the buyer, amount, status, or activation timestamps.
- Grant only the columns needed by the public checkout form.

3. Important Notes
- This table uses the existing manual payment flow and does not add Stripe.
- The weekly price is fixed server-side at 9.90 USD-equivalent units.
- Activation and expiration remain an administrator-controlled step until payment is verified.
*/

CREATE TABLE IF NOT EXISTS public.advertisement_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_name text NOT NULL CHECK (char_length(business_name) BETWEEN 2 AND 120),
  business_description text NOT NULL DEFAULT '' CHECK (char_length(business_description) <= 500),
  website_url text NOT NULL DEFAULT '' CHECK (char_length(website_url) <= 500),
  amount numeric(10,2) NOT NULL DEFAULT 9.90 CHECK (amount = 9.90),
  currency text NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD', 'EUR', 'VES')),
  payment_method text NOT NULL DEFAULT 'pago_movil' CHECK (payment_method IN ('pago_movil', 'bank_transfer', 'binance', 'cod')),
  payment_receipt_url text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending_payment' CHECK (status IN ('pending_payment', 'payment_verified', 'active', 'rejected', 'expired')),
  starts_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.advertisement_purchases ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.advertisement_purchases TO authenticated;
GRANT INSERT (business_name, business_description, website_url, currency, payment_method, payment_receipt_url) ON public.advertisement_purchases TO authenticated;
GRANT UPDATE (business_name, business_description, website_url, currency, payment_method, payment_receipt_url) ON public.advertisement_purchases TO authenticated;

DROP POLICY IF EXISTS "advertisement_select_own_or_admin" ON public.advertisement_purchases;
CREATE POLICY "advertisement_select_own_or_admin"
ON public.advertisement_purchases FOR SELECT
TO authenticated
USING (buyer_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "advertisement_insert_own" ON public.advertisement_purchases;
CREATE POLICY "advertisement_insert_own"
ON public.advertisement_purchases FOR INSERT
TO authenticated
WITH CHECK (buyer_id = auth.uid());

DROP POLICY IF EXISTS "advertisement_update_own_details" ON public.advertisement_purchases;
CREATE POLICY "advertisement_update_own_details"
ON public.advertisement_purchases FOR UPDATE
TO authenticated
USING (buyer_id = auth.uid())
WITH CHECK (buyer_id = auth.uid());
