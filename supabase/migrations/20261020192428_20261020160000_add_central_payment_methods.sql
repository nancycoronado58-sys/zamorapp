/*
# Add centralized checkout payment methods

1. Purpose
- Adds the payment methods requested for the production checkout: Pago Móvil, bank transfer, Binance, and cash on delivery.

2. Modified data
- Updates `orders.payment_method` validation to allow `pago_movil`, `bank_transfer`, `binance`, and `cod`.
- Existing orders and payment receipts are preserved.

3. Security and operations
- All non-cash orders continue to require a payment receipt before submission.
- Payment verification remains under the SuperAdmin workflow.

4. Important notes
- The payment details shown to customers are configured in the checkout interface from the account information supplied by the platform owner.
- No tables, columns, policies, or user data are deleted.
*/

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_payment_method_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_payment_method_check
  CHECK (payment_method IN ('pago_movil', 'bank_transfer', 'binance', 'cod'));
