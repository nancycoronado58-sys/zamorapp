/*
# Zamorapp Core Schema — Marketplace, Directory & Local Delivery Ecosystem

1. Overview
Foundational schema for Zamorapp — a town community marketplace, business directory, jobs board, local delivery ecosystem, and emergency directory. Uses Supabase Auth with role-based access controlled via `profiles.role` and RLS policies.

2. New Tables
- profiles, categories, businesses, business_gallery, products, services, jobs, job_applications, orders, order_items, reviews, droppers, emergency_contacts, notifications, app_settings.

3. Security (RLS)
- RLS enabled on every table.
- Public SELECT on categories, approved businesses, gallery, products, services, jobs, emergency_contacts, app_settings, reviews, droppers.
- Ownership-scoped writes via auth.uid() checks.
- SECURITY DEFINER `is_admin()` checks caller's profile role.

4. Important Notes
1. Owner columns default to auth.uid() so client inserts omitting the owner still satisfy WITH CHECK.
2. reviews trigger recomputes aggregate score cache on the reviewed entity.
3. Tables are created before any policy that cross-references them (orders <-> order_items).
4. Idempotent and safe to re-run.
*/

-- ============ Step 1: Create profiles table (no policies yet) ============
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'customer'
    CHECK (role IN ('customer','business_owner','job_seeker','dropper','admin')),
  display_name text NOT NULL DEFAULT '',
  phone text DEFAULT '',
  avatar_url text DEFAULT '',
  preferred_language text NOT NULL DEFAULT 'es'
    CHECK (preferred_language IN ('es','en')),
  preferred_currency text NOT NULL DEFAULT 'PEN'
    CHECK (preferred_currency IN ('PEN','USD','EUR')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============ Step 2: is_admin helper (profiles now exists) ============
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- ============ Step 3: Create ALL remaining tables (no policies) ============
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name_es text NOT NULL,
  name_en text NOT NULL,
  icon text NOT NULL DEFAULT 'Tag',
  sort_order int NOT NULL DEFAULT 0,
  is_meta boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  bio text DEFAULT '',
  address text DEFAULT '',
  phone text DEFAULT '',
  whatsapp text DEFAULT '',
  hours jsonb DEFAULT '[]'::jsonb,
  latitude numeric DEFAULT NULL,
  longitude numeric DEFAULT NULL,
  logo_url text DEFAULT '',
  cover_url text DEFAULT '',
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','suspended')),
  score numeric NOT NULL DEFAULT 0,
  reviews_count int NOT NULL DEFAULT 0,
  is_featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS businesses_category_idx ON public.businesses(category_id);
CREATE INDEX IF NOT EXISTS businesses_status_idx ON public.businesses(status);

CREATE TABLE IF NOT EXISTS public.business_gallery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  caption text DEFAULT '',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.business_gallery ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text DEFAULT '',
  price numeric NOT NULL DEFAULT 0,
  discount_pct int NOT NULL DEFAULT 0 CHECK (discount_pct BETWEEN 0 AND 100),
  stock int NOT NULL DEFAULT 0,
  image_url text DEFAULT '',
  is_flash_offer boolean NOT NULL DEFAULT false,
  score numeric NOT NULL DEFAULT 0,
  reviews_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS products_business_idx ON public.products(business_id);
CREATE INDEX IF NOT EXISTS products_category_idx ON public.products(category_id);
CREATE INDEX IF NOT EXISTS products_flash_idx ON public.products(is_flash_offer);

CREATE TABLE IF NOT EXISTS public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text DEFAULT '',
  price_from numeric NOT NULL DEFAULT 0,
  price_to numeric NOT NULL DEFAULT 0,
  image_url text DEFAULT '',
  score numeric NOT NULL DEFAULT 0,
  reviews_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '',
  location text DEFAULT '',
  job_type text NOT NULL DEFAULT 'full_time'
    CHECK (job_type IN ('full_time','part_time','temporary','contract')),
  salary_range text DEFAULT '',
  is_open boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.job_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  applicant_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text DEFAULT '',
  cover_note text DEFAULT '',
  cv_url text DEFAULT '',
  status text NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted','reviewed','accepted','rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

-- orders BEFORE order_items (FK direction)
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_email text DEFAULT '',
  shipping_address text NOT NULL,
  delivery_notes text DEFAULT '',
  subtotal numeric NOT NULL DEFAULT 0,
  tax numeric NOT NULL DEFAULT 0,
  delivery_fee numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'cod'
    CHECK (payment_method IN ('cod','bank_transfer','yape','card')),
  payment_receipt_url text DEFAULT '',
  status text NOT NULL DEFAULT 'pending_payment'
    CHECK (status IN ('pending_payment','payment_verified','preparing','out_for_delivery','delivered','cancelled')),
  dropper_id uuid DEFAULT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  currency text NOT NULL DEFAULT 'PEN',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- order_items now exists so orders policies can reference it
CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  qty int NOT NULL DEFAULT 1 CHECK (qty > 0),
  unit_price numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  reviewable_type text NOT NULL CHECK (reviewable_type IN ('business','product','service','dropper')),
  reviewable_id uuid NOT NULL,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS reviews_reviewable_idx ON public.reviews(reviewable_type, reviewable_id);

CREATE TABLE IF NOT EXISTS public.droppers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  vehicle_type text NOT NULL DEFAULT 'bike'
    CHECK (vehicle_type IN ('bike','motorcycle','car')),
  vehicle_plate text DEFAULT '',
  area text DEFAULT '',
  is_online boolean NOT NULL DEFAULT false,
  rating numeric NOT NULL DEFAULT 5,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.droppers ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.emergency_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('police','fire','ambulance','pharmacy','health_center','doctor','clinic')),
  phone text NOT NULL,
  address text DEFAULT '',
  is_on_duty boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text DEFAULT '',
  payload jsonb DEFAULT '{}'::jsonb,
  read_at timestamptz DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- ============ Step 4: All policies (all tables now exist) ============

-- profiles
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;
CREATE POLICY "profiles_select_own_or_admin" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS "profiles_insert_self" ON public.profiles;
CREATE POLICY "profiles_insert_self" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- categories
DROP POLICY IF EXISTS "categories_read_public" ON public.categories;
CREATE POLICY "categories_read_public" ON public.categories
  FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "categories_write_admin" ON public.categories;
CREATE POLICY "categories_write_admin" ON public.categories
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- businesses
DROP POLICY IF EXISTS "businesses_read_public" ON public.businesses;
CREATE POLICY "businesses_read_public" ON public.businesses
  FOR SELECT TO anon, authenticated
  USING (status = 'approved' OR owner_id = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS "businesses_insert_owner" ON public.businesses;
CREATE POLICY "businesses_insert_owner" ON public.businesses
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());
DROP POLICY IF EXISTS "businesses_update_owner_or_admin" ON public.businesses;
CREATE POLICY "businesses_update_owner_or_admin" ON public.businesses
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR public.is_admin())
  WITH CHECK (owner_id = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS "businesses_delete_owner_or_admin" ON public.businesses;
CREATE POLICY "businesses_delete_owner_or_admin" ON public.businesses
  FOR DELETE TO authenticated
  USING (owner_id = auth.uid() OR public.is_admin());

-- business_gallery
DROP POLICY IF EXISTS "gallery_read_public" ON public.business_gallery;
CREATE POLICY "gallery_read_public" ON public.business_gallery
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (SELECT 1 FROM public.businesses b
            WHERE b.id = business_gallery.business_id
            AND (b.status = 'approved' OR b.owner_id = auth.uid() OR public.is_admin()))
  );
DROP POLICY IF EXISTS "gallery_manage_owner_or_admin" ON public.business_gallery;
CREATE POLICY "gallery_manage_owner_or_admin" ON public.business_gallery
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.businesses b
            WHERE b.id = business_gallery.business_id
            AND (b.owner_id = auth.uid() OR public.is_admin()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.businesses b
            WHERE b.id = business_gallery.business_id
            AND (b.owner_id = auth.uid() OR public.is_admin()))
  );

-- products
DROP POLICY IF EXISTS "products_read_public" ON public.products;
CREATE POLICY "products_read_public" ON public.products
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (SELECT 1 FROM public.businesses b
            WHERE b.id = products.business_id
            AND (b.status = 'approved' OR b.owner_id = auth.uid() OR public.is_admin()))
  );
DROP POLICY IF EXISTS "products_manage_owner_or_admin" ON public.products;
CREATE POLICY "products_manage_owner_or_admin" ON public.products
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.businesses b
            WHERE b.id = products.business_id
            AND (b.owner_id = auth.uid() OR public.is_admin()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.businesses b
            WHERE b.id = products.business_id
            AND (b.owner_id = auth.uid() OR public.is_admin()))
  );

-- services
DROP POLICY IF EXISTS "services_read_public" ON public.services;
CREATE POLICY "services_read_public" ON public.services
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (SELECT 1 FROM public.businesses b
            WHERE b.id = services.business_id
            AND (b.status = 'approved' OR b.owner_id = auth.uid() OR public.is_admin()))
  );
DROP POLICY IF EXISTS "services_manage_owner_or_admin" ON public.services;
CREATE POLICY "services_manage_owner_or_admin" ON public.services
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.businesses b
            WHERE b.id = services.business_id
            AND (b.owner_id = auth.uid() OR public.is_admin()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.businesses b
            WHERE b.id = services.business_id
            AND (b.owner_id = auth.uid() OR public.is_admin()))
  );

-- jobs
DROP POLICY IF EXISTS "jobs_read_public" ON public.jobs;
CREATE POLICY "jobs_read_public" ON public.jobs
  FOR SELECT TO anon, authenticated
  USING (
    is_open = true OR
    EXISTS (SELECT 1 FROM public.businesses b
            WHERE b.id = jobs.business_id
            AND (b.owner_id = auth.uid() OR public.is_admin()))
  );
DROP POLICY IF EXISTS "jobs_manage_owner_or_admin" ON public.jobs;
CREATE POLICY "jobs_manage_owner_or_admin" ON public.jobs
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.businesses b
            WHERE b.id = jobs.business_id
            AND (b.owner_id = auth.uid() OR public.is_admin()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.businesses b
            WHERE b.id = jobs.business_id
            AND (b.owner_id = auth.uid() OR public.is_admin()))
  );

-- job_applications
DROP POLICY IF EXISTS "applications_read_owner_or_admin" ON public.job_applications;
CREATE POLICY "applications_read_owner_or_admin" ON public.job_applications
  FOR SELECT TO authenticated
  USING (
    applicant_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.jobs j
            JOIN public.businesses b ON b.id = j.business_id
            WHERE j.id = job_applications.job_id
            AND (b.owner_id = auth.uid() OR public.is_admin()))
  );
DROP POLICY IF EXISTS "applications_insert_self" ON public.job_applications;
CREATE POLICY "applications_insert_self" ON public.job_applications
  FOR INSERT TO authenticated
  WITH CHECK (applicant_id = auth.uid());
DROP POLICY IF EXISTS "applications_update_owner_or_admin" ON public.job_applications;
CREATE POLICY "applications_update_owner_or_admin" ON public.job_applications
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.jobs j
            JOIN public.businesses b ON b.id = j.business_id
            WHERE j.id = job_applications.job_id
            AND (b.owner_id = auth.uid() OR public.is_admin()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.jobs j
            JOIN public.businesses b ON b.id = j.business_id
            WHERE j.id = job_applications.job_id
            AND (b.owner_id = auth.uid() OR public.is_admin()))
  );

-- orders (order_items now exists)
DROP POLICY IF EXISTS "orders_read_stakeholders" ON public.orders;
CREATE POLICY "orders_read_stakeholders" ON public.orders
  FOR SELECT TO authenticated
  USING (
    customer_id = auth.uid() OR
    dropper_id = auth.uid() OR
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM public.order_items oi
      JOIN public.products p ON p.id = oi.product_id
      JOIN public.businesses b ON b.id = p.business_id
      WHERE oi.order_id = orders.id AND b.owner_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "orders_insert_customer" ON public.orders;
CREATE POLICY "orders_insert_customer" ON public.orders
  FOR INSERT TO authenticated
  WITH CHECK (customer_id = auth.uid() OR customer_id IS NULL);
DROP POLICY IF EXISTS "orders_update_stakeholders" ON public.orders;
CREATE POLICY "orders_update_stakeholders" ON public.orders
  FOR UPDATE TO authenticated
  USING (
    customer_id = auth.uid() OR
    dropper_id = auth.uid() OR
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM public.order_items oi
      JOIN public.products p ON p.id = oi.product_id
      JOIN public.businesses b ON b.id = p.business_id
      WHERE oi.order_id = orders.id AND b.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    customer_id = auth.uid() OR
    dropper_id = auth.uid() OR
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM public.order_items oi
      JOIN public.products p ON p.id = oi.product_id
      JOIN public.businesses b ON b.id = p.business_id
      WHERE oi.order_id = orders.id AND b.owner_id = auth.uid()
    )
  );

-- order_items
DROP POLICY IF EXISTS "order_items_read_stakeholders" ON public.order_items;
CREATE POLICY "order_items_read_stakeholders" ON public.order_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id
            AND (o.customer_id = auth.uid() OR o.dropper_id = auth.uid() OR public.is_admin()
                 OR EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = order_items.business_id AND b.owner_id = auth.uid())))
  );
DROP POLICY IF EXISTS "order_items_insert_customer" ON public.order_items;
CREATE POLICY "order_items_insert_customer" ON public.order_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id
            AND (o.customer_id = auth.uid() OR public.is_admin()))
  );

-- reviews
DROP POLICY IF EXISTS "reviews_read_public" ON public.reviews;
CREATE POLICY "reviews_read_public" ON public.reviews
  FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "reviews_insert_self" ON public.reviews;
CREATE POLICY "reviews_insert_self" ON public.reviews
  FOR INSERT TO authenticated
  WITH CHECK (reviewer_id = auth.uid());
DROP POLICY IF EXISTS "reviews_update_own" ON public.reviews;
CREATE POLICY "reviews_update_own" ON public.reviews
  FOR UPDATE TO authenticated
  USING (reviewer_id = auth.uid()) WITH CHECK (reviewer_id = auth.uid());
DROP POLICY IF EXISTS "reviews_delete_own_or_admin" ON public.reviews;
CREATE POLICY "reviews_delete_own_or_admin" ON public.reviews
  FOR DELETE TO authenticated
  USING (reviewer_id = auth.uid() OR public.is_admin());

-- droppers
DROP POLICY IF EXISTS "droppers_read_public" ON public.droppers;
CREATE POLICY "droppers_read_public" ON public.droppers
  FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "droppers_insert_self" ON public.droppers;
CREATE POLICY "droppers_insert_self" ON public.droppers
  FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid());
DROP POLICY IF EXISTS "droppers_update_self_or_admin" ON public.droppers;
CREATE POLICY "droppers_update_self_or_admin" ON public.droppers
  FOR UPDATE TO authenticated
  USING (profile_id = auth.uid() OR public.is_admin())
  WITH CHECK (profile_id = auth.uid() OR public.is_admin());

-- emergency_contacts
DROP POLICY IF EXISTS "emergency_read_public" ON public.emergency_contacts;
CREATE POLICY "emergency_read_public" ON public.emergency_contacts
  FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "emergency_manage_admin" ON public.emergency_contacts;
CREATE POLICY "emergency_manage_admin" ON public.emergency_contacts
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- notifications
DROP POLICY IF EXISTS "notifications_read_own_or_admin" ON public.notifications;
CREATE POLICY "notifications_read_own_or_admin" ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS "notifications_insert_self_or_admin" ON public.notifications;
CREATE POLICY "notifications_insert_self_or_admin" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- app_settings
DROP POLICY IF EXISTS "settings_read_public" ON public.app_settings;
CREATE POLICY "settings_read_public" ON public.app_settings
  FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "settings_manage_admin" ON public.app_settings;
CREATE POLICY "settings_manage_admin" ON public.app_settings
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============ Step 5: Triggers & functions ============
CREATE OR REPLACE FUNCTION public.recompute_review_score()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_type text := COALESCE(NEW.reviewable_type, OLD.reviewable_type);
  v_id uuid := COALESCE(NEW.reviewable_id, OLD.reviewable_id);
  v_avg numeric;
  v_count int;
BEGIN
  IF v_type IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;
  SELECT COALESCE(avg(rating),0), count(*) INTO v_avg, v_count
  FROM public.reviews
  WHERE reviewable_type = v_type AND reviewable_id = v_id;
  IF v_type = 'business' THEN
    UPDATE public.businesses SET score = v_avg, reviews_count = v_count WHERE id = v_id;
  ELSIF v_type = 'product' THEN
    UPDATE public.products SET score = v_avg, reviews_count = v_count WHERE id = v_id;
  ELSIF v_type = 'service' THEN
    UPDATE public.services SET score = v_avg, reviews_count = v_count WHERE id = v_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS reviews_score_trigger ON public.reviews;
CREATE TRIGGER reviews_score_trigger
AFTER INSERT OR DELETE OR UPDATE OF rating ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.recompute_review_score();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)), COALESCE(NEW.raw_user_meta_data->>'role','customer'))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ Step 6: Storage bucket & policies ============
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "media_read_public" ON storage.objects;
CREATE POLICY "media_read_public" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'media');
DROP POLICY IF EXISTS "media_write_authenticated" ON storage.objects;
CREATE POLICY "media_write_authenticated" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'media');
DROP POLICY IF EXISTS "media_update_own" ON storage.objects;
CREATE POLICY "media_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'media' AND owner = auth.uid())
  WITH CHECK (bucket_id = 'media' AND owner = auth.uid());
DROP POLICY IF EXISTS "media_delete_own" ON storage.objects;
CREATE POLICY "media_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'media' AND owner = auth.uid());
