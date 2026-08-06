-- 1. Grant SELECT on workspaces to anon and authenticated roles
GRANT SELECT ON public.workspaces TO anon, authenticated;

-- 2. Drop existing policy if exists and create public select policy on workspaces
DROP POLICY IF EXISTS "Anyone can read workspaces" ON public.workspaces;
CREATE POLICY "Anyone can read workspaces" ON public.workspaces
  FOR SELECT USING (true);

-- 3. Grant SELECT, INSERT on queue_entries to anon and authenticated roles
GRANT SELECT, INSERT ON public.queue_entries TO anon, authenticated;

-- 4. Drop existing public policies if exist and create them on queue_entries
DROP POLICY IF EXISTS "Anyone can read queue entries" ON public.queue_entries;
CREATE POLICY "Anyone can read queue entries" ON public.queue_entries
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can insert queue entries" ON public.queue_entries;
CREATE POLICY "Anyone can insert queue entries" ON public.queue_entries
  FOR INSERT WITH CHECK (true);

-- 5. Trigger to automatically generate unique slug if missing/empty on insert/update
CREATE OR REPLACE FUNCTION public.ensure_workspace_slug()
RETURNS trigger AS $$
DECLARE
  v_slug text;
  v_base_slug text;
BEGIN
  -- If slug is null or empty, generate it from the name
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    v_base_slug := lower(regexp_replace(NEW.name, '[^a-zA-Z0-9]+', '-', 'g'));
    v_base_slug := regexp_replace(v_base_slug, '^-|-$', '', 'g');
    
    IF v_base_slug = '' THEN
      v_base_slug := 'workspace';
    END IF;
    
    v_slug := v_base_slug;
    
    -- Ensure uniqueness
    WHILE EXISTS (SELECT 1 FROM public.workspaces WHERE slug = v_slug AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)) LOOP
      v_slug := v_base_slug || '-' || substr(md5(random()::text), 1, 6);
    END LOOP;
    
    NEW.slug := v_slug;
  ELSE
    -- Ensure provided slug is clean and unique
    NEW.slug := lower(regexp_replace(NEW.slug, '[^a-zA-Z0-9]+', '-', 'g'));
    NEW.slug := regexp_replace(NEW.slug, '^-|-$', '', 'g');
    
    v_slug := NEW.slug;
    WHILE EXISTS (SELECT 1 FROM public.workspaces WHERE slug = v_slug AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)) LOOP
      v_slug := NEW.slug || '-' || substr(md5(random()::text), 1, 6);
    END LOOP;
    NEW.slug := v_slug;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ensure_workspace_slug_trigger ON public.workspaces;
CREATE TRIGGER ensure_workspace_slug_trigger
  BEFORE INSERT OR UPDATE OF name, slug ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.ensure_workspace_slug();
