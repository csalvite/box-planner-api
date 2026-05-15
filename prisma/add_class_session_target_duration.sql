ALTER TABLE public.class_sessions
  ADD COLUMN IF NOT EXISTS target_duration_minutes integer;
