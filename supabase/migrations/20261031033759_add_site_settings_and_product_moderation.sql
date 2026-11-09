/*
# Site settings and automatic product moderation

## Summary
Adds a managed configuration table for contact details and system parameters, a list of prohibited terms, and an automatic moderation step for products. Products are published automatically unless their name or description contains a prohibited term.

## 1. New tables
- `site_settings`: key/value configuration (business name, phones, WhatsApp, contact email, admin email, office address, and whether products publish automatically). Seeded with the current contact details.
- `moderation_blocked_terms`: words or phrases that block a product from being published. Managed only by administrators.

## 2. Modified tables
- `products`: new `moderation_status` (`pending`, `approved` or `rejected`, default `approved`) and `moderation_note` columns.

## 3. Automatic moderation
- On create or content change by a business owner, the product name and description are checked against the blocked terms.
- A match sets the product to `rejected` with the matched term as the note.
- No match publishes the product when `auto_publish_products` is `true`; otherwise it is set to `pending` for manual review.
- Business owners cannot change the moderation status directly.
- Administrators can set the status manually and their changes are not overridden.

## 4. Security
- `site_settings`: anyone can read (public contact data); only administrators can update existing keys.
- `moderation_blocked_terms`: only administrators can read, add or remove terms.
- Public product visibility now requires `approved` status and an approved business. Owners and administrators still see all their products.
- The moderation trigger function is not callable by app users.

## Important notes
1. Matching is case-insensitive substring matching, so administrators should keep the term list specific to avoid false positives.
2. Existing products are backfilled before the trigger is created, so they are checked once against the term list.
*/

CREATE TABLE IF NOT EXISTS site_settings (
  key text PRIMARY KEY,
  value text NOT NULL DEFAULT '',
  label text NOT NULL DEFAULT '',
  group_name text NOT NULL DEFAULT 'contact',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON site_settings TO anon, authenticated;
GRANT UPDATE ON site_settings TO authenticated;

DROP POLICY IF EXISTS "site_settings_read_public" ON site_settings;
CREATE POLICY "site_settings_read_public" ON site_settings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "site_settings_update_admin" ON site_settings;
CREATE POLICY "site_settings_update_admin" ON site_settings FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());

INSERT INTO site_settings (key, value, label, group_name) VALUES
  ('business_name', 'Zamorapp', 'Nombre de la plataforma', 'contact'),
  ('contact_phone', '+584242580390', 'Teléfono (formato internacional)', 'contact'),
  ('contact_phone_display', '+58 424 258 0390', 'Teléfono (texto visible)', 'contact'),
  ('whatsapp_number', '584242580390', 'WhatsApp (solo números)', 'contact'),
  ('contact_email', 'info@zamorapp.com', 'Correo de contacto público', 'contact'),
  ('admin_email', 'admin@zamorapp.com', 'Correo que recibe las alertas de moderación', 'contact'),
  ('office_address', '', 'Dirección de oficina', 'contact'),
  ('auto_publish_products', 'true', 'Publicar productos automáticamente si pasan el filtro', 'system')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS moderation_blocked_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  term text NOT NULL UNIQUE CHECK (term = lower(term) AND length(trim(term)) > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE moderation_blocked_terms ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, DELETE ON moderation_blocked_terms TO authenticated;

DROP POLICY IF EXISTS "blocked_terms_select_admin" ON moderation_blocked_terms;
CREATE POLICY "blocked_terms_select_admin" ON moderation_blocked_terms FOR SELECT
  TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "blocked_terms_insert_admin" ON moderation_blocked_terms;
CREATE POLICY "blocked_terms_insert_admin" ON moderation_blocked_terms FOR INSERT
  TO authenticated WITH CHECK (is_admin());

DROP POLICY IF EXISTS "blocked_terms_delete_admin" ON moderation_blocked_terms;
CREATE POLICY "blocked_terms_delete_admin" ON moderation_blocked_terms FOR DELETE
  TO authenticated USING (is_admin());

INSERT INTO moderation_blocked_terms (term) VALUES
  ('cocaína'), ('marihuana'), ('arma de fuego'), ('pistola'), ('falsificado'), ('contrabando')
ON CONFLICT (term) DO NOTHING;

ALTER TABLE products ADD COLUMN IF NOT EXISTS moderation_status text NOT NULL DEFAULT 'approved';
ALTER TABLE products ADD COLUMN IF NOT EXISTS moderation_note text NOT NULL DEFAULT '';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_moderation_status_check'
  ) THEN
    ALTER TABLE products ADD CONSTRAINT products_moderation_status_check
      CHECK (moderation_status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

UPDATE products p
SET moderation_status = 'rejected',
    moderation_note = 'Contiene un término prohibido: ' || t.term
FROM (
  SELECT DISTINCT ON (p2.id) p2.id AS product_id, b.term
  FROM products p2
  JOIN moderation_blocked_terms b
    ON position(b.term IN lower(coalesce(p2.name, '') || ' ' || coalesce(p2.description, ''))) > 0
) t
WHERE p.id = t.product_id;

CREATE OR REPLACE FUNCTION moderate_product()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  haystack text;
  matched_term text;
  auto_publish boolean;
BEGIN
  IF is_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE'
     AND NEW.name IS NOT DISTINCT FROM OLD.name
     AND NEW.description IS NOT DISTINCT FROM OLD.description
     AND NEW.image_url IS NOT DISTINCT FROM OLD.image_url THEN
    NEW.moderation_status := OLD.moderation_status;
    NEW.moderation_note := OLD.moderation_note;
    RETURN NEW;
  END IF;

  haystack := lower(coalesce(NEW.name, '') || ' ' || coalesce(NEW.description, ''));

  SELECT term INTO matched_term
  FROM moderation_blocked_terms
  WHERE position(term IN haystack) > 0
  LIMIT 1;

  SELECT value = 'true' INTO auto_publish
  FROM site_settings
  WHERE key = 'auto_publish_products';

  IF matched_term IS NOT NULL THEN
    NEW.moderation_status := 'rejected';
    NEW.moderation_note := 'Contiene un término prohibido: ' || matched_term;
  ELSIF coalesce(auto_publish, true) THEN
    NEW.moderation_status := 'approved';
    NEW.moderation_note := '';
  ELSE
    NEW.moderation_status := 'pending';
    NEW.moderation_note := 'Pendiente de revisión manual';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION moderate_product() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS products_moderate ON products;
CREATE TRIGGER products_moderate
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION moderate_product();

DROP POLICY IF EXISTS "products_read_public" ON products;
CREATE POLICY "products_read_public" ON products FOR SELECT
  TO anon, authenticated
  USING (
    (
      products.moderation_status = 'approved'
      AND EXISTS (
        SELECT 1 FROM businesses b
        WHERE b.id = products.business_id AND b.status = 'approved'
      )
    )
    OR EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = products.business_id AND (b.owner_id = auth.uid() OR is_admin())
    )
  );
