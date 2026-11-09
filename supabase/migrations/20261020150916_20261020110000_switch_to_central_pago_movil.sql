/*
# Switch checkout to centralized Pago Móvil

1. Purpose
- Replaces Yape, cards, and bank transfer as customer-facing checkout options with Pago Móvil to a single central Zamorapp account.

2. Modified data
- Updates the `orders.payment_method` validation to allow only `cod` (cash on delivery) and `pago_movil` (centralized Pago Móvil).
- Existing orders are preserved; this project currently has no existing orders using the removed methods.

3. Security and operations
- Payment receipts continue to be stored with the order and reviewed by the SuperAdmin before payment verification.
- Store owners do not receive customer payments directly in this flow; Zamorapp can reconcile and pay establishments from the central account.

4. Important notes
- The actual Pago Móvil phone, identity number, and bank details must be supplied by the platform owner before publishing the checkout as a live payment flow.
- No tables, columns, policies, or user data are deleted.
*/

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_payment_method_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_payment_method_check
  CHECK (payment_method IN ('cod', 'pago_movil'));
