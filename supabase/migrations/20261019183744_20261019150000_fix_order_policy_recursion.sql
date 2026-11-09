/*
# Fix recursive order access policies

1. Purpose
- Fixes the "infinite recursion detected in policy for relation orders" error that prevents customers from confirming orders, especially when the order response is returned after uploading a payment receipt.

2. Security changes
- Adds a server-side SECURITY DEFINER helper that checks whether the signed-in user may access a specific order.
- The helper uses the authenticated session identity (`auth.uid()`), has a fixed `search_path`, and is callable only by signed-in users.
- Replaces the circular `orders` and `order_items` SELECT/INSERT/UPDATE policy predicates with the helper.
- Keeps customer, dropper, business-owner, and admin access boundaries unchanged.

3. Important notes
- No tables, columns, or user data are deleted or changed.
- The client can continue creating an order and then inserting its line items.
*/

CREATE OR REPLACE FUNCTION public.can_access_order(p_order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = p_order_id
      AND (
        o.customer_id = auth.uid()
        OR o.dropper_id = auth.uid()
        OR public.is_admin()
        OR EXISTS (
          SELECT 1
          FROM public.order_items oi
          JOIN public.products p ON p.id = oi.product_id
          JOIN public.businesses b ON b.id = p.business_id
          WHERE oi.order_id = o.id
            AND b.owner_id = auth.uid()
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.can_access_order(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_order(uuid) TO authenticated;

DROP POLICY IF EXISTS "orders_read_stakeholders" ON public.orders;
CREATE POLICY "orders_read_stakeholders" ON public.orders
  FOR SELECT TO authenticated
  USING (public.can_access_order(id));

DROP POLICY IF EXISTS "orders_update_stakeholders" ON public.orders;
CREATE POLICY "orders_update_stakeholders" ON public.orders
  FOR UPDATE TO authenticated
  USING (public.can_access_order(id))
  WITH CHECK (public.can_access_order(id));

DROP POLICY IF EXISTS "order_items_read_stakeholders" ON public.order_items;
CREATE POLICY "order_items_read_stakeholders" ON public.order_items
  FOR SELECT TO authenticated
  USING (public.can_access_order(order_id));

DROP POLICY IF EXISTS "order_items_insert_customer" ON public.order_items;
CREATE POLICY "order_items_insert_customer" ON public.order_items
  FOR INSERT TO authenticated
  WITH CHECK (public.can_access_order(order_id));
