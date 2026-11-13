CREATE TABLE public.website_leads (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 external_id text NOT NULL UNIQUE CHECK (length(external_id) BETWEEN 1 AND 160),
 name text NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
 email text CHECK (email IS NULL OR length(email) <= 255),
 phone text CHECK (phone IS NULL OR length(phone) <= 40),
 message text NOT NULL DEFAULT '' CHECK (length(message) <= 4000),
 product text NOT NULL DEFAULT '' CHECK (length(product) <= 200),
 source text NOT NULL DEFAULT 'himgiriladders.in' CHECK (source = 'himgiriladders.in'),
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK (email IS NOT NULL OR phone IS NOT NULL)
);
GRANT SELECT ON public.website_leads TO authenticated;
GRANT ALL ON public.website_leads TO service_role;
ALTER TABLE public.website_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Managers read website leads" ON public.website_leads FOR SELECT TO authenticated USING (public.is_manager(auth.uid()));
CREATE INDEX website_leads_created_idx ON public.website_leads (created_at DESC);