CREATE TABLE IF NOT EXISTS public.class_schedule_defaults (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  coach_id uuid NULL REFERENCES public.profiles(id) ON UPDATE NO ACTION,
  weekday integer NOT NULL CHECK (weekday BETWEEN 1 AND 7),
  starts_at_time time NOT NULL,
  ends_at_time time NOT NULL,
  label text NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_class_schedule_defaults_organization_id
  ON public.class_schedule_defaults (organization_id);

CREATE INDEX IF NOT EXISTS idx_class_schedule_defaults_coach_id
  ON public.class_schedule_defaults (coach_id);

CREATE INDEX IF NOT EXISTS idx_class_schedule_defaults_org_active_weekday
  ON public.class_schedule_defaults (organization_id, is_active, weekday);
