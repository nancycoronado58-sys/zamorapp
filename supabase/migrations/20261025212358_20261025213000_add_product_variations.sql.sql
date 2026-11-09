/*
# Add product variation choices

1. Modified Tables
- `products`
- Add `variants` JSON data containing option groups such as Talla, Color, RAM, and Almacenamiento.
- Each group stores a name and values; each value can include a price adjustment.
- Existing products receive an empty list and keep their current behavior.

- `order_items`
- Add `selected_options` JSON data containing the exact choices selected by the buyer.
- Existing order items receive an empty selection.

2. Security
- Keep the existing product and order-item RLS policies in place.
- Variation choices are public product information.
- Selected options are stored with the buyer's order and follow the existing order-item access rules.

3. Important Notes
- This change is additive and does not remove or rename existing data.
- The product base price remains unchanged; each variation can add a controlled price adjustment.
*/

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS variants jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS selected_options jsonb NOT NULL DEFAULT '{}'::jsonb;
