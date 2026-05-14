ALTER TABLE public.class_sessions
  ALTER COLUMN starts_at DROP NOT NULL,
  ALTER COLUMN ends_at DROP NOT NULL;

ALTER TYPE public."ClassSessionStatus" ADD VALUE IF NOT EXISTS 'DRAFT';
