/*
# Restrict advertising purchase grants

1. Security Changes
- Remove inherited anonymous and broad authenticated table privileges from `advertisement_purchases`.
- Grant authenticated users only the read and form fields needed for their own advertising request.
- Keep row-level policies responsible for ownership and administrator visibility.

2. Important Notes
- Anonymous visitors cannot read, create, update, or delete advertising purchase records.
- The fixed amount, buyer identity, status, and activation dates remain outside browser-controlled write columns.
*/

REVOKE ALL ON public.advertisement_purchases FROM anon, authenticated;

GRANT SELECT ON public.advertisement_purchases TO authenticated;
GRANT INSERT (business_name, business_description, website_url, currency, payment_method, payment_receipt_url) ON public.advertisement_purchases TO authenticated;
GRANT UPDATE (business_name, business_description, website_url, currency, payment_method, payment_receipt_url) ON public.advertisement_purchases TO authenticated;
