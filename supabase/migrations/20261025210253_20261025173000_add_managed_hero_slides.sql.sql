/*
# Add admin-managed homepage hero slides

1. New Tables
- `hero_slides`
- `id`: unique slide identifier.
- `title_es`, `title_en`: localized hero headline.
- `subtitle_es`, `subtitle_en`: localized supporting copy.
- `image_url`: public image displayed by the hero carousel.
- `cta_label_es`, `cta_label_en`: localized call-to-action label.
- `cta_url`: destination opened by the call to action.
- `sort_order`: display order in the carousel.
- `is_active`: whether the slide is visible publicly.
- `created_at`, `updated_at`: record timestamps.

2. Security
- Enable RLS on `hero_slides`.
- Allow anonymous and authenticated visitors to read active slides only.
- Allow administrators to create, update, and delete slides.
- Grant public read access and restrict all write operations to authenticated users governed by the admin policy.

3. Important Notes
- Images are stored through the existing public media bucket and only their public URL is saved here.
- Changing a slide takes effect on the homepage without rebuilding or republishing the frontend.
*/

CREATE TABLE IF NOT EXISTS public.hero_slides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_es text NOT NULL CHECK (char_length(title_es) BETWEEN 2 AND 140),
  title_en text NOT NULL DEFAULT '',
  subtitle_es text NOT NULL DEFAULT '' CHECK (char_length(subtitle_es) <= 280),
  subtitle_en text NOT NULL DEFAULT '',
  image_url text NOT NULL CHECK (char_length(image_url) BETWEEN 10 AND 1000),
  cta_label_es text NOT NULL DEFAULT 'Explorar productos',
  cta_label_en text NOT NULL DEFAULT 'Explore products',
  cta_url text NOT NULL DEFAULT '/categories' CHECK (char_length(cta_url) <= 500),
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.hero_slides ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.hero_slides TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.hero_slides TO authenticated;

DROP POLICY IF EXISTS "hero_slides_public_read_active" ON public.hero_slides;
CREATE POLICY "hero_slides_public_read_active"
ON public.hero_slides FOR SELECT
TO anon, authenticated
USING (is_active = true OR is_admin());

DROP POLICY IF EXISTS "hero_slides_admin_insert" ON public.hero_slides;
CREATE POLICY "hero_slides_admin_insert"
ON public.hero_slides FOR INSERT
TO authenticated
WITH CHECK (is_admin());

DROP POLICY IF EXISTS "hero_slides_admin_update" ON public.hero_slides;
CREATE POLICY "hero_slides_admin_update"
ON public.hero_slides FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

DROP POLICY IF EXISTS "hero_slides_admin_delete" ON public.hero_slides;
CREATE POLICY "hero_slides_admin_delete"
ON public.hero_slides FOR DELETE
TO authenticated
USING (is_admin());
